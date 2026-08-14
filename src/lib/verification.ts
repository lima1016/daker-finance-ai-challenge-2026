// 환각 방지 검증 — "AI가 금액을 만들지 않는다"는 주장을 실제로 확인한다.
//
// 이 앱의 핵심 주장은 배지 한 줄로 끝나면 안 된다. 모델이 카드를 그리며 넘긴
// 인자를 서버가 정말 무시하는지, 화면에 찍히는 숫자가 언제나 결정적 계산과
// 같은지를 여기서 반복 측정한다. AI 호출 없이 돌아가므로 몇 번이든 돌릴 수 있다.
import { buildToolCard } from "./toolCards";
import { computeAllocation } from "./budget";
import { buildForecast } from "./forecast";
import { computeReadiness } from "./readiness";
import type { ProfileStore } from "./profile";
import type { BudgetCard, ForecastCard, RadarCard } from "./cards";

export interface CheckResult {
  tool: string;
  attack: string;
  expected: string;
  actual: string;
  pass: boolean;
}

export interface VerificationReport {
  total: number;
  passed: number;
  failed: number;
  cases: CheckResult[];
  ranAt: string;
}

/** 모델이 넘길 법한(또는 넘길 수 없어야 하는) 악의적 인자들 */
const HOSTILE_INPUTS: { name: string; input: Record<string, unknown> }[] = [
  { name: "터무니없이 큰 금액", input: { total: 999_999_999_999 } },
  { name: "음수 금액", input: { total: -50_000_000 } },
  { name: "0", input: { total: 0 } },
  { name: "문자열 금액", input: { total: "1억원" } },
  { name: "NaN", input: { total: Number.NaN } },
  { name: "Infinity", input: { total: Number.POSITIVE_INFINITY } },
  { name: "정의되지 않은 필드 주입", input: { total: 1, score: 100, points: [1, 2, 3], balance: 9e9 } },
  { name: "series 통째로 주입", input: { series: [{ label: "가짜", points: [1e9, 2e9] }] } },
  { name: "axes 통째로 주입", input: { axes: [{ label: "가짜", value: 100 }], score: 100 } },
  { name: "items 통째로 주입", input: { items: [{ label: "가짜", amount: 5e8 }], total: 5e8 } },
  { name: "빈 객체", input: {} },
  { name: "중첩 객체", input: { total: { amount: 1e9 } } },
];

/** 서로 다른 상황의 프로필 (계산 결과가 달라야 방어가 의미 있다) */
const PROFILES: { name: string; profile: ProfileStore }[] = [
  {
    name: "적자·잔액 적음",
    profile: {
      status: { work: "아르바이트·단기", income: 400_000, expense: 1_250_000, housing: "원룸·월세" },
      finance: { settlement: 15_000_000, allowance: 500_000, balance: 4_000_000 },
    },
  },
  {
    name: "흑자·재직",
    profile: {
      status: { work: "정규직 재직", income: 1_800_000, expense: 1_300_000, housing: "LH·공공임대" },
      finance: { settlement: 10_000_000, allowance: 500_000, balance: 7_200_000 },
    },
  },
  {
    name: "정보 최소",
    profile: {
      status: { work: "구직 중", expense: 900_000 },
      finance: { balance: 2_000_000 },
    },
  },
];

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

/**
 * 모든 (프로필 × 악의적 인자) 조합에서, 카드에 찍히는 숫자가
 * 프로필로 계산한 값과 정확히 같은지 확인한다.
 */
export function runHallucinationChecks(): VerificationReport {
  const cases: CheckResult[] = [];

  for (const { name: pName, profile } of PROFILES) {
    // 기대값은 모델 인자와 무관하게 프로필만으로 계산한다
    const expectedBudget = computeAllocation(profile);
    const expectedForecast = buildForecast(profile, []);
    const expectedReadiness = computeReadiness(profile);

    for (const { name: aName, input } of HOSTILE_INPUTS) {
      const attack = `${pName} / ${aName}`;

      // 1) 목돈 배분 — 총액이 언제나 규칙 계산과 같아야 한다
      const budget = buildToolCard("show_allocation", input, profile) as BudgetCard | null;
      const budgetTotal = budget?.total ?? null;
      const wantBudget = expectedBudget?.card.total ?? null;
      cases.push({
        tool: "show_allocation",
        attack,
        expected: wantBudget == null ? "카드 없음" : won(wantBudget),
        actual: budgetTotal == null ? "카드 없음" : won(budgetTotal),
        pass: budgetTotal === wantBudget,
      });

      // 카드 안 항목 합계도 총액과 맞아야 한다 (일부만 조작되는 경우 방지)
      if (budget) {
        const sum = budget.items.reduce((s, it) => s + it.amount, 0);
        cases.push({
          tool: "show_allocation",
          attack: `${attack} — 항목 합계`,
          expected: won(budget.total),
          actual: won(sum),
          pass: sum === budget.total,
        });
      }

      // 2) 현금흐름 — 곡선의 모든 점이 계산값과 같아야 한다
      const forecast = buildToolCard("show_forecast", input, profile) as ForecastCard | null;
      if (expectedForecast.ready) {
        const want = expectedForecast.series[0].points;
        const got = forecast?.series[0]?.points ?? [];
        const same = got.length === want.length && got.every((v, i) => v === want[i]);
        cases.push({
          tool: "show_forecast",
          attack,
          expected: `${want.length}개월, 시작 ${won(want[0])}`,
          actual: got.length ? `${got.length}개월, 시작 ${won(got[0])}` : "카드 없음",
          pass: same,
        });
      }

      // 3) 자립 준비도 — 점수와 축이 규칙 채점과 같아야 한다
      const radar = buildToolCard("show_readiness", input, profile) as RadarCard | null;
      if (expectedReadiness.filled) {
        const axesSame =
          radar?.axes.length === expectedReadiness.axes.length &&
          radar.axes.every((a, i) => a.value === expectedReadiness.axes[i].value);
        cases.push({
          tool: "show_readiness",
          attack,
          expected: `${expectedReadiness.score}점 / ${expectedReadiness.axes.length}축`,
          actual: radar ? `${radar.score}점 / ${radar.axes.length}축` : "카드 없음",
          pass: radar?.score === expectedReadiness.score && !!axesSame,
        });
      }
    }
  }

  const passed = cases.filter((c) => c.pass).length;
  return {
    total: cases.length,
    passed,
    failed: cases.length - passed,
    cases,
    ranAt: new Date().toISOString(),
  };
}
