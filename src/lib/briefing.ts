// "오늘의 브리핑" — AI가 먼저 챙기는 프로액티브 카드 (규칙 기반, 즉시·무료·항상 작동)
import { computeDday, type ProfileStore } from "./profile";

export type BriefingTone = "info" | "warn" | "danger";
export type BriefingAction = "chat" | "scanner" | "simulator";

export interface BriefingItem {
  icon: BriefingTone; // UI가 톤별 아이콘 매핑
  tone: BriefingTone;
  title: string;
  desc: string;
  action: BriefingAction;
  prompt?: string; // action === "chat" 일 때 보낼 질문
}

export function buildBriefing(p: ProfileStore): BriefingItem[] {
  const items: BriefingItem[] = [];
  const s = p.status;
  const f = p.finance;

  // 1) 보호종료 임박 → 제도 신청 챙기기
  if (s.endDate) {
    const d = computeDday(s.endDate);
    if (!isNaN(d.days) && d.days >= 0 && d.days <= 60) {
      items.push({
        icon: "warn",
        tone: "warn",
        title: `보호종료 ${d.label} — 지금 신청할 제도가 있어요`,
        desc: "자립수당·주거·의료 지원은 시점을 놓치면 못 받을 수 있어요.",
        action: "chat",
        prompt: "보호종료가 얼마 안 남았어요. 지금 신청해야 할 지원제도를 순서대로 알려주세요.",
      });
    }
  }

  // 2) 배분 점검 (저축 비중 낮거나, 아직 안 나눔)
  const a = f.alloc;
  const allocTotal = (a?.emergency || 0) + (a?.living || 0) + (a?.saving || 0);
  if (allocTotal > 0) {
    if ((a?.saving || 0) / allocTotal < 0.25) {
      items.push({
        icon: "info",
        tone: "info",
        title: "저축 비중이 낮아요",
        desc: "여유가 되면 저축·자산형성을 조금 늘려볼까요? 시뮬레이터로 맞춰봐요.",
        action: "simulator",
      });
    }
  } else if (f.settlement != null || f.balance != null) {
    items.push({
      icon: "info",
      tone: "info",
      title: "목돈, 아직 안 나눴어요",
      desc: "정착금을 용도별로 나눠두면 관리가 훨씬 쉬워져요.",
      action: "simulator",
    });
  }

  // 3) 사기 주의 (상시)
  items.push({
    icon: "danger",
    tone: "danger",
    title: "요즘 '통장 대여' 사기가 늘었어요",
    desc: "수상한 문자·링크를 받으면 위험 스캐너로 먼저 확인하세요.",
    action: "scanner",
  });

  return items;
}
