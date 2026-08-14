// 자립 준비도 점수 — 규칙 기반 5축 (재현 가능해야 하므로 AI 아님)
//
// AI는 점수를 매기지 않는다. 점수는 여기서 계산하고,
// AI는 "가장 약한 축을 어떻게 올릴지" 코칭만 담당한다.
import { computeDday, type ProfileStore } from "./profile";

export type AxisKey = "housing" | "income" | "emergency" | "spending" | "benefits";

export interface Axis {
  key: AxisKey;
  label: string;
  value: number; // 0~100
  hint: string; // 왜 이 점수인지 한 줄
}

export interface Readiness {
  score: number; // 0~100 종합
  axes: Axis[];
  weakest: Axis;
  filled: boolean; // 계산에 쓸 정보가 충분한지
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

// 위에서부터 먼저 걸리는 규칙이 적용된다 (profile.ts의 HOUSING_OPTIONS와 짝을 이룸)
const HOUSING_RULES: [RegExp, number, string][] = [
  [/고시원|친척|지인|없음|미정/, 20, "주거가 불안정하면 다른 계획도 흔들려요"],
  [/LH|공공임대|매입|전세임대/, 85, "공공임대는 주거비 부담이 낮아요"],
  [/자립생활관|그룹홈|기숙/, 70, "당장은 안정적이지만 기간이 정해져 있어요"],
  [/전세/, 65, "전세는 월 부담이 적은 편이에요"],
  [/원룸|월세/, 45, "월세는 매달 고정 지출이 커요"],
];

function housingScore(housing?: string): Axis {
  if (!housing?.trim()) {
    return { key: "housing", label: "주거", value: 30, hint: "주거 상태를 알려주시면 더 정확해져요" };
  }
  for (const [re, value, hint] of HOUSING_RULES) {
    if (re.test(housing)) return { key: "housing", label: "주거", value, hint };
  }
  return { key: "housing", label: "주거", value: 50, hint: "주거는 보통 수준으로 봤어요" };
}

function incomeScore(p: ProfileStore): Axis {
  const work = p.status.work ?? "";
  const income = p.status.income ?? 0;
  let base: number;
  let hint: string;

  // 계약직·아르바이트를 먼저 걸러야 '계약직 재직'이 정규직으로 잡히지 않는다
  if (/계약|파견|파트|아르바이트|알바|단기/.test(work)) {
    base = 50;
    hint = "소득이 있지만 끊길 위험이 있어요";
  } else if (/정규|재직|직장|근무|취업/.test(work)) {
    base = 80;
    hint = "안정적인 소득이 있어요";
  } else if (/구직|준비|학생|훈련/.test(work)) {
    base = 25;
    hint = "아직 소득이 불안정해요";
  } else {
    base = 35;
    hint = "근로 상태를 알려주시면 더 정확해져요";
  }

  // 최저 생계 수준(월 100만원)을 기준으로 소득 크기 보정
  if (income > 0) base += Math.min(20, (income / 1_000_000) * 10);
  return { key: "income", label: "소득", value: clamp(base), hint };
}

function emergencyScore(p: ProfileStore): Axis {
  const expense = p.status.expense && p.status.expense > 0 ? p.status.expense : 1_000_000;
  const emergency = p.finance.alloc?.emergency ?? p.finance.balance ?? p.finance.settlement ?? 0;
  const months = emergency / expense;
  // 6개월치 = 100점
  const value = clamp((months / 6) * 100);
  const hint =
    months >= 6
      ? "6개월치 비상금이 확보돼 있어요"
      : months >= 3
        ? `약 ${months.toFixed(1)}개월치 — 6개월치까지 조금만 더`
        : `약 ${months.toFixed(1)}개월치 — 갑작스러운 일에 대비가 부족해요`;
  return { key: "emergency", label: "비상금", value, hint };
}

function spendingScore(p: ProfileStore): Axis {
  const income = (p.status.income ?? 0) + (p.finance.allowance ?? 0);
  const expense = p.status.expense ?? 0;
  if (income === 0 && expense === 0) {
    return { key: "spending", label: "지출관리", value: 30, hint: "수입·지출을 입력하면 진단해 드릴게요" };
  }
  if (income === 0) {
    return { key: "spending", label: "지출관리", value: 15, hint: "들어오는 돈 없이 나가기만 하고 있어요" };
  }
  const ratio = expense / income; // 지출/수입
  // 0.6 이하 = 100점, 1.0 = 40점, 1.4 이상 = 0점
  const value = clamp(100 - Math.max(0, ratio - 0.6) * 150);
  const hint =
    ratio <= 0.7
      ? "버는 것보다 적게 쓰고 있어요. 아주 좋아요"
      : ratio <= 1
        ? "수지가 빠듯해요. 고정비를 한 번 점검해 봐요"
        : "매달 적자예요. 지출을 먼저 손봐야 해요";
  return { key: "spending", label: "지출관리", value, hint };
}

function benefitsScore(p: ProfileStore): Axis {
  let value = 0;
  const notes: string[] = [];

  if ((p.finance.allowance ?? 0) > 0) value += 40;
  else notes.push("자립수당");

  if ((p.finance.settlement ?? 0) > 0) value += 25;
  else notes.push("자립정착금");

  const a = p.finance.alloc;
  if (a && (a.emergency || a.living || a.saving)) value += 25;
  else notes.push("목돈 배분");

  if (p.status.endDate) value += 10;

  const hint = notes.length
    ? `${notes.join("·")} 항목을 아직 못 챙겼어요`
    : "받을 수 있는 제도를 잘 챙기고 있어요";
  return { key: "benefits", label: "제도활용", value: clamp(value), hint };
}

const WEIGHTS: Record<AxisKey, number> = {
  housing: 1,
  income: 1,
  emergency: 1.2,
  spending: 1.2,
  benefits: 0.8,
};

export function computeReadiness(p: ProfileStore): Readiness {
  const axes: Axis[] = [
    housingScore(p.status.housing),
    incomeScore(p),
    emergencyScore(p),
    spendingScore(p),
    benefitsScore(p),
  ];

  const totalWeight = axes.reduce((s, a) => s + WEIGHTS[a.key], 0);
  const score = clamp(axes.reduce((s, a) => s + a.value * WEIGHTS[a.key], 0) / totalWeight);
  const weakest = axes.reduce((min, a) => (a.value < min.value ? a : min), axes[0]);

  const filled =
    p.status.expense != null || p.finance.balance != null || p.finance.settlement != null;

  return { score, axes, weakest, filled };
}

export function readinessGrade(score: number): { label: string; tone: "danger" | "warn" | "good" } {
  if (score >= 70) return { label: "안정적이에요", tone: "good" };
  if (score >= 45) return { label: "조금만 더 챙기면 돼요", tone: "warn" };
  return { label: "지금 손볼 곳이 있어요", tone: "danger" };
}

/** AI 코칭 요청에 넣을 요약 */
export function readinessContext(p: ProfileStore, r: Readiness): string {
  const dday = p.status.endDate ? computeDday(p.status.endDate).label : null;
  return [
    `자립 준비도 종합 ${r.score}점`,
    ...r.axes.map((a) => `- ${a.label}: ${a.value}점 (${a.hint})`),
    `가장 약한 축: ${r.weakest.label}`,
    dday ? `보호종료: ${dday}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
