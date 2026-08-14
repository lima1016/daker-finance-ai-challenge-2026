import { SYSTEM_PROMPT, CARD_TOOLS_PROMPT, type ChatMessage } from "@/lib/prompt";
import { streamAssistant, llmConfigError, friendlyError } from "@/lib/llm";
import { buildGrounding } from "@/lib/grounding";
import { CARD_TOOLS } from "@/lib/schema";
import { createFenceSplitter } from "@/lib/cards";
import { buildToolCard } from "@/lib/toolCards";
import { buildProfileContext, DEFAULT_PROFILE, type ProfileStore } from "@/lib/profile";

/**
 * 응답은 NDJSON 이벤트 스트림.
 *   {"t":"text","v":"…"}   텍스트 조각
 *   {"t":"card","v":{…}}   검증이 끝난 카드
 *   {"t":"error","v":"…"}  사용자에게 보여줄 오류
 *
 * 예전의 ```card 코드펜스 파싱을 클라이언트에서 걷어냈다. 카드는 서버에서
 * 도구 호출로 만들고 검증까지 마친 뒤에만 내려간다.
 */
export async function POST(req: Request) {
  const configError = llmConfigError();
  if (configError) {
    return ndjsonError("⚠️ " + configError, 500);
  }

  let messages: ChatMessage[];
  let profile: ProfileStore = DEFAULT_PROFILE;
  try {
    const body = await req.json();
    messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0) throw new Error("messages required");
    if (body.profile && typeof body.profile === "object") profile = body.profile as ProfileStore;
  } catch {
    return ndjsonError("잘못된 요청입니다.", 400);
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const grounding = await buildGrounding(lastUser?.content ?? "");
  const profileText = buildProfileContext(profile);

  const system = [
    SYSTEM_PROMPT,
    CARD_TOOLS_PROMPT, // 카드 도구는 대화에서만 쓴다
    profileText ? `# 사용자 정보 (이 사람 상황에 맞춰 답하세요)\n${profileText}` : "",
    grounding,
  ]
    .filter(Boolean)
    .join("\n\n");

  const encoder = new TextEncoder();
  const line = (obj: unknown) => encoder.encode(JSON.stringify(obj) + "\n");

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const splitter = createFenceSplitter();
      let cardCount = 0;

      const emitCard = (card: unknown) => {
        if (cardCount >= 2) return; // 한 답변에 카드 폭주 방지
        cardCount++;
        controller.enqueue(line({ t: "card", v: card }));
      };

      try {
        for await (const ev of streamAssistant({ system, messages, tools: CARD_TOOLS })) {
          if (ev.t === "text") {
            // 모델이 도구 대신 예전 방식(코드펜스)을 쓰더라도 받아준다
            for (const seg of splitter.feed(ev.v)) {
              if (seg.kind === "text") controller.enqueue(line({ t: "text", v: seg.text }));
              else emitCard(seg.card);
            }
          } else {
            const card = buildToolCard(ev.name, ev.input, profile);
            if (card) emitCard(card);
          }
        }
        for (const seg of splitter.flush()) {
          if (seg.kind === "text") controller.enqueue(line({ t: "text", v: seg.text }));
        }
      } catch (e) {
        controller.enqueue(line({ t: "error", v: friendlyError(e) }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}

function ndjsonError(message: string, status: number) {
  return new Response(JSON.stringify({ t: "error", v: message }) + "\n", {
    status,
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}
