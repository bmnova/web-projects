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

// gemini-1.5-flash bazı projelerde 404/unsupported; AI Studio ile uyumlu güncel hızlı model
const DEFAULT_MODEL = "gemini-2.0-flash";

export function getModel(modelName = DEFAULT_MODEL): GenerativeModel {
  return getGenAI().getGenerativeModel({ model: modelName });
}

export async function generateText(prompt: string, modelName = DEFAULT_MODEL): Promise<string> {
  const model = getModel(modelName);
  const result = await model.generateContent(prompt);
  return result.response.text();
}
