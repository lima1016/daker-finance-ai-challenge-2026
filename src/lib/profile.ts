// 사용자 프로필(상태 + 재정) 모델 & 순수 헬퍼 (React 없음 → 서버/클라이언트 공용)
import { formatMan } from "./cards";

export interface StatusInfo {
  nickname?: string;
  endDate?: string; // 보호종료(예정)일 YYYY-MM-DD
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
