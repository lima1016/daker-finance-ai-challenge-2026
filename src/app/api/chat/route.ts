import { SYSTEM_PROMPT, type ChatMessage } from "@/lib/prompt";
import { streamText, llmConfigError } from "@/lib/llm";
import { ragConfigured, searchDocuments } from "@/lib/rag";

// 사용자의 마지막 질문으로 근거 문서를 검색해 프롬프트용 텍스트로 만든다.
async function buildGrounding(messages: ChatMessage[]): Promise<string> {
  if (!ragConfigured()) return "";
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser?.content) return "";
  try {
    const hits = await searchDocuments(lastUser.content, { matchCount: 4 });
    const good = hits.filter((h) => h.similarity >= 0.4);
    if (good.length === 0) return "";
    const lines = good.map((h, i) => `[근거 ${i + 1}] ${h.title} (출처: ${h.source}) — ${h.chunk} <${h.url}>`);
    return (
      "# 참고 근거 (아래 공식 자료에 근거해 답하세요)\n" +
      "- 답변 내용이 이 근거에 기반하면 자연스럽게 출처 이름(예: 아동권리보장원 자립정보북)을 언급하세요.\n" +
      "- 근거가 질문과 맞지 않으면 무리해서 쓰지 말고, 공식 창구 안내로 대신하세요.\n" +
      lines.join("\n")
    );
  } catch {
    // 검색 실패 시 근거 없이 일반 답변 진행
    return "";
  }
}

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

  const grounding = await buildGrounding(messages);
  const system = [
    SYSTEM_PROMPT,
    profile ? `# 사용자 정보 (이 사람 상황에 맞춰 답하세요)\n${profile}` : "",
    grounding,
  ]
    .filter(Boolean)
    .join("\n\n");

  const readable = streamText({ system, messages });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
