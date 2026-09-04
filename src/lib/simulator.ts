// 목돈 배분 시뮬레이터 — 결정적 계산 + 규칙 기반 진단(즉시·무료)
import { formatMan } from "./cards";
import type { ProfileStore } from "./profile";

export interface Alloc {
  emergency: number;
  living: number;
  saving: number;
}

/** 비상금+생활비로 소득 없이 버틸 수 있는 개월 수 */
export function monthsCovered(alloc: Alloc, monthlyExpense?: number): number {
  const exp = monthlyExpense && monthlyExpense > 0 ? monthlyExpense : 1_000_000;
  return Math.round((alloc.emergency + alloc.living) / exp);
}

export type AllocTone = "good" | "warn" | "danger";

export interface Diagnosis {
  /** 화면이 색으로도 알릴 수 있게 위험도를 함께 준다 */
  tone: AllocTone;
  /** 표시용 버티는 개월 수 (반올림) */
  months: number;
  /** "버티는 기간은 …" 문장 뒤에 이어 붙일 조언 */
  advice: string;
}

/** 슬라이더 상태에 대한 새봄의 진단 (규칙 기반) */
export function diagnose(alloc: Alloc, monthlyExpense?: number): Diagnosis {
  const total = alloc.emergency + alloc.living + alloc.saving;
  const exp = monthlyExpense && monthlyExpense > 0 ? monthlyExpense : 1_000_000;

  if (total <= 0) {
    return { tone: "warn", months: 0, advice: "정착금 금액을 입력하면 배분을 진단해 드릴게요." };
  }

  // 판정은 반올림 전 값으로 한다. 0.6개월치를 "1개월"로 반올림한 뒤
  // 그 숫자로 위험을 가리면, 한 달도 못 버티는 배분이 안전해 보인다.
  const runway = (alloc.emergency + alloc.living) / exp;
  const parts: string[] = [];

  if (runway < 1) {
    parts.push(
      "비상금과 생활비가 거의 없어서, 수입이 끊기면 이번 달부터 바로 막막해져요. 저축에 둔 돈을 생활비 쪽으로 먼저 옮겨 주세요.",
    );
  } else if (alloc.emergency < exp * 3) {
    parts.push("다만 비상금이 3개월치보다 적어요. 갑작스러운 일에 대비해 조금 더 채우는 걸 추천해요.");
  } else {
    parts.push("비상금이 탄탄해서 안심돼요.");
  }

  // 저축 이야기는 버틸 돈이 확보된 다음에만 꺼낸다. 당장 쓸 돈이 없는데
  // "저축 비중이 좋다"고 하면 위험한 배분을 칭찬하는 셈이 된다.
  if (runway >= 3) {
    parts.push(
      alloc.saving / total < 0.2
        ? "저축은 여유가 될 때 늘려요. 디딤씨앗통장처럼 정부가 얹어주는 상품부터 알아보면 좋아요."
        : "저축·자산형성 비중도 좋아요. 디딤씨앗통장 등 매칭지원을 챙겨보세요.",
    );
  }

  return {
    tone: runway < 1 ? "danger" : runway < 3 ? "warn" : "good",
    months: monthsCovered(alloc, exp),
    advice: parts.join(" "),
  };
}

/** 프로필에서 시뮬레이터 초기값 만들기 */
export function initialAlloc(p: ProfileStore): { total: number; alloc: Alloc } {
  // 나눌 수 있는 건 '지금 가진 돈'이다. 정착금 총액을 기준으로 삼으면
  // 이미 보증금 등으로 묶인 돈까지 배분하라고 하게 된다.
  const total = p.finance.balance ?? p.finance.settlement ?? 0;
  const a = p.finance.alloc;
  if (a && (a.emergency || a.living || a.saving)) {
    // 배분을 저장한 뒤 잔액을 줄이면 저장값이 총액을 넘는다. 그대로 두면
    // 세그먼트 바가 100%를 넘고 저축이 음수가 되므로 총액에 맞춰 자른다.
    const emergency = Math.min(Math.max(0, a.emergency || 0), total);
    const living = Math.min(Math.max(0, a.living || 0), Math.max(0, total - emergency));
    return { total, alloc: { emergency, living, saving: Math.max(0, total - emergency - living) } };
  }
  // 배분이 없으면 규칙 기본값(비상금 6개월·생활비 6개월·나머지 저축)으로 시작
  const exp = p.status.expense && p.status.expense > 0 ? p.status.expense : 1_000_000;
  const round10k = (n: number) => Math.round(n / 10000) * 10000;
  const emergency = Math.min(round10k(exp * 6), total);
  const living = Math.min(round10k(exp * 6), Math.max(0, total - emergency));
  const saving = Math.max(0, total - emergency - living);
  return { total, alloc: { emergency, living, saving } };
}

export function allocLabel(alloc: Alloc): string {
  return `비상금 ${formatMan(alloc.emergency)} · 생활비 ${formatMan(alloc.living)} · 저축 ${formatMan(alloc.saving)}`;
}
