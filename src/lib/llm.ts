// LLM 프로바이더 추상화 — Gemini / Anthropic 를 환경변수 하나로 교체
// route.ts 는 이 파일만 호출하므로, 나중에 공급자를 바꿔도 앱 코드는 그대로.
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import type { ChatMessage } from "./prompt";

export type LlmProvider = "gemini" | "anthropic";

export function activeProvider(): LlmProvider {
  const p = (process.env.LLM_PROVIDER || "gemini").toLowerCase();
  return p === "anthropic" ? "anthropic" : "gemini";
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

/** 현재 선택된 프로바이더의 키가 없으면 안내 메시지를, 있으면 null 반환 */
export function llmConfigError(): string | null {
  const p = activeProvider();
  if (p === "gemini" && !process.env.GEMINI_API_KEY) {
    return "GEMINI_API_KEY가 설정되지 않았습니다. Google AI Studio(aistudio.google.com/app/apikey)에서 무료 키를 발급받아 .env.local에 넣고 개발 서버를 다시 시작하세요.";
  }
  if (p === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
    return "ANTHROPIC_API_KEY가 설정되지 않았습니다. console.anthropic.com에서 키를 발급받아 .env.local에 넣고 개발 서버를 다시 시작하세요.";
  }
  return null;
}

type StreamArgs = { system: string; messages: ChatMessage[] };

/** 통합 스트리밍 인터페이스: 어떤 프로바이더든 UTF-8 텍스트 청크 스트림을 반환 */
export function streamText({ system, messages }: StreamArgs): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  if (activeProvider() === "anthropic") {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const stream = client.messages.stream({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    return new ReadableStream<Uint8Array>({
      start(controller) {
        stream.on("text", (t) => controller.enqueue(encoder.encode(t)));
        stream.on("end", () => controller.close());
        stream.on("error", (e) => {
          const msg = e instanceof Error ? e.message : String(e);
          controller.enqueue(encoder.encode(`\n\n⚠️ 답변 생성 중 오류가 났어요. (Anthropic) ${msg}`));
          controller.close();
        });
      },
      cancel() {
        stream.abort();
      },
    });
  }

  // Gemini
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const response = await ai.models.generateContentStream({
          model: GEMINI_MODEL,
          contents,
          config: { systemInstruction: system },
        });
        for await (const chunk of response) {
          const t = chunk.text;
          if (t) controller.enqueue(encoder.encode(t));
        }
        controller.close();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        controller.enqueue(encoder.encode(`⚠️ 답변 생성 중 오류가 났어요. (Gemini) ${msg}`));
        controller.close();
      }
    },
  });
}
