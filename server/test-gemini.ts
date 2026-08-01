import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

async function main() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "Say hello.",
    });

    console.log("SUCCESS:");
    console.log(response.text);
  } catch (err) {
    console.dir(err, { depth: null });
  }
}

main();
