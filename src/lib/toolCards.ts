// 모델의 도구 호출 → 화면 카드 (서버 전용)
//
// 핵심: 금액이 들어가는 카드는 모델 인자를 쓰지 않고 프로필에서 다시 계산한다.
// 모델은 "지금 이 카드를 보여주자"만 결정한다.
import { normalizeCard, type Card } from "./cards";
import { computeAllocation } from "./budget";
import { buildForecast, FORECAST_MONTHS } from "./forecast";
import { computeReadiness } from "./readiness";
import type { ProfileStore } from "./profile";

export function buildToolCard(
  name: string,
  input: Record<string, unknown>,
  profile: ProfileStore,
): Card | null {
  switch (name) {
    case "show_allocation": {
      // 프로필에 금액이 없으면, 대화에서 언급된 금액을 임시로 쓴다
      const spoken = typeof input.total === "number" && input.total > 0 ? input.total : 0;
      const p: ProfileStore =
        profile.finance.settlement || profile.finance.balance || !spoken
          ? profile
          : { ...profile, finance: { ...profile.finance, settlement: spoken } };

      const result = computeAllocation(p);
      return result ? result.card : null;
    }

    case "show_forecast": {
      const f = buildForecast(profile, [], FORECAST_MONTHS);
      if (!f.ready) return null;
      return normalizeCard({
        type: "forecast",
        title: "앞으로 24개월 잔액",
        labels: f.labels,
        series: f.series,
      });
    }

    case "show_readiness": {
      const r = computeReadiness(profile);
      if (!r.filled) return null;
      return normalizeCard({
        type: "radar",
        title: "자립 준비도",
        score: r.score,
        axes: r.axes.map((a) => ({ label: a.label, value: a.value, hint: a.hint })),
      });
    }

    case "show_timeline":
      return normalizeCard({ type: "timeline", ...input });

    case "show_risk":
      return normalizeCard({ type: "risk", ...input });

    default:
      return null;
  }
}

/**
 * 글 없이 카드만 나갈 때 앞에 붙일 한 문장.
 *
 * 프롬프트로 "카드 전에 한두 문장을 먼저 쓰라"고 시켜도 모델이 가끔 무시하고
 * 도구만 호출한다. 그러면 화면에 카드가 설명 없이 덩그러니 뜬다.
 * 카드가 보인다는 사실 자체는 말하지 않는다 — 사용자에게는 이미 보인다.
 */
export function cardLeadIn(type: Card["type"]): string {
  switch (type) {
    case "budget":
      return "목돈을 용도별로 나누면 이렇게 됩니다. 비상금부터 먼저 떼어 두는 것이 안전해요.";
    case "forecast":
      return "지금 흐름이 이어지면 잔액이 어떻게 움직이는지 짚어봤어요.";
    case "radar":
      return "지금 자립 준비 상태를 항목별로 살펴봤어요. 가장 낮은 곳부터 손보면 좋습니다.";
    case "timeline":
      return "지금 상황에서 챙기면 좋은 순서를 정리했어요.";
    case "risk":
      return "말씀하신 내용에서 조심해야 할 신호가 보여요.";
    case "scan":
      return "보내주신 내용을 살펴봤어요.";
  }
}
