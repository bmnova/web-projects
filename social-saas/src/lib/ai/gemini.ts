import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI;
}

export function getModel(modelName = "gemini-1.5-flash"): GenerativeModel {
  return getGenAI().getGenerativeModel({ model: modelName });
}

export async function generateText(prompt: string, modelName = "gemini-1.5-flash"): Promise<string> {
  const model = getModel(modelName);
  const result = await model.generateContent(prompt);
  return result.response.text();
}
