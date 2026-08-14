// 목돈 배분 규칙엔진 — 결정적 계산(AI 추측 아님)
import { formatMan, type BudgetCard } from "./cards";
import type { ProfileStore } from "./profile";

export interface BudgetResult {
  card: BudgetCard;
  summary: string;
  reasons: string[];
}

const round10k = (n: number) => Math.round(n / 10000) * 10000;

const EMERGENCY_MONTHS = 6; // 비상금: 6개월치 생활비
const DEFAULT_EXPENSE = 1_000_000; // 월 지출 미입력 시 기본값

/**
 * 규칙:
 * - 비상금 = 월지출 × 6개월 (안전망 최우선)
 * - 생활비 버퍼 = 월지출 × (재직 3개월 / 미취업 6개월)
 * - 저축·자산형성 = 나머지
 * - 총액이 부족하면 비상금·생활비를 비율대로 줄이고 저축 0
 * 반환값의 items 합계는 항상 total과 일치.
 */
export function computeAllocation(p: ProfileStore): BudgetResult | null {
  // 나눌 수 있는 건 '지금 가진 돈' (simulator.ts의 기준과 같아야 한다)
  const total = p.finance.balance ?? p.finance.settlement;
  if (!total || total <= 0) return null;

  const expense = p.status.expense && p.status.expense > 0 ? p.status.expense : DEFAULT_EXPENSE;
  const working = /재직|직장|근무|취업/.test(p.status.work || "");
  const livingMonths = working ? 3 : 6;

  let emergency = expense * EMERGENCY_MONTHS;
  let living = expense * livingMonths;
  let saving = total - emergency - living;

  if (saving < 0) {
    // 총액 부족 → 비상금·생활비를 비율대로 축소, 저축 0
    const need = emergency + living;
    emergency = round10k(total * (emergency / need));
    living = total - emergency;
    saving = 0;
  } else {
    emergency = round10k(emergency);
    living = round10k(living);
    saving = total - emergency - living;
    if (saving < 0) {
      living += saving; // 반올림 보정
      saving = 0;
    }
  }

  const items = [
    { label: "비상금", amount: emergency, desc: `갑작스러운 일에 대비한 ${EMERGENCY_MONTHS}개월치 생활비` },
    { label: "생활비", amount: living, desc: working ? "소득이 있으니 3개월치 여유분" : "소득이 안정될 때까지 6개월치 여유분" },
    { label: "저축·자산형성", amount: saving, desc: "디딤씨앗통장 등 목돈 불리기" },
  ].filter((it) => it.amount > 0);

  const summary = `입력하신 ${formatMan(
    total,
  )}을 아래처럼 나눠봤어요. 이건 AI 추측이 아니라 정해진 규칙(비상금 ${EMERGENCY_MONTHS}개월·생활비 ${livingMonths}개월 기준)으로 계산한 결과예요.`;

  const reasons = [
    `비상금을 가장 먼저 확보했어요 — 일자리나 주거가 흔들려도 ${EMERGENCY_MONTHS}개월은 버틸 수 있게요.`,
    working
      ? "지금 소득이 있어서 생활비 여유분은 3개월로 잡았어요."
      : "아직 소득이 불안정해서 생활비 여유분을 6개월로 넉넉히 잡았어요.",
    saving > 0
      ? "남은 돈은 저축·자산형성으로 — 디딤씨앗통장처럼 정부가 얹어주는 상품부터 알아보면 좋아요."
      : "지금은 안전망 확보가 우선이라, 여유가 생기면 저축을 시작하는 걸 추천해요.",
  ];

  return { card: { type: "budget", total, items }, summary, reasons };
}

/** 채팅 말풍선에 넣을 어시스턴트 메시지(카드 포함)로 변환 */
export function budgetResultToMessage(r: BudgetResult): string {
  const card = "```card\n" + JSON.stringify(r.card) + "\n```";
  const reasons = r.reasons.map((x) => `• ${x}`).join("\n");
  return `${r.summary}\n\n${card}\n\n왜 이렇게 나눴는지 알려드릴게요:\n${reasons}`;
}
