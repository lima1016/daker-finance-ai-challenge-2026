// 현금흐름 예측 — 결정적 계산 (AI가 금액을 지어내지 않게, 숫자는 전부 여기서)
//
// AI는 "무엇을 바꿔볼지"(시나리오 레버)만 제안하고,
// 잔액 곡선·소진 시점은 이 파일이 계산한다.
import type { ProfileStore } from "./profile";

export const FORECAST_MONTHS = 24;

/** AI가 제안하는 what-if 레버 (금액 자체가 아니라 '변화량') */
export interface Scenario {
  label: string; // "취업하면", "월세를 20만원 줄이면"
  why?: string; // 한 줄 근거
  incomeDelta?: number; // 월 수입 변화(원)
  expenseDelta?: number; // 월 지출 변화(원, 줄이면 음수)
  balanceDelta?: number; // 일시금 변화(원)
  startMonth?: number; // 몇 개월 뒤부터 적용 (기본 0)
}

export interface Series {
  label: string;
  why?: string;
  points: number[]; // 월별 잔액(원), points[0] = 오늘
  depletionMonth: number | null; // 잔액이 0 아래로 내려가는 첫 달 (없으면 null)
  monthlyNet: number; // 적용 후 월 수지(원)
}

export interface ForecastResult {
  months: number;
  startBalance: number;
  baseNet: number;
  series: Series[];
  labels: string[]; // "26.08" 형식 월 라벨
  ready: boolean; // 계산에 필요한 최소 정보가 있는지
  missing: string[]; // 없는 항목 이름
}

/** 프로필에서 예측의 출발점을 뽑는다 */
export function baseInputs(p: ProfileStore) {
  const startBalance = p.finance.balance ?? p.finance.settlement ?? 0;
  const income = p.status.income ?? 0;
  const allowance = p.finance.allowance ?? 0;
  const expense = p.status.expense ?? 0;
  return { startBalance, income, allowance, expense };
}

export function monthLabels(months: number, from = new Date()): string[] {
  const out: string[] = [];
  for (let i = 0; i <= months; i++) {
    const d = new Date(from.getFullYear(), from.getMonth() + i, 1);
    out.push(`${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

/** 한 시나리오의 잔액 곡선을 계산 */
export function project(p: ProfileStore, scenario: Scenario | null, months = FORECAST_MONTHS): Series {
  const { startBalance, income, allowance, expense } = baseInputs(p);
  const s = scenario;
  const start = Math.max(0, s?.startMonth ?? 0);

  const points: number[] = [startBalance + (s?.balanceDelta ?? 0)];
  let depletionMonth: number | null = null;

  for (let m = 1; m <= months; m++) {
    const applied = m > start;
    const inc = income + (applied ? (s?.incomeDelta ?? 0) : 0);
    const exp = expense + (applied ? (s?.expenseDelta ?? 0) : 0);
    const net = inc + allowance - Math.max(0, exp);
    const next = points[m - 1] + net;
    points.push(next);
    if (depletionMonth === null && next < 0) depletionMonth = m;
  }

  const netAfter =
    income + (s?.incomeDelta ?? 0) + allowance - Math.max(0, expense + (s?.expenseDelta ?? 0));

  return {
    label: s?.label ?? "지금 이대로",
    why: s?.why,
    points,
    depletionMonth,
    monthlyNet: netAfter,
  };
}

/** 기본 곡선 + AI 시나리오들을 합쳐 화면용 데이터로 */
export function buildForecast(
  p: ProfileStore,
  scenarios: Scenario[] = [],
  months = FORECAST_MONTHS,
): ForecastResult {
  const { startBalance, income, allowance, expense } = baseInputs(p);

  const missing: string[] = [];
  if (p.finance.balance == null && p.finance.settlement == null) missing.push("현재 잔액");
  if (p.status.expense == null) missing.push("월 지출");

  const base = project(p, null, months);
  const rest = scenarios.slice(0, 3).map((s) => project(p, s, months));

  return {
    months,
    startBalance,
    baseNet: income + allowance - expense,
    series: [base, ...rest],
    labels: monthLabels(months),
    ready: missing.length === 0,
    missing,
  };
}

/** "2028년 3월 (D-580)" 처럼 소진 시점을 사람이 읽는 문장으로 */
export function depletionLabel(monthIndex: number | null, from = new Date()): string | null {
  if (monthIndex == null) return null;
  const d = new Date(from.getFullYear(), from.getMonth() + monthIndex, 1);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

/** AI에게 넘길 현재 상황 요약 (시나리오를 고르는 근거) */
export function forecastContext(p: ProfileStore, f: ForecastResult): string {
  const { income, allowance, expense } = baseInputs(p);
  const lines = [
    `현재 잔액: ${f.startBalance}원`,
    `월 수입: ${income}원 / 자립수당: ${allowance}원 / 월 지출: ${expense}원`,
    `월 수지: ${f.baseNet}원`,
  ];
  const base = f.series[0];
  if (base.depletionMonth != null) {
    lines.push(`지금 이대로면 ${base.depletionMonth}개월 뒤(${depletionLabel(base.depletionMonth)}) 잔액이 0이 됩니다.`);
  } else {
    lines.push(`지금 이대로면 ${f.months}개월 안에는 잔액이 바닥나지 않습니다.`);
  }
  if (p.status.housing) lines.push(`주거: ${p.status.housing}`);
  if (p.status.work) lines.push(`근로: ${p.status.work}`);
  return lines.join("\n");
}
