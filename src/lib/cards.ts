// 대화 안에 렌더링되는 "카드"(generative UI) 타입 & 파서

export type BudgetCard = {
  type: "budget";
  total: number;
  items: { label: string; amount: number; desc?: string }[];
};

export type TimelineCard = {
  type: "timeline";
  title?: string;
  steps: { when: string; title: string; desc?: string; done?: boolean }[];
};

export type RiskCard = {
  type: "risk";
  level: "danger" | "warning" | "safe";
  title: string;
  reasons?: string[];
  actions?: string[];
};

export type Card = BudgetCard | TimelineCard | RiskCard;

export type Segment = { kind: "text"; text: string } | { kind: "card"; card: Card };

const OPEN = "```card";

function safeParseCard(raw: string): Card | null {
  try {
    const obj = JSON.parse(raw);
    if (obj && (obj.type === "budget" || obj.type === "timeline" || obj.type === "risk")) {
      return obj as Card;
    }
  } catch {
    // 스트리밍 중 불완전한 JSON일 수 있음 → 무시
  }
  return null;
}

/**
 * 어시스턴트 응답 텍스트를 텍스트/카드 세그먼트로 분해한다.
 * 카드는 ```card 코드블록 안의 JSON 하나. 스트리밍 중 닫히지 않은 카드는 숨긴다.
 */
export function parseSegments(content: string): Segment[] {
  const segments: Segment[] = [];
  let i = 0;

  while (i < content.length) {
    const start = content.indexOf(OPEN, i);
    if (start === -1) {
      segments.push({ kind: "text", text: content.slice(i) });
      break;
    }
    if (start > i) segments.push({ kind: "text", text: content.slice(i, start) });

    const afterOpen = start + OPEN.length;
    const closing = content.indexOf("```", afterOpen);
    if (closing === -1) break; // 아직 카드가 닫히지 않음(스트리밍) → 숨김

    const raw = content.slice(afterOpen, closing).trim();
    const card = safeParseCard(raw);
    if (card) segments.push({ kind: "card", card });
    i = closing + 3;
  }

  return segments.filter((s) => s.kind === "card" || s.text.trim().length > 0);
}

// 금액을 "450만원"처럼 표시 (만 단위, 자립청년 눈높이)
export function formatMan(amount: number): string {
  if (amount >= 10000) {
    const man = amount / 10000;
    const rounded = Math.round(man * 10) / 10;
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded}만원`;
  }
  return `${amount.toLocaleString("ko-KR")}원`;
}
