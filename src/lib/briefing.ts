// "오늘의 브리핑" — 규칙 기반 폴백
//
// 평소엔 /api/briefing 이 AI로 브리핑을 만든다. 이 파일은 키가 없거나
// 호출이 실패했을 때를 위한 안전망 — 즉시·무료·항상 작동한다.
import { computeDday, type ProfileStore } from "./profile";
import { computeReadiness } from "./readiness";
import { buildForecast } from "./forecast";

export type BriefingTone = "info" | "warn" | "danger";
export type BriefingAction = "chat" | "scanner" | "simulator" | "forecast";

export interface BriefingItem {
  tone: BriefingTone;
  title: string;
  desc: string;
  action: BriefingAction;
  prompt?: string; // action === "chat" 일 때 보낼 질문
}

/**
 * 브리핑을 좌우하는 값만 뽑은 지문(指紋).
 *
 * 캐시 키로 프로필 전체를 쓰면 닉네임·거주 지역만 바꿔도 AI가 브리핑을 다시 만든다.
 * 그러면 사용자 눈에는 "상관없는 걸 건드렸는데 오늘 챙길 것이 통째로 바뀌는" 일이 생긴다.
 * 실제로 브리핑을 바꾸는 값(보호종료일·수입·지출·잔액·주거·근로·배분)만 넣는다.
 */
export function briefingSignature(p: ProfileStore): string {
  const s = p.status;
  const f = p.finance;
  const a = f.alloc;
  return JSON.stringify([
    s.endDate ?? null,
    s.housing ?? null,
    s.work ?? null,
    s.income ?? null,
    s.expense ?? null,
    f.settlement ?? null,
    f.allowance ?? null,
    f.balance ?? null,
    a ? [a.emergency ?? 0, a.living ?? 0, a.saving ?? 0] : null,
  ]);
}

/** 브리핑 프롬프트·캐시에서 제외할 값을 지운 프로필 (닉네임·거주 지역) */
export function briefingProfile(p: ProfileStore): ProfileStore {
  const status = { ...p.status };
  delete status.nickname;
  delete status.region;
  return { status, finance: p.finance };
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
        tone: "warn",
        title: `보호종료 ${d.label} — 지금 신청할 제도가 있어요`,
        desc: "자립수당·주거·의료 지원은 시점을 놓치면 못 받을 수 있어요.",
        action: "chat",
        prompt: "보호종료가 얼마 안 남았어요. 지금 신청해야 할 지원제도를 순서대로 알려주세요.",
      });
    }
  }

  // 2) 잔액 소진 시점 경고
  const forecast = buildForecast(p, []);
  const depletion = forecast.ready ? forecast.series[0].depletionMonth : null;
  if (depletion != null && depletion <= 12) {
    items.push({
      tone: "danger",
      title: `이대로면 ${depletion}개월 뒤 잔액이 바닥나요`,
      desc: "무엇을 바꾸면 달라지는지 그래프로 같이 볼까요?",
      action: "forecast",
    });
  }

  // 3) 가장 약한 축 챙기기
  const readiness = computeReadiness(p);
  if (readiness.filled && readiness.weakest.value < 50) {
    items.push({
      tone: "info",
      title: `${readiness.weakest.label} 점수가 가장 낮아요`,
      desc: readiness.weakest.hint,
      action: "chat",
      prompt: `제 자립 준비도에서 ${readiness.weakest.label} 점수가 낮게 나왔어요. 어떻게 올릴 수 있을까요?`,
    });
  }

  // 4) 배분 점검
  const a = f.alloc;
  const allocTotal = (a?.emergency || 0) + (a?.living || 0) + (a?.saving || 0);
  if (allocTotal === 0 && (f.settlement != null || f.balance != null)) {
    items.push({
      tone: "info",
      title: "목돈, 아직 안 나눴어요",
      desc: "정착금을 용도별로 나눠두면 관리가 훨씬 쉬워져요.",
      action: "simulator",
    });
  }

  // 5) 사기 주의 (상시)
  items.push({
    tone: "danger",
    title: "요즘 '통장 대여' 사기가 늘었어요",
    desc: "수상한 문자·링크를 받으면 위험 스캐너로 먼저 확인하세요.",
    action: "scanner",
  });

  return items.slice(0, 4);
}
