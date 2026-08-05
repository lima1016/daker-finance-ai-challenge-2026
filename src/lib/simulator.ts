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

/** 슬라이더 상태에 대한 새봄의 진단 문구 (규칙 기반) */
export function diagnose(alloc: Alloc, monthlyExpense?: number): string {
  const total = alloc.emergency + alloc.living + alloc.saving;
  if (total <= 0) return "정착금 금액을 입력하면 배분을 진단해 드릴게요.";
  const months = monthsCovered(alloc, monthlyExpense);
  const savingRatio = alloc.saving / total;

  const parts: string[] = [];
  parts.push(`지금 배분이면 소득이 없어도 약 ${months}개월 버틸 수 있어요.`);

  if (alloc.emergency < (monthlyExpense || 1_000_000) * 3) {
    parts.push("다만 비상금이 3개월치보다 적어요. 갑작스러운 일에 대비해 조금 더 채우는 걸 추천해요.");
  } else {
    parts.push("비상금이 탄탄해서 안심돼요.");
  }

  if (savingRatio < 0.2) {
    parts.push("저축은 여유가 될 때 늘려요. 디딤씨앗통장처럼 정부가 얹어주는 상품부터 알아보면 좋아요.");
  } else {
    parts.push("저축·자산형성 비중도 좋아요. 디딤씨앗통장 등 매칭지원을 챙겨보세요.");
  }
  return parts.join(" ");
}

/** 프로필에서 시뮬레이터 초기값 만들기 */
export function initialAlloc(p: ProfileStore): { total: number; alloc: Alloc } {
  const total = p.finance.settlement ?? p.finance.balance ?? 0;
  const a = p.finance.alloc;
  if (a && (a.emergency || a.living || a.saving)) {
    return { total, alloc: { emergency: a.emergency || 0, living: a.living || 0, saving: a.saving || 0 } };
  }
  // 배분이 없으면 규칙 기본값(비상금 6개월·생활비 6개월·나머지 저축)으로 시작
  const exp = p.status.expense && p.status.expense > 0 ? p.status.expense : 1_000_000;
  const round10k = (n: number) => Math.round(n / 10000) * 10000;
  let emergency = Math.min(round10k(exp * 6), total);
  let living = Math.min(round10k(exp * 6), Math.max(0, total - emergency));
  const saving = Math.max(0, total - emergency - living);
  return { total, alloc: { emergency, living, saving } };
}

export function allocLabel(alloc: Alloc): string {
  return `비상금 ${formatMan(alloc.emergency)} · 생활비 ${formatMan(alloc.living)} · 저축 ${formatMan(alloc.saving)}`;
}
