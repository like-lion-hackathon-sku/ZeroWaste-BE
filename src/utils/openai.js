// src/utils/openai.js
import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  console.warn("[openai] OPENAI_API_KEY 가 설정되어 있지 않습니다.");
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
