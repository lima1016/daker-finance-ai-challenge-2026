// "그래서 어떻게 해야 하나" — 잔액이 바닥난다는 판단 다음에 올 것.
//
// 지금까지는 현금흐름 화면이 "12개월 뒤 바닥나요"까지만 말하고 끝났다.
// 여기서는 benefits.ts의 '실제 제도 금액'을 forecast.ts의 시나리오로 바꿔,
// "자립수당을 신청하면 24개월+ 로 늘어나요"까지 계산해 준다.
//
// 금액은 정부 자료(benefits.ts), 계산은 정해진 공식(forecast.ts).
// AI는 이 경로에 개입하지 않는다.
//
// ⚠️ 대출 상품은 여기에 넣지 않는다. 소득이 불안정한 사람에게 빚을 권하는 셈이 되고,
//    이 앱은 같은 화면에서 '통장 대여' 사기를 경고하고 있다. 돈이 급한 상황은
//    상품을 나열하는 대신 상담 창구로 연결한다 — 판단은 상담사가 한다.
import { BENEFITS, sortBenefits, type Benefit } from "./benefits";
import { FORECAST_MONTHS, project, type Scenario } from "./forecast";
import type { ProfileStore } from "./profile";

export interface Relief {
  benefit: Benefit;
  scenario: Scenario;
  /** 지금 그대로일 때 바닥나는 달 (없으면 null) */
  before: number | null;
  /** 이 제도를 받으면 바닥나는 달 (없으면 null = 24개월 안에 안 바닥남) */
  after: number | null;
  /** 몇 달을 더 버티게 되는지 */
  gainedMonths: number;
}

/** "12개월" / "24개월+" 처럼 사람이 읽는 형태로 */
export function survivalLabel(depletionMonth: number | null): string {
  return depletionMonth == null
    ? `${FORECAST_MONTHS}개월+`
    : `${Math.max(0, depletionMonth - 1)}개월`;
}

/**
 * 아직 안 받고 있는 제도 중에서, 현금흐름을 실제로 늘려주는 것만 고른다.
 * 효과가 큰 순서로 돌려준다.
 */
export function buildReliefs(p: ProfileStore): Relief[] {
  const base = project(p, null);
  const before = base.depletionMonth;

  const out: Relief[] = [];
  for (const benefit of sortBenefits(p, BENEFITS)) {
    if (!benefit.effect || benefit.alreadyHas?.(p)) continue;
    const delta = benefit.effect(p);
    if (!delta) continue;

    const scenario: Scenario = { label: `${benefit.name}을 받으면`, ...delta };
    const after = project(p, scenario).depletionMonth;

    // 바닥나는 시점이 뒤로 밀리거나 아예 사라져야 '해결책'이라 부를 수 있다
    const beforeM = before ?? FORECAST_MONTHS + 1;
    const afterM = after ?? FORECAST_MONTHS + 1;
    if (afterM <= beforeM) continue;

    out.push({ benefit, scenario, before, after, gainedMonths: afterM - beforeM });
  }
  return out.sort((a, b) => b.gainedMonths - a.gainedMonths);
}

/** 돈이 급할 때 갈 곳 — 빌려주는 곳이 아니라 '사람에게 연결되는' 곳만 */
export const HELPLINES = [
  {
    name: "자립준비청년 상담센터",
    tel: "1855-2455",
    desc: "먼저 자립한 선배가 상황을 같이 정리해 줘요",
    url: "https://jaripon.ncrc.or.kr/",
  },
  {
    name: "서민금융진흥원",
    tel: "1397",
    desc: "복지·금융 지원을 한 번에 상담하고 맞는 곳으로 연결해 줘요",
    url: "https://www.kinfa.or.kr/counselingSupport/microfinanceCallCenter1397.do",
  },
  {
    name: "신용회복위원회",
    tel: "1600-5500",
    desc: "이미 빚이 있다면 상환기간·이자를 줄이는 채무조정을 상담해요",
    url: "https://www.kinfa.or.kr/financialLife/debtSettlementSystem.do",
  },
] as const;
