// 대화·화면에 렌더링되는 "카드"(generative UI) 타입 & 검증
//
// 금액이 들어가는 카드(budget/forecast/radar)는 서버가 프로필에서 계산해 만든다.
// 모델이 직접 만드는 건 설명형 카드(timeline/risk/scan)뿐이다.

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

export type RiskLevel = "danger" | "warning" | "safe";

export type RiskCard = {
  type: "risk";
  level: RiskLevel;
  title: string;
  reasons?: string[];
  actions?: string[];
};

/** 현금흐름 예측 — points는 월별 잔액(원), 전부 서버 계산 */
export type ForecastCard = {
  type: "forecast";
  title?: string;
  labels: string[];
  series: { label: string; points: number[]; why?: string; depletionMonth: number | null }[];
  insight?: string;
};

/** 자립 준비도 레이더 — 점수는 규칙 계산, advice만 AI */
export type RadarCard = {
  type: "radar";
  title?: string;
  score: number;
  axes: { label: string; value: number; hint?: string }[];
  advice?: string;
  nextStep?: string;
};

/** 위험 스캔 결과 — 원문 위에 문장 단위 하이라이트 */
export type ScanCard = {
  type: "scan";
  level: RiskLevel;
  score: number;
  title: string;
  text: string; // 하이라이트를 칠할 원문
  spans: { text: string; level: "danger" | "warning"; why: string }[];
  reasons: string[];
  actions: string[];
  source?: string;
};

export type Card = BudgetCard | TimelineCard | RiskCard | ForecastCard | RadarCard | ScanCard;

export type Segment = { kind: "text"; text: string } | { kind: "card"; card: Card };

const CARD_TYPES = ["budget", "timeline", "risk", "forecast", "radar", "scan"] as const;

const asString = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const asNumber = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const asLevel = (v: unknown): RiskLevel =>
  v === "danger" || v === "warning" || v === "safe" ? v : "warning";

/**
 * 원문에서 발췌 문구를 찾아 '원문에 있는 그대로의' 조각을 돌려준다.
 *
 * 모델은 줄바꿈·띄어쓰기를 살짝 다르게 옮겨 적는 일이 잦다. 그때마다 하이라이트를
 * 통째로 버리면 스캐너의 핵심 기능이 사라지므로, 공백 차이는 눈감아 준다.
 * 다만 돌려주는 값은 언제나 원문의 실제 부분 문자열이라, 화면에서 위치가 어긋나지 않는다.
 */
function findInText(text: string, fragment: string): string | null {
  if (!fragment) return null;
  if (text.includes(fragment)) return fragment;

  const strip = (s: string) => s.replace(/\s+/g, "");
  const needle = strip(fragment);
  if (needle.length < 2) return null;

  const at = strip(text).indexOf(needle);
  if (at === -1) return null;

  // 공백을 제거한 위치를 원문 위치로 되돌린다
  let seen = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    if (/\s/.test(text[i])) continue;
    if (seen === at) start = i;
    seen++;
    if (seen === at + needle.length) return text.slice(start, i + 1);
  }
  return null;
}

/**
 * 임의의 객체를 카드로 검증·정규화한다. 모양이 안 맞으면 null.
 * 모델 출력을 그대로 렌더링하지 않기 위한 마지막 방어선.
 */
