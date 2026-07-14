import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const API_KEY = process.env.GEMINI_API_KEY;

async function testFetch(model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "hi" }] }]
    })
  });
  
  console.log(`Model: ${model}, Status:`, response.status);
  const data = await response.json();
  if (data.error) console.log(data.error.message);
  else console.log(data.candidates[0].content.parts[0].text);
}

async function run() {
  await testFetch('gemini-1.5-flash-001');
  await testFetch('gemini-1.5-flash-002');
  await testFetch('gemini-1.5-pro-001');
  await testFetch('gemini-1.5-pro-002');
  await testFetch('gemini-2.0-flash-exp');
}
run();
