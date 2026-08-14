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
