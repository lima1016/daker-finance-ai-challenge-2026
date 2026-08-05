import { SYSTEM_PROMPT, type ChatMessage } from "@/lib/prompt";
import { streamText, llmConfigError } from "@/lib/llm";

// LLM SDK는 Node 런타임에서 실행 (Edge 아님)
export const runtime = "nodejs";

export async function POST(req: Request) {
  const configError = llmConfigError();
  if (configError) {
    return new Response("⚠️ " + configError, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  let messages: ChatMessage[];
  let profile: string | undefined;
  try {
    const body = await req.json();
    messages = body.messages;
    profile = typeof body.profile === "string" ? body.profile : undefined;
    if (!Array.isArray(messages)) throw new Error("messages must be an array");
  } catch {
    return new Response("잘못된 요청입니다.", { status: 400 });
  }

  const system = profile
    ? `${SYSTEM_PROMPT}\n\n# 사용자 정보 (이 사람 상황에 맞춰 답하세요)\n${profile}`
    : SYSTEM_PROMPT;

  const readable = streamText({ system, messages });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
