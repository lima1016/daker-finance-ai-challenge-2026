"use client";

// "내 금융 상태" — 큰 숫자 3개.
// 모든 값은 forecast.ts / 프로필에서 그대로 가져온다 (AI가 만들지 않는다).
import { formatMan } from "@/lib/cards";
import { FORECAST_MONTHS, buildForecast, depletionLabel } from "@/lib/forecast";
import type { ProfileStore } from "@/lib/profile";
import type { BriefingAction } from "@/lib/briefing";
import { TrustBadge } from "../TrustBadge";
import { Icon } from "../Icon";
import { SectionTitle, Card } from "./Section";

function Stat({
  label,
  value,
  unit,
  alert = false,
  note,
}: {
  label: string;
  value: string;
  unit?: string;
  alert?: boolean;
  note?: string;
}) {
  return (
    <div>
      <div className="text-[13px] font-medium text-ink3">{label}</div>
      <div
        className={`mt-2 flex items-baseline gap-0.5 whitespace-nowrap tabular-nums ${
          alert ? "text-alert" : "text-ink"
        }`}
      >
        <span className="text-[30px] font-extrabold leading-none tracking-[-0.03em]">{value}</span>
        {unit && <span className="text-[15px] font-bold">{unit}</span>}
      </div>
      <div className="mt-1.5 text-[12px] leading-snug text-ink3">{note ?? " "}</div>
    </div>
  );
}

/** "400만원" → ["400", "만원"] 처럼 숫자와 단위를 떼어 큰 글씨로 보여준다 */
function splitAmount(text: string): [string, string] {
  const m = text.match(/^([−+\-\d.,]+)(.*)$/);
  return m ? [m[1], m[2]] : [text, ""];
}

export function MoneyStatus({
  profile,
  onNavigate,
}: {
  profile: ProfileStore;
  onNavigate: (action: BriefingAction, prompt?: string) => void;
}) {
  const forecast = buildForecast(profile, []);
  const base = forecast.series[0];
  const depletion = forecast.ready ? depletionLabel(base.depletionMonth) : null;

  const balance = profile.finance.balance ?? profile.finance.settlement ?? null;
  const [balanceNum, balanceUnit] = balance != null ? splitAmount(formatMan(balance)) : ["—", ""];

  const net = forecast.ready ? forecast.baseNet : null;
  const short = net != null && net < 0;
  const [netNum, netUnit] = net != null ? splitAmount(formatMan(Math.abs(net))) : ["—", ""];

  // depletionMonth는 잔액이 처음 음수가 되는 달 → 버티는 기간은 그 직전까지
  const survive = !forecast.ready
    ? "—"
    : base.depletionMonth == null
      ? `${FORECAST_MONTHS}+`
      : String(Math.max(0, base.depletionMonth - 1));

  return (
    <section>
      <SectionTitle right={<TrustBadge kind="calc" text="앱이 계산" />}>내 금융 상태</SectionTitle>

      <Card className="p-0">
        <div className="grid grid-cols-3 gap-4 p-5">
          <Stat label="현재 잔액" value={balanceNum} unit={balanceUnit} />
          <Stat
            label={short ? "매달 모자란 돈" : "매달 남는 돈"}
            value={netNum}
            unit={netUnit}
            alert={short}
            note="수입 + 수당 − 지출"
          />
          <Stat
            label="버티는 기간"
            value={survive}
            unit={survive === "—" ? "" : "개월"}
            note={survive === `${FORECAST_MONTHS}+` ? "2년은 괜찮아요" : undefined}
          />
        </div>

        <button
          onClick={() => onNavigate("forecast")}
          className="flex w-full items-center gap-2.5 border-t border-line px-5 py-4 text-left transition hover:bg-ground/60"
        >
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              depletion ? "bg-alert-bg text-alert" : "bg-brand-bg text-brand"
            }`}
          >
            <Icon name="forecast" className="h-4 w-4" strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1 text-[14px] font-semibold leading-snug text-ink2">
            {depletion ? (
              <>
                지금 흐름이면 <b className="text-alert">{depletion}</b>에 잔액이 바닥나요
              </>
            ) : forecast.ready ? (
              "지금 흐름이면 2년 안에 잔액이 바닥나지 않아요"
            ) : (
              `예측하려면 ${forecast.missing.join("·")} 정보가 필요해요`
            )}
          </span>
          <span className="shrink-0 text-[17px] leading-none text-ink3" aria-hidden>
            ›
          </span>
        </button>
      </Card>
    </section>
  );
}
