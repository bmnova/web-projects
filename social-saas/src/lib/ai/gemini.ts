import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;

/** Vercel / .env bazen tırnak veya boşluk ile gelir */
function normalizeGeminiKey(): string {
  const raw = process.env.GEMINI_API_KEY;
  if (!raw?.trim()) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }
  return raw.trim().replace(/^["']|["']$/g, "");
}

function getGenAI(): GoogleGenerativeAI {
  const key = normalizeGeminiKey();
  if (!genAI) {
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI;
}

/**
 * Google sık eski model adlarını kaldırıyor; 404 olursa sırayla dene.
 * `gemini-1.5-flash` (sonek yok) artık çoğu projede 404.
 */
const MODEL_TRY_ORDER = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash-latest",
] as const;

const DEFAULT_MODEL = MODEL_TRY_ORDER[0];

export function getModel(modelName: string = DEFAULT_MODEL): GenerativeModel {
  return getGenAI().getGenerativeModel({ model: modelName });
}

export async function generateText(prompt: string, modelName?: string): Promise<string> {
  const ai = getGenAI();
  const order = modelName
    ? [modelName, ...MODEL_TRY_ORDER.filter((m) => m !== modelName)]
    : [...MODEL_TRY_ORDER];

  let lastError: unknown;
  for (const name of order) {
    try {
      const model = ai.getGenerativeModel({ model: name });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (e) {
      lastError = e;
      const msg = e instanceof Error ? e.message : String(e);
      const isNotFound =
        msg.includes("404") ||
        msg.includes("not found") ||
        msg.includes("Not Found") ||
        msg.includes("is not found");
      if (isNotFound) continue;
      throw e;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError));
}
