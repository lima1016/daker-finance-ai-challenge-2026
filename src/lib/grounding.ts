// RAG 근거 블록 생성 (여러 라우트가 공유)
import { ragConfigured, searchDocuments } from "./rag";

interface Options {
  matchCount?: number;
  minSimilarity?: number;
  category?: string | null;
}

// 검색은 임베딩(유료 호출)을 먼저 만들고 그다음 DB를 친다.
// DB가 죽어 있으면 매 요청마다 임베딩만 태우고 실패하므로, 한 번 실패하면 잠시 쉰다.
const COOLDOWN_MS = 5 * 60_000;
let disabledUntil = 0;

/**
 * 질의와 가까운 공식 문서를 찾아 프롬프트에 넣을 텍스트로 만든다.
 * 검색이 안 되거나 근거가 약하면 빈 문자열 — 답변은 근거 없이 계속 진행된다.
 */
export async function buildGrounding(query: string, opts: Options = {}): Promise<string> {
  if (!ragConfigured() || !query.trim()) return "";
  if (Date.now() < disabledUntil) return "";
  const { matchCount = 4, minSimilarity = 0.4, category = null } = opts;

  try {
    const hits = await searchDocuments(query, { matchCount, category });
    const good = hits.filter((h) => h.similarity >= minSimilarity);
    if (!good.length) return "";

    return [
      "# 참고 근거 (아래 공식 자료에 근거해 답하세요)",
      // 예시 출처명은 반드시 코퍼스에 실제로 있는 것이어야 한다.
      // 없는 이름을 예시로 주면 모델이 그 이름을 그대로 인용해 '지어낸 출처'가 된다.
      "- 답변이 이 근거에 기반하면, 아래 [근거]에 적힌 출처 이름을 그대로 언급하세요. 목록에 없는 자료명을 지어내지 마세요.",
      "- 근거가 질문과 맞지 않으면 무리해서 쓰지 말고, 공식 창구 안내로 대신하세요.",
      ...good.map((h, i) => `[근거 ${i + 1}] ${h.title} (출처: ${h.source}) — ${h.chunk} <${h.url}>`),
    ].join("\n");
  } catch (e) {
    disabledUntil = Date.now() + COOLDOWN_MS;
    console.warn(
      `[rag] 근거 검색 실패 — ${COOLDOWN_MS / 60_000}분간 건너뜁니다 (임베딩 호출 낭비 방지):`,
      e instanceof Error ? e.message : String(e),
    );
    return "";
  }
}
