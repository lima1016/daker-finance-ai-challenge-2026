"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProfileStore } from "@/lib/profile";
import { buildForecast, depletionLabel, type ForecastResult } from "@/lib/forecast";
import { formatMan } from "@/lib/cards";
import { cachedPost } from "@/lib/requestCache";
import { ForecastCard } from "./Cards";

type Props = {
  profile: ProfileStore;
  onAsk: (text: string) => void;
  onOpenProfile: () => void;
  onOpenSimulator: () => void;
};

/** AI가 시나리오까지 붙인 결과. 어떤 프로필에 대한 것인지 key로 들고 있는다 */
interface AiForecast {
  key: string;
  forecast: ForecastResult | null;
  insight: string;
  notice: string;
}

export function Forecast({ profile, onAsk, onOpenProfile, onOpenSimulator }: Props) {
  const profileKey = useMemo(() => JSON.stringify(profile), [profile]);
  const [ai, setAi] = useState<AiForecast | null>(null);
  // 프로필이 바뀌면 예전 결과는 자동으로 무시된다 (동기화용 setState 불필요)
  const fresh = ai?.key === profileKey ? ai : null;

  // 곡선은 AI를 기다리지 않고 즉시 계산한다. 시나리오가 도착하면 곡선이 늘어난다.
  const base = useMemo(() => buildForecast(profile, []), [profile]);
  const result = fresh?.forecast ?? base;
  const loading = base.ready && !fresh;
  const insight = fresh?.insight ?? "";
  const notice = fresh?.notice ?? "";

  // 프로필이 그대로면 캐시된 시나리오를 쓴다 (무료 티어 호출 절약)
  useEffect(() => {
    if (!base.ready) return;
    let cancelled = false;

    const settle = (next: Omit<AiForecast, "key">) => {
      if (cancelled) return;
      setAi({ key: profileKey, ...next });
    };

    cachedPost<{ forecast?: ForecastResult; insight?: string; error?: string }>(
      `forecast:${profileKey}`,
      "/api/forecast",
      { profile },
    )
      .then((json) =>
        settle({
          forecast: json.forecast ?? null,
          insight: typeof json.insight === "string" ? json.insight : "",
          notice: typeof json.error === "string" ? json.error : "",
        }),
      )
      .catch(() =>
        settle({
          forecast: null,
          insight: "",
          notice: "시나리오를 불러오지 못했어요. 그래프는 그대로 보실 수 있어요.",
        }),
      );

    return () => {
      cancelled = true;
    };
  }, [profile, profileKey, base.ready]);

  if (!base.ready) {
    return (
      <div className="mx-auto max-w-2xl">
        <h2 className="text-lg font-bold text-emerald-700">📉 현금흐름 예측</h2>
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          예측하려면 {base.missing.join("·")} 정보가 필요해요.
          <button onClick={onOpenProfile} className="ml-1 font-medium underline">
            내 정보에서 입력하기
          </button>
        </div>
      </div>
    );
  }

  const baseSeries = result.series[0];
  const when = depletionLabel(baseSeries.depletionMonth);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-emerald-700">📉 현금흐름 예측</h2>
        <span className="text-xs text-gray-500">앞으로 {result.months}개월</span>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <Stat label="현재 잔액" value={formatMan(result.startBalance)} />
        <Stat
          label="월 수지"
          value={`${result.baseNet >= 0 ? "+" : "−"}${formatMan(Math.abs(result.baseNet))}`}
          tone={result.baseNet >= 0 ? "good" : "bad"}
        />
        <Stat label="바닥나는 때" value={when ?? "24개월 내 없음"} tone={when ? "bad" : "good"} />
      </div>

      <ForecastCard
        card={{
          type: "forecast",
          title: "무엇을 바꾸면 달라질까요",
          labels: result.labels,
          series: result.series,
          insight: insight || undefined,
        }}
      />

      {loading && (
        <p className="flex items-center gap-2 text-xs text-gray-400">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-emerald-300 border-t-transparent" />
          새봄이 이 상황에서 시도해볼 만한 시나리오를 찾고 있어요…
        </p>
      )}
      {notice && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">{notice}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() =>
            onAsk(
              when
                ? `제 잔액이 ${when}쯤 바닥날 것 같아요. 지금부터 뭘 하면 좋을까요?`
                : "지금 현금흐름을 보니 어떤가요? 더 나아지려면 뭘 하면 좋을까요?",
            )
          }
          className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          새봄에게 물어보기
        </button>
        <button
          onClick={onOpenSimulator}
          className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50"
        >
          목돈 배분 조정하기
        </button>
      </div>

      <p className="text-[11px] leading-relaxed text-gray-400">
        곡선은 지금 수입·지출이 그대로 이어진다고 가정한 계산이에요. 실제와 다를 수 있으니 참고용으로만
        봐주세요.
      </p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const color = tone === "bad" ? "text-rose-600" : tone === "good" ? "text-emerald-700" : "text-gray-800";
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-3">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className={`text-sm font-bold ${color}`}>{value}</div>
    </div>
  );
}
