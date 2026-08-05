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

/** 데모용 샘플 사용자 ('준이') — 보호종료 D-34, 정착금 1,500만원 */
export function sampleProfile(): ProfileStore {
  const end = new Date();
  end.setDate(end.getDate() + 34);
  const endDate = end.toISOString().slice(0, 10);
  return {
    status: { nickname: "준이", endDate, housing: "원룸 월세", work: "구직 중", income: 1200000, expense: 900000 },
    finance: {
      settlement: 15000000,
      allowance: 500000,
      balance: 13000000,
      alloc: { emergency: 4500000, living: 6000000, saving: 4500000 },
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
