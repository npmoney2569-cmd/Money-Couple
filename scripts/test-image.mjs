import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testImage() {
  try {
    const dummyImageBase64 = Buffer.from("dummy").toString("base64");
    const aiContent = [
      { text: "What is this?" },
      { inlineData: { data: dummyImageBase64, mimeType: "image/jpeg" } }
    ];
    const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: aiContent
    });
    console.log("Success:", response.text);
  } catch (e) {
    console.error("Failed:", e.message);
  }
}

testImage();
