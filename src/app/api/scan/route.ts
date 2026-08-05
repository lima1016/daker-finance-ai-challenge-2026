import { SYSTEM_PROMPT, type ChatMessage } from "@/lib/prompt";
import { streamText, llmConfigError } from "@/lib/llm";
import { ragConfigured, searchDocuments } from "@/lib/rag";

export const runtime = "nodejs";

const SCAN_INSTRUCTION = `# 위험 스캐너 모드
사용자가 붙여넣은 문자·카톡·링크·계약서 내용을 검사합니다.
- 반드시 risk 카드를 하나 출력하세요 (level: danger/warning/safe 중 판단).
- 사기 수법이나 계약의 독소조항(연대보증·명의대여·통장양도 등)을 청년 눈높이로 쉽게 설명하세요.
- '지금 할 일'을 구체적으로 알려주세요. 필요하면 금감원 1332·경찰 112 신고를 안내하세요.
- 붙여넣은 내용은 저장하지 않는다고 안심시켜도 좋습니다.
- 위험이 없어 보이면 level: safe 로, 다만 확신이 없으면 공식 창구 확인을 권하세요.`;

export async function POST(req: Request) {
  const configError = llmConfigError();
  if (configError) {
    return new Response("⚠️ " + configError, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  let text: string;
  try {
    const body = await req.json();
    text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) throw new Error("empty");
  } catch {
    return new Response("검사할 내용을 입력해 주세요.", { status: 400 });
  }

  // 사기유형 근거 검색 (RAG)
  let grounding = "";
  if (ragConfigured()) {
    try {
      const hits = await searchDocuments(text, { matchCount: 3 });
      const good = hits.filter((h) => h.similarity >= 0.35);
      if (good.length) {
        grounding =
          "\n\n# 참고 근거 (아래 공식 자료를 바탕으로 판단하고 출처를 언급하세요)\n" +
          good.map((h, i) => `[근거 ${i + 1}] ${h.title} (${h.source}) — ${h.chunk} <${h.url}>`).join("\n");
      }
    } catch {
      /* 근거 없이 진행 */
    }
  }

  const system = `${SYSTEM_PROMPT}\n\n${SCAN_INSTRUCTION}${grounding}`;
  const messages: ChatMessage[] = [
    { role: "user", content: `다음 내용이 사기이거나 위험한지 검사해 주세요:\n\n"""\n${text}\n"""` },
  ];

  const readable = streamText({ system, messages });
  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
