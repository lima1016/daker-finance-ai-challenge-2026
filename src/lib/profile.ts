// 사용자 프로필(상태 + 재정) 모델 & 순수 헬퍼 (React 없음 → 서버/클라이언트 공용)
import { formatMan } from "./cards";

export interface StatusInfo {
  nickname?: string;
  endDate?: string; // 보호종료(예정)일 YYYY-MM-DD
  region?: string; // 거주 시·도 (자립정착금이 지자체별로 다르다)
  housing?: string; // 주거 상태
  work?: string; // 근로 상태
  income?: number; // 월 수입(원)
  expense?: number; // 월 지출(원)
}

export interface FinanceInfo {
  settlement?: number; // 자립정착금 총액(원)
  allowance?: number; // 자립수당(월, 원)
  balance?: number; // 현재 통장 잔액(원)
  alloc?: { emergency?: number; living?: number; saving?: number }; // 용도별 배분(원)
}

export interface ProfileStore {
  status: StatusInfo;
  finance: FinanceInfo;
}

export const DEFAULT_PROFILE: ProfileStore = { status: {}, finance: {} };

// 주거·근로 상태는 자립 준비도 채점(readiness.ts)과 배분 규칙(budget.ts)이
// 문자열로 판별한다. 자유 입력이면 "회사 다님" 같은 값이 어디에도 걸리지 않아
// 점수가 엉뚱하게 나오므로, 선택지를 고정해 채점이 항상 맞도록 한다.
// ⚠️ 항목을 바꾸면 readiness.ts의 판별 규칙도 함께 확인할 것.
// 자립정착금·주거지원이 시·도 단위로 갈리므로 광역 단위만 받는다.
// ⚠️ 항목을 바꾸면 benefits.ts의 SETTLEMENT_BY_REGION도 함께 확인할 것.
export const REGION_OPTIONS = [
  "서울",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
  "울산",
  "세종",
  "경기",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
] as const;

export const HOUSING_OPTIONS = [
  "LH·공공임대",
  "전세",
  "원룸·월세",
  "자립생활관·그룹홈",
  "기숙사",
  "고시원·친척집",
  "아직 미정",
] as const;

export const WORK_OPTIONS = [
  "정규직 재직",
  "계약직·파견",
  "아르바이트·단기",
  "구직 중",
  "학생·직업훈련 중",
] as const;

/**
 * 데모용 샘플 사용자 '김새봄' — 보호종료 60일차.
 *
 * 실태조사에서 가장 흔한 상황을 그대로 옮겼다.
 * 정착금 1,500만원을 받았지만 원룸 보증금으로 1,000만원이 묶였고,
 * 아직 취업 전이라 매달 조금씩 잔액이 줄어든다.
 * (가장 큰 어려움 1위가 '거주할 집 문제', 2위가 '생활비 부족'이다)
 */
export function sampleProfile(): ProfileStore {
  const end = new Date();
  end.setDate(end.getDate() - 60);
  const endDate = end.toISOString().slice(0, 10);
  return {
    status: {
      nickname: "김새봄",
      endDate,
      region: "경기", // 예시 정착금 1,500만원과 맞는 지역 (서울은 2,000만원)
      housing: "원룸·월세",
      work: "아르바이트·단기",
      income: 400_000,
      expense: 1_250_000,
    },
    finance: {
      settlement: 15_000_000, // 받은 총액
      allowance: 500_000,
      balance: 4_000_000, // 보증금으로 묶이고 남은 현금
      alloc: { emergency: 1_000_000, living: 3_000_000, saving: 0 },
    },
  };
}

/**
 * "서울특별시" · "경기도" 같은 공식 표기를 REGION_OPTIONS의 짧은 이름으로 맞춘다.
 * DB나 예전 입력에서 긴 이름이 들어오면 지역별 금액·사업이 통째로 안 걸린다.
 */
export function normalizeRegion(raw?: string): string | undefined {
  const v = raw?.trim();
  if (!v) return undefined;
  const short = v
    .replace(/특별자치시|특별자치도|특별시|광역시|자치도/g, "")
    .replace(/^(경기|강원|충청북|충청남|전라북|전라남|경상북|경상남)도$/, "$1")
    .replace(/^(충청북|충청남|전라북|전라남|경상북|경상남)$/, (m) => m[0] + m[2])
    .trim();
  return (REGION_OPTIONS as readonly string[]).includes(short) ? short : v;
}

export function computeDday(endDate: string): { label: string; days: number } {
  const end = new Date(endDate + "T00:00:00");
  if (isNaN(end.getTime())) return { label: "", days: NaN };
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const days = Math.round((end.getTime() - now.getTime()) / 86400000);
  if (days > 0) return { label: `D-${days}`, days };
  if (days === 0) return { label: "오늘 종료", days: 0 };
  return { label: `종료 ${-days}일차`, days };
}

/**
 * 대시보드를 '내 화면'으로 그릴 만큼 정보가 모였는지.
 *
 * hasProfile()은 필드 하나만 채워져도 true라, 예시를 보다가 거주 지역만 골라도
 * 예시가 통째로 사라지고 "—"만 남은 화면이 됐다. 잔액·지출처럼 계산에 실제로
 * 쓰이는 값이 하나라도 있어야 내 화면으로 넘어간다.
 */
export function hasEnoughForDashboard(p: ProfileStore): boolean {
  const { income, expense } = p.status;
  const { balance, settlement, allowance } = p.finance;
  return [income, expense, balance, settlement, allowance].some((v) => v != null);
}

export function hasProfile(p: ProfileStore): boolean {
  return Object.values(p.status).some((v) => v !== undefined && v !== "") ||
    Object.values(p.finance).some((v) => v !== undefined && v !== "");
}

/** AI에게 전달할 프로필 요약(설정된 값만) */
export function buildProfileContext(p: ProfileStore): string {
  const s = p.status;
  const f = p.finance;
  const lines: string[] = [];
  if (s.nickname) lines.push(`닉네임: ${s.nickname}`);
  if (s.endDate) {
    const d = computeDday(s.endDate);
    lines.push(`보호종료(예정)일: ${s.endDate}${d.label ? ` (${d.label})` : ""}`);
  }
  if (s.region) lines.push(`거주 지역: ${s.region}`);
  if (s.housing) lines.push(`주거 상태: ${s.housing}`);
  if (s.work) lines.push(`근로 상태: ${s.work}`);
  if (s.income != null) lines.push(`월 수입: ${formatMan(s.income)}`);
  if (s.expense != null) lines.push(`월 지출: ${formatMan(s.expense)}`);
  if (f.settlement != null) lines.push(`자립정착금 총액: ${formatMan(f.settlement)}`);
  if (f.allowance != null) lines.push(`자립수당(월): ${formatMan(f.allowance)}`);
  if (f.balance != null) lines.push(`현재 잔액: ${formatMan(f.balance)}`);
  const a = f.alloc;
  if (a && (a.emergency || a.living || a.saving)) {
    lines.push(
      `현재 배분 — 비상금 ${formatMan(a.emergency || 0)}, 생활비 ${formatMan(a.living || 0)}, 저축 ${formatMan(a.saving || 0)}`,
    );
  }
  return lines.join("\n");
}
