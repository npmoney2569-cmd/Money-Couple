import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");

  if (!code) {
    console.error("LINE Callback: Missing authorization code");
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  const clientId = "2010660050";
  const clientSecret = "29d360624e169b13257d18eac68aaabf";
  const redirectUri = `${requestUrl.origin}/auth/line/callback`;

  try {
    // 1. Exchange authorization code for access and ID token from LINE
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
      console.error("LINE Token exchange failed:", errData);
      return NextResponse.redirect(new URL("/login?error=line_token_failed", request.url));
    }

    const tokenData = await tokenRes.json();
    const idToken = tokenData.id_token;

    if (!idToken) {
      console.error("LINE Callback: Token response did not contain id_token");
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
    // If LINE did not return an email (user denied permission), we construct a deterministic pseudo-email
    const email = payload.email || `line_${lineUserId}@line.cmn`;

    if (!lineUserId) {
      console.error("LINE Callback: Decoded ID token is missing sub claim");
      return NextResponse.redirect(new URL("/login?error=invalid_token_payload", request.url));
    }

    const supabaseAdmin = createAdminClient();

    // 3. Check if this LINE User ID is already linked to an account
    const { data: providerData, error: providerError } = await supabaseAdmin
      .from("auth_providers")
      .select("user_id")
      .eq("provider", "line")
      .eq("provider_uid", lineUserId)
      .maybeSingle();

    if (providerError) {
      console.error("Failed to query auth_providers:", providerError.message);
    }

    let targetUserId = providerData?.user_id || null;
    let targetEmail = email;

    if (targetUserId) {
      // User is already linked, fetch their registered email
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
      if (userError || !userData?.user) {
        console.error("Failed to fetch user by linked ID, falling back:", userError?.message);
      } else {
        targetEmail = userData.user.email || email;
      }
    } else {
      // 4. User is not linked yet. Check if a user with this email already exists
      const { data: usersList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        console.error("Failed to retrieve user list from Supabase:", listError.message);
      }

      const existingUser = usersList?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

      if (existingUser) {
        targetUserId = existingUser.id;
        targetEmail = existingUser.email || email;
      } else {
        // Create new user in Supabase auth system
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
          console.error("Failed to create new user in Supabase:", createError?.message);
          return NextResponse.redirect(new URL("/login?error=user_creation_failed", request.url));
        }

        targetUserId = newUser.user.id;
        targetEmail = newUser.user.email || email;
      }

      // 5. Link this LINE Login to the user in auth_providers table
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
        console.error("Failed to record LINE link in auth_providers table:", linkError.message);
      }
    }

    // 6. Generate a Magic Link login url to authenticate the user's session
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: targetEmail,
      options: {
        redirectTo: `${requestUrl.origin}/dashboard`,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("Failed to generate magic link login path:", linkError?.message);
      return NextResponse.redirect(new URL("/login?error=magic_link_failed", request.url));
    }

    // 7. Redirect the browser to Supabase's verification URL to set cookies and enter the dashboard
    return NextResponse.redirect(new URL(linkData.properties.action_link));
  } catch (err: any) {
    console.error("LINE login callback exception:", err);
    return NextResponse.redirect(new URL(`/login?error=unexpected&details=${encodeURIComponent(err.message)}`, request.url));
  }
}
