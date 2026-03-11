import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is not set");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export function getModel(modelName = "gemini-1.5-flash"): GenerativeModel {
  return genAI.getGenerativeModel({ model: modelName });
}

export async function generateText(prompt: string, modelName = "gemini-1.5-flash"): Promise<string> {
  const model = getModel(modelName);
  const result = await model.generateContent(prompt);
  return result.response.text();
}
