// 자립준비청년 지원제도 — 화면에 쓰는 모든 제도 정보의 단일 출처.
//
// 이 앱의 원칙은 "AI는 수치를 임의로 생성하지 않는다"이다. 지원제도야말로
// 금액·기간·신청처를 잘못 말하면 실제 피해가 나는 영역이라, 챗봇에 맡기지 않고
// 확인된 값만 여기에 적어 화면에 그대로 보여준다.
//
// ⚠️ 값을 고칠 때는 반드시 url·source·checkedAt을 함께 고칠 것.
//    제도는 매년 바뀌므로 checkedAt이 오래되면 화면에 '확인 필요'로 표시된다.
import type { ProfileStore } from "./profile";
import { computeDday } from "./profile";

export type BenefitCategory = "money" | "housing" | "asset" | "health" | "support";

export const CATEGORY_LABEL: Record<BenefitCategory, string> = {
  money: "생활비",
  housing: "주거",
  asset: "목돈 마련",
  health: "의료·마음",
  support: "상담·사례관리",
};

/**
 * 시·도별 자립정착금 (2025년 기준, 보건복지부).
 * 표에 없는 지역은 기본 1,000만원.
 * ⚠️ 매년 바뀐다. 고칠 때 SETTLEMENT_CHECKED_AT도 함께 올릴 것.
 */
const SETTLEMENT_BY_REGION: Record<string, number> = {
  서울: 2000,
  대전: 1500,
  경기: 1500,
  제주: 1500,
  경남: 1500,
  부산: 1200,
};
const SETTLEMENT_DEFAULT = 1000;
export const SETTLEMENT_BASE_YEAR = "2025년";

/** 거주 지역의 자립정착금. 지역을 모르면 null */
export function settlementForRegion(region?: string): number | null {
  if (!region?.trim()) return null;
  return SETTLEMENT_BY_REGION[region.trim()] ?? SETTLEMENT_DEFAULT;
}

export interface Benefit {
  id: string;
  name: string;
  /** 한 줄 설명 */
  summary: string;
  /** 금액·혜택. 확정 금액이 아니면 범위로 적는다 */
  amount: string;
  /** 받을 수 있는 사람 */
  target: string;
  /** 어디에 어떻게 신청하는지 */
  how: string;
  tel?: string;
  /** 공식 안내 링크 (정부·공공기관만) */
  url: string;
  source: string;
  /** 최종 확인일 YYYY-MM-DD */
  checkedAt: string;
  category: BenefitCategory;
  /** 지역·시점에 따라 달라지는 부분을 미리 알린다 */
  caution?: string;
  /** 지역에 따라 금액·기관이 달라지는 제도 (화면에 '지역별' 표시) */
  regional?: boolean;
  /** 이 사람에게 특히 급한 제도인지 — 규칙 기반 (AI 아님) */
  urgentFor?: (p: ProfileStore) => boolean;
  /** 지역 등 프로필에 따라 금액이 갈릴 때. null이면 위의 amount를 그대로 쓴다 */
  amountFor?: (p: ProfileStore) => string | null;
  /** 프로필을 알면 주의사항도 좁혀서 말할 수 있다 */
  cautionFor?: (p: ProfileStore) => string | null;
}

/** 보호종료가 60일 안쪽이거나 이미 지난 지 얼마 안 됐으면 신청 시점이 급하다 */
function nearProtectionEnd(p: ProfileStore): boolean {
  if (!p.status.endDate) return false;
  const { days } = computeDday(p.status.endDate);
  return !isNaN(days) && days <= 60 && days >= -365;
}

const unstableHousing = (p: ProfileStore) =>
  /고시원|친척|지인|없음|미정|원룸|월세/.test(p.status.housing ?? "");

const jobSeeking = (p: ProfileStore) => /구직|준비|학생|훈련/.test(p.status.work ?? "");

