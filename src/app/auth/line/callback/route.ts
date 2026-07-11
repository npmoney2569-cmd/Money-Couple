import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";


function writeLog(message: string, detail?: any) {
  try {
    const timestamp = new Date().toISOString();
    const cleanDetail = detail ? (detail instanceof Error ? detail.stack || detail.message : JSON.stringify(detail)) : "";
    console.log(`[LINE-CB] [${timestamp}] ${message}`, cleanDetail);
  } catch (logErr) {
    console.error("Failed to write log:", logErr);
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");

  writeLog("LINE Callback GET initiated", { url: request.url, code: code ? "EXISTS" : "MISSING", state });

  if (!code) {
    writeLog("LINE Callback: Missing authorization code");
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  const clientId = "2010660050";
  const clientSecret = "29d360624e169b13257d18eac68aaabf";

  // Reconstruct external redirect URI considering headers (protocol and host)
  const host = request.headers.get("x-forwarded-host") || requestUrl.host;
  const proto = request.headers.get("x-forwarded-proto") || (requestUrl.protocol.replace(":", ""));
  const redirectUri = `${proto}://${host}/auth/line/callback`;

  writeLog("Configured parameters", { clientId, redirectUri });

  try {
    // 1. Exchange authorization code for access and ID token from LINE
    writeLog("Sending token exchange request to LINE API...");
    const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenRes.ok) {
      const errData = await tokenRes.json();
      writeLog("LINE Token exchange failed", { status: tokenRes.status, statusText: tokenRes.statusText, error: errData });
      return NextResponse.redirect(new URL(`/login?error=line_token_failed&detail=${encodeURIComponent(JSON.stringify(errData))}`, request.url));
    }

    const tokenData = await tokenRes.json();
    const idToken = tokenData.id_token;

    if (!idToken) {
      writeLog("LINE Callback: Token response did not contain id_token");
      return NextResponse.redirect(new URL("/login?error=missing_id_token", request.url));
    }

    // 2. Decode the ID Token (JWT) to extract profile metadata
    const base64Url = idToken.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = Buffer.from(base64, "base64").toString("utf-8");
    const payload = JSON.parse(jsonPayload);

    const lineUserId = payload.sub;
    const name = payload.name || "LINE User";
    const picture = payload.picture || "";
    const email = payload.email || `line_${lineUserId}@line.cmn`;

    writeLog("Decoded ID Token profile info", { lineUserId, name, email });

    if (!lineUserId) {
      writeLog("LINE Callback: Decoded ID token is missing sub claim");
      return NextResponse.redirect(new URL("/login?error=invalid_token_payload", request.url));
    }

    const supabaseAdmin = createAdminClient();
    
    // Check if user is already logged in locally
    writeLog("Checking local cookies user session...");
    const supabaseUserClient = await createClient();
    const { data: { user: currentUser } } = await supabaseUserClient.auth.getUser();
    writeLog("Session user check complete", { userId: currentUser ? currentUser.id : null });

    // 3. Check if this LINE User ID is already linked to an account
    const { data: providerData, error: providerError } = await supabaseAdmin
      .from("auth_providers")
      .select("user_id")
      .eq("provider", "line")
      .eq("provider_uid", lineUserId)
      .maybeSingle();

    if (providerError) {
      writeLog("Failed to query auth_providers table", providerError);
    } else {
      writeLog("auth_providers query results", { providerData });
    }

    if (currentUser) {
      writeLog("Processing linking flow for logged in user", { currentUserId: currentUser.id });
      // User is already logged in, they want to link this LINE account
      if (providerData && providerData.user_id !== currentUser.id) {
        writeLog("LINE account is already linked to another user ID", { linkedUserId: providerData.user_id });
        return NextResponse.redirect(new URL("/dashboard/security?error=line_already_linked", request.url));
      }

      // Link to current user
      writeLog("Upserting record into auth_providers...");
      const { error: linkError } = await supabaseAdmin
        .from("auth_providers")
        .upsert({
          user_id: currentUser.id,
          provider: "line",
          provider_uid: lineUserId,
          line_user_id: lineUserId,
        }, {
          onConflict: "provider,provider_uid",
        });

      if (linkError) {
        writeLog("Failed to upsert LINE auth_provider link", linkError);
        return NextResponse.redirect(new URL("/dashboard/security?error=link_failed", request.url));
      }

      writeLog("Successfully linked LINE. Redirecting back to security with success state.");
      return NextResponse.redirect(new URL("/dashboard/security?success=line_linked", request.url));
    }

    // Login Flow
    writeLog("Processing login flow...");
    let targetUserId = providerData?.user_id || null;
    let targetEmail = email;

    if (targetUserId) {
      writeLog("User is already linked to targetUserId", { targetUserId });
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
      if (userError || !userData?.user) {
        writeLog("Failed to fetch target user details, falling back", userError);
      } else {
        targetEmail = userData.user.email || email;
        writeLog("Loaded target user email", { targetEmail });
      }
    } else {
      writeLog("User is not linked yet. Searching user database by email", { email });
      // Check if user with this email already exists
      const { data: usersList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        writeLog("Failed to list users from Supabase admin", listError);
      }

      const existingUser = usersList?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

      if (existingUser) {
        targetUserId = existingUser.id;
        targetEmail = existingUser.email || email;
        writeLog("Found existing email user. Binding to existing user ID", { targetUserId });
      } else {
        writeLog("User email not found. Creating a new user...");
        const username = `line_${lineUserId.substring(0, 10).toLowerCase()}`;
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            full_name: name,
            avatar_url: picture,
            username,
          },
        });

        if (createError || !newUser?.user) {
          writeLog("Failed to create new user record in Supabase auth system", createError);
          return NextResponse.redirect(new URL("/login?error=user_creation_failed", request.url));
        }

        targetUserId = newUser.user.id;
        targetEmail = newUser.user.email || email;
        writeLog("Successfully created new user", { targetUserId });
      }

      // Link this LINE Login to the user in auth_providers table
      writeLog("Recording auth_provider link...");
      const { error: linkError } = await supabaseAdmin
        .from("auth_providers")
        .upsert({
          user_id: targetUserId,
          provider: "line",
          provider_uid: lineUserId,
          line_user_id: lineUserId,
        }, {
          onConflict: "provider,provider_uid",
        });

      if (linkError) {
        writeLog("Failed to record LINE link in auth_providers table during signup/login", linkError);
      }
    }

    // สร้าง magic link แล้วดึง token ออกมา exchange เพื่อ set session cookie
    writeLog("Generating magic link for token extraction...");
    const { data: linkData, error: linkGenError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: targetEmail,
    });

    if (linkGenError || !linkData?.properties?.hashed_token) {
      writeLog("Failed to generate magic link token", linkGenError);
      return NextResponse.redirect(new URL("/login?error=session_failed", request.url));
    }

    // สร้าง response redirect ไป /dashboard
    const dashboardUrl = new URL("/dashboard", requestUrl.origin);
    const response = NextResponse.redirect(dashboardUrl);

    // สร้าง supabase client ที่ set cookie ลงใน response โดยตรง
    const supabaseForCookies = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
            );
          },
        },
      }
    );

    // แลก hashed_token เป็น session — cookie ถูก set ผ่าน setAll ข้างบน
    const { error: otpError } = await supabaseForCookies.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    });

    if (otpError) {
      writeLog("Failed to verify OTP token", otpError);
      return NextResponse.redirect(new URL("/login?error=session_failed", request.url));
    }

    writeLog("Session set via OTP exchange. Redirecting to dashboard.");
    return response;

  } catch (err: any) {
    writeLog("Unexpected exception in LINE callback execution", err);
    return NextResponse.redirect(new URL(`/login?error=unexpected&details=${encodeURIComponent(err.message)}`, request.url));
  }
}
