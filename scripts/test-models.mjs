import * as fs from "fs";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const API_KEY = process.env.GEMINI_API_KEY;

async function fetchModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
  
  const response = await fetch(url);
  const data = await response.json();
  const models = data.models.map(m => m.name);
  console.log(models.join('\n'));
}

fetchModels();
