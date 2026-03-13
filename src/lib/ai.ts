import { createOpenAI } from "@ai-sdk/openai";

export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_BASE_URL || "https://api.openai.com/v1",
});

export const AI_MODEL = process.env.AI_MODEL || "gpt-4o";
