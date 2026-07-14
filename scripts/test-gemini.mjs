import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testModel() {
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: 'hi'
    });
    console.log("Success:", response.text);
  } catch (e) {
    console.error("Failed:", e.message);
  }
}

testModel();