export function normalizeCard(raw: unknown): Card | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!CARD_TYPES.includes(o.type as (typeof CARD_TYPES)[number])) return null;

  switch (o.type) {
    case "budget": {
      const items = asArray(o.items)
        .map((it) => {
          const x = it as Record<string, unknown>;
          return { label: asString(x.label), amount: asNumber(x.amount), desc: asString(x.desc) || undefined };
        })
        .filter((it) => it.label && it.amount > 0);
      if (!items.length) return null;
      const total = asNumber(o.total) || items.reduce((s, it) => s + it.amount, 0);
      return { type: "budget", total, items };
    }

    case "timeline": {
      const steps = asArray(o.steps)
        .map((it) => {
          const x = it as Record<string, unknown>;
          return {
            when: asString(x.when),
            title: asString(x.title),
            desc: asString(x.desc) || undefined,
            done: x.done === true,
          };
        })
        .filter((s) => s.title);
      if (!steps.length) return null;
      return { type: "timeline", title: asString(o.title) || undefined, steps };
    }

    case "risk": {
      const title = asString(o.title);
      if (!title) return null;
      return {
        type: "risk",
        level: asLevel(o.level),
        title,
        reasons: asArray(o.reasons).map((r) => asString(r)).filter(Boolean),
        actions: asArray(o.actions).map((a) => asString(a)).filter(Boolean),
      };
    }

    case "forecast": {
      const series = asArray(o.series)
        .map((s) => {
          const x = s as Record<string, unknown>;
          return {
            label: asString(x.label),
            points: asArray(x.points).map((p) => asNumber(p)),
            why: asString(x.why) || undefined,
            depletionMonth: typeof x.depletionMonth === "number" ? x.depletionMonth : null,
          };
        })
        .filter((s) => s.points.length > 1);
      if (!series.length) return null;
      return {
        type: "forecast",
        title: asString(o.title) || undefined,
        labels: asArray(o.labels).map((l) => asString(l)),
        series,
        insight: asString(o.insight) || undefined,
      };
    }

    case "radar": {
      const axes = asArray(o.axes)
        .map((a) => {
          const x = a as Record<string, unknown>;
          return {
            label: asString(x.label),
            value: Math.max(0, Math.min(100, asNumber(x.value))),
            hint: asString(x.hint) || undefined,
          };
        })
        .filter((a) => a.label);
      if (axes.length < 3) return null;
      return {
        type: "radar",
        title: asString(o.title) || undefined,
        score: Math.max(0, Math.min(100, asNumber(o.score))),
        axes,
        advice: asString(o.advice) || undefined,
        nextStep: asString(o.nextStep) || undefined,
      };
    }

    case "scan": {
      const text = asString(o.text);
      // 원문에서 실제로 찾아낸 조각만 남긴다 — 못 찾으면 하이라이트가 어긋나므로 버린다
      const spans = asArray(o.spans)
        .map((s) => {
          const x = s as Record<string, unknown>;
          const matched = findInText(text, asString(x.text));
          if (!matched) return null;
          return {
            text: matched,
            level: x.level === "danger" ? ("danger" as const) : ("warning" as const),
            why: asString(x.why),
          };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);
      return {
        type: "scan",
        level: asLevel(o.level),
        score: Math.max(0, Math.min(100, asNumber(o.score))),
        title: asString(o.title, "검사 결과"),
        text,
        spans,
        reasons: asArray(o.reasons).map((r) => asString(r)).filter(Boolean),
        actions: asArray(o.actions).map((a) => asString(a)).filter(Boolean),
        source: asString(o.source) || undefined,
      };
    }
  }
  return null;
}

// ── ```card 코드펜스 폴백 ──────────────────────────────────────
// 도구 호출 대신 모델이 예전 방식(코드펜스)으로 카드를 내보내도 화면이 깨지지 않게.

const OPEN = "```card";

/**
 * 스트리밍 중인 텍스트에서 완성된 카드 펜스를 뽑아내는 증분 분리기.
 * feed()에 조각을 넣으면, 펜스 밖 텍스트와 완성된 카드를 순서대로 돌려준다.
 */
export function createFenceSplitter() {
  let buffer = "";

  return {
    feed(chunk: string): Segment[] {
      buffer += chunk;
      const out: Segment[] = [];

      for (;;) {
        const start = buffer.indexOf(OPEN);
        if (start === -1) {
          // 펜스 시작 문자열이 조각나 걸칠 수 있으니 끝부분은 남겨둔다
          const keep = Math.min(buffer.length, OPEN.length - 1);
          const emit = buffer.slice(0, buffer.length - keep);
          if (emit) out.push({ kind: "text", text: emit });
          buffer = buffer.slice(buffer.length - keep);
          break;
        }

        if (start > 0) out.push({ kind: "text", text: buffer.slice(0, start) });

        const close = buffer.indexOf("```", start + OPEN.length);
        if (close === -1) {
          buffer = buffer.slice(start); // 아직 안 닫힘 — 더 기다린다
          break;
        }

        const card = safeParseCard(buffer.slice(start + OPEN.length, close));
        if (card) out.push({ kind: "card", card });
        buffer = buffer.slice(close + 3);
      }

      return out;
    },

    /** 스트림이 끝났을 때 남은 버퍼를 텍스트로 비운다 */
    flush(): Segment[] {
      const rest = buffer;
      buffer = "";
      return rest.trim() ? [{ kind: "text", text: rest }] : [];
    },
  };
}

function safeParseCard(raw: string): Card | null {
  try {
    return normalizeCard(JSON.parse(raw.trim()));
  } catch {
    return null;
  }
}

// 금액을 "450만원"처럼 표시 (만 단위, 자립청년 눈높이)
export function formatMan(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 100_000_000) {
    const eok = Math.round((amount / 100_000_000) * 10) / 10;
    return `${eok}억원`;
  }
  if (abs >= 10000) {
    const man = amount / 10000;
    const rounded = Math.round(man * 10) / 10;
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded}만원`;
  }
  return `${amount.toLocaleString("ko-KR")}원`;
}