export const BENEFITS: Benefit[] = [
  {
    id: "allowance",
    name: "자립수당",
    summary: "보호종료 후 5년 동안 매달 현금으로 받는 생활비",
    amount: "월 50만원",
    target: "과거 2년 이상 연속 보호를 받고 18세 이후 보호종료된 자립준비청년 (보호종료 5년 이내)",
    how: "주민등록 주소지 읍·면·동 행정복지센터 방문·우편·팩스, 또는 복지로 온라인 신청. 보호종료 30일 전부터 미리 신청할 수 있어요",
    url: "https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00001175",
    source: "보건복지부·복지로 (근거: 아동복지법 제38조제1항제1호의2)",
    checkedAt: "2026-08-31",
    category: "money",
    urgentFor: nearProtectionEnd,
  },
  {
    id: "settlement",
    name: "자립정착금",
    summary: "보호가 끝날 때 한 번 받는 목돈",
    amount: "지자체별 1,000만원 ~ 2,000만원",
    target: "15세 이후 조기 보호종료자, 18세 이후 보호종료자",
    how: "아동복지시설 또는 가정위탁지원센터를 통해 신청. 자립정착금 사용계획서를 내고 심사 후 본인 통장으로 입금돼요",
    url: "https://www.mohw.go.kr/menu.es?mid=a10711041000",
    source: "보건복지부",
    checkedAt: "2026-08-31",
    category: "asset",
    regional: true,
    caution:
      "사는 지역에 따라 금액이 다릅니다. 2025년 기준 서울 2,000만원 · 대전/경기/제주/경남 1,500만원 · 부산 1,200만원 · 그 외 1,000만원. 정확한 금액은 관할 지자체에 확인하세요",
    amountFor: (p) => {
      const man = settlementForRegion(p.status.region);
      return man == null ? null : `${man.toLocaleString("ko-KR")}만원`;
    },
    cautionFor: (p) => {
      const region = p.status.region?.trim();
      const man = settlementForRegion(region);
      if (!region || man == null) return null;
      return `${region} 기준 ${SETTLEMENT_BASE_YEAR} 금액이에요. 보호종료 당시 관할 지자체 기준으로 정해지니, 이사한 적이 있다면 원래 지자체에 확인하세요`;
    },
    urgentFor: nearProtectionEnd,
  },
  {
    id: "lh-lease",
    name: "LH 전세임대·매입임대",
    summary: "보증금 100만원으로 들어갈 수 있는 공공임대",
    amount: "보증금 100만원 · 전세임대는 22세 이하 무이자(이후 연 1.2~2.2%), 매입임대는 시세의 40%",
    target: "무주택자이면서 가정위탁 보호종료 또는 시설 퇴소 5년 이내 (퇴소 예정자 포함)",
    how: "LH청약플러스에서 수시 모집 공고 확인 후 신청. 연중 상시 모집이에요",
    tel: "1600-1004",
    url: "https://www.lh.or.kr/menu.es?mid=a10401020800",
    source: "한국토지주택공사(LH)",
    checkedAt: "2026-08-31",
    category: "housing",
    caution: "전세임대는 2년마다 최대 14회까지 재계약할 수 있고, 4회를 넘기면 소득·자산 기준을 충족해야 합니다",
    urgentFor: unstableHousing,
  },
  {
    id: "cda",
    name: "디딤씨앗통장 (CDA)",
    summary: "내가 저축하면 국가가 2배로 얹어주는 통장",
    amount: "내가 넣은 돈의 1:2 매칭 (월 10만원 한도)",
    target: "아동복지시설 보호아동 등 (가입 조건은 보호 시점 기준이라 개별 확인 필요)",
    how: "관할 지자체 또는 보호기관을 통해 확인·신청",
    url: "https://www.mohw.go.kr/menu.es?mid=a10711041000",
    source: "보건복지부",
    checkedAt: "2026-08-31",
    category: "asset",
  },
  {
    id: "medical",
    name: "의료비 지원",
    summary: "병원비 본인부담금을 덜어주는 제도",
    amount: "건강보험 본인부담금 경감",
    target: "자립준비청년",
    how: "자립지원전담기관 또는 행정복지센터에 문의",
    url: "https://www.mohw.go.kr/menu.es?mid=a10711041000",
    source: "보건복지부",
    checkedAt: "2026-08-31",
    category: "health",
  },
  {
    id: "mind",
    name: "심리상담 (전국민 마음투자)",
    summary: "마음이 힘들 때 상담을 자부담 없이 받을 수 있어요",
    amount: "자부담 면제",
    target: "자립준비청년",
    how: "자립지원전담기관 또는 행정복지센터에 문의",
    url: "https://www.mohw.go.kr/menu.es?mid=a10711041000",
    source: "보건복지부",
    checkedAt: "2026-08-31",
    category: "health",
  },
  {
    id: "local-agency",
    name: "우리 지역 자립지원전담기관",
    summary: "주거·취업·심리를 한 사람이 계속 챙겨주는 지역 담당 기관",
    amount: "무료 사례관리",
    target: "보호종료 5년 이내 자립준비청년",
    how: "자립정보ON에서 우리 시·도 전담기관을 찾아 연락하세요. 어디로 갈지 모르겠으면 상담센터(1855-2455)에 먼저 물어봐도 돼요",
    url: "https://jaripon.ncrc.or.kr/",
    source: "아동권리보장원 자립정보ON",
    checkedAt: "2026-08-31",
    category: "support",
    regional: true,
    cautionFor: (p) => {
      const region = p.status.region?.trim();
      return region
        ? `${region} 전담기관이 담당해요. 전국 17개 시·도에 하나씩 있고, 기관마다 운영하는 프로그램이 달라요`
        : "전국 17개 시·도에 하나씩 있어요. 거주 지역을 알려주시면 어디를 찾아야 하는지 짚어드릴게요";
    },
    urgentFor: (p) => Boolean(p.status.endDate),
  },
  {
    id: "counsel",
    name: "자립준비청년 상담센터",
    summary: "먼저 자립한 선배가 직접 상담해 주는 곳",
    amount: "무료",
    target: "자립준비청년 누구나",
    how: "전화 또는 카카오채널 1:1 상담 (평일 09:00~18:00). 자립정보ON에서 우리 지역 자립지원전담기관도 찾을 수 있어요",
    tel: "1855-2455",
    url: "https://jaripon.ncrc.or.kr/",
    source: "아동권리보장원 자립정보ON",
    checkedAt: "2026-08-31",
    category: "support",
    urgentFor: jobSeeking,
  },
];

/**
 * 프로필에 비춰 급한 것을 위로 올린다. 걸러내지는 않는다 —
 * 목록에서 빠지면 "그런 제도가 있는 줄도 몰랐다"가 그대로 반복되기 때문.
 */
export function sortBenefits(p: ProfileStore, list: Benefit[] = BENEFITS): Benefit[] {
  return [...list].sort((a, b) => {
    const av = a.urgentFor?.(p) ? 0 : 1;
    const bv = b.urgentFor?.(p) ? 0 : 1;
    return av - bv;
  });
}

/** 확인한 지 오래된 정보는 화면에서 표시해 준다 */
export function isStale(b: Benefit, now = new Date()): boolean {
  const days = (now.getTime() - new Date(b.checkedAt).getTime()) / 86400000;
  return days > 180;
}
