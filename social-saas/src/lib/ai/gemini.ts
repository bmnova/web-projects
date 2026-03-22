import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;

/** Trim quotes/spaces from env (common on Vercel). */
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
 * Google deprecates model IDs often; on 404, try the next name in order.
 * Bare `gemini-1.5-flash` often 404s — use `-latest` variants.
 */
const MODEL_TRY_ORDER = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash-latest",
] as const;

const DEFAULT_MODEL = MODEL_TRY_ORDER[0];

/** Suffix for all Gemini text generation: user-facing copy must be English. */
const GEMINI_ENGLISH_OUTPUT_SUFFIX = `

---
Output language: Write **every** user-visible string in **English** only (natural, fluent). That includes titles, hooks, post bodies, threads, carousel slides, video script lines, tips/notes, JSON string values, and scene labels. Do not use Turkish or other languages. Keep brand and product proper names exactly as given in the prompt context.`

export function getModel(modelName: string = DEFAULT_MODEL): GenerativeModel {
  return getGenAI().getGenerativeModel({ model: modelName });
}

export async function generateText(prompt: string, modelName?: string): Promise<string> {
  const ai = getGenAI();
  const fullPrompt = `${prompt}${GEMINI_ENGLISH_OUTPUT_SUFFIX}`;
  const order = modelName
    ? [modelName, ...MODEL_TRY_ORDER.filter((m) => m !== modelName)]
    : [...MODEL_TRY_ORDER];

  let lastError: unknown;
  for (const name of order) {
    try {
      const model = ai.getGenerativeModel({ model: name });
      const result = await model.generateContent(fullPrompt);
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
