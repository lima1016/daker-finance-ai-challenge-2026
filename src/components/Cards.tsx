"use client";

import {
  formatMan,
  type BudgetCard as BudgetCardT,
  type Card,
  type ForecastCard as ForecastCardT,
  type RadarCard as RadarCardT,
  type RiskCard as RiskCardT,
  type ScanCard as ScanCardT,
  type TimelineCard as TimelineCardT,
} from "@/lib/cards";
import { depletionLabel } from "@/lib/forecast";
import { BalanceChart, RadarChart, RiskGauge, SERIES_COLORS } from "./charts";

const Shell = ({
  label,
  right,
  tone = "border-gray-100",
  children,
}: {
  label?: string;
  right?: React.ReactNode;
  tone?: string;
  children: React.ReactNode;
}) => (
  <div className={`my-2 rounded-xl border ${tone} bg-white p-3 shadow-sm`}>
    {(label || right) && (
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-gray-500">{label}</span>
        {right}
      </div>
    )}
    {children}
  </div>
);

function BudgetCard({ card }: { card: BudgetCardT }) {
  const total = card.total || card.items.reduce((s, it) => s + it.amount, 0);
  return (
    <Shell
      label="목돈 배분"
      tone="border-emerald-100"
      right={<span className="text-sm font-bold text-emerald-700">총 {formatMan(total)}</span>}
    >
      <div className="flex flex-col gap-2">
        {card.items.map((it, idx) => {
          const pct = total > 0 ? Math.round((it.amount / total) * 100) : 0;
          return (
            <div key={idx}>
              <div className="mb-0.5 flex items-baseline justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-gray-800">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: SERIES_COLORS[idx % SERIES_COLORS.length] }}
                  />
                  {it.label}
                </span>
                <span className="text-gray-500">
                  {formatMan(it.amount)} · {pct}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: SERIES_COLORS[idx % SERIES_COLORS.length] }}
                />
              </div>
              {it.desc && <p className="mt-0.5 text-[11px] text-gray-400">{it.desc}</p>}
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

function TimelineCard({ card }: { card: TimelineCardT }) {
  return (
    <Shell label={card.title || "할 일 순서"} tone="border-sky-100">
      <ol className="relative flex flex-col gap-3 border-l border-sky-200 pl-4">
        {card.steps.map((s, idx) => (
          <li key={idx} className="relative">
            <span
              className={`absolute -left-[21px] top-0.5 h-3 w-3 rounded-full border-2 ${
                s.done ? "border-emerald-500 bg-emerald-500" : "border-sky-400 bg-white"
              }`}
            />
            <div className="text-[11px] font-semibold text-sky-700">{s.when}</div>
            <div className="text-sm font-medium text-gray-800">{s.title}</div>
            {s.desc && <div className="text-xs text-gray-500">{s.desc}</div>}
          </li>
        ))}
      </ol>
    </Shell>
  );
}

const RISK_STYLE = {
  danger: { emoji: "🔴", ring: "border-rose-200", head: "text-rose-700", chip: "bg-rose-50" },
  warning: { emoji: "🟡", ring: "border-amber-200", head: "text-amber-700", chip: "bg-amber-50" },
  safe: { emoji: "🟢", ring: "border-emerald-200", head: "text-emerald-700", chip: "bg-emerald-50" },
} as const;

function RiskCard({ card }: { card: RiskCardT }) {
  const st = RISK_STYLE[card.level] ?? RISK_STYLE.warning;
  return (
    <div className={`my-2 rounded-xl border ${st.ring} bg-white p-3 shadow-sm`}>
      <div className={`flex items-center gap-2 text-sm font-bold ${st.head}`}>
        <span className="text-lg" aria-hidden>
          {st.emoji}
        </span>
        <span>{card.title}</span>
      </div>
      {!!card.reasons?.length && (
        <div className="mt-2">
          <div className="text-[11px] font-semibold text-gray-500">왜 위험한가요</div>
          <ul className="mt-1 flex flex-col gap-1">
            {card.reasons.map((r, i) => (
              <li key={i} className="text-xs text-gray-700">
                • {r}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!!card.actions?.length && (
        <div className={`mt-2 rounded-lg ${st.chip} p-2`}>
          <div className="text-[11px] font-semibold text-gray-600">지금 할 일</div>
          <ul className="mt-1 flex flex-col gap-1">
            {card.actions.map((a, i) => (
              <li key={i} className="text-xs font-medium text-gray-800">
                ✓ {a}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ForecastCard({ card }: { card: ForecastCardT }) {
  const base = card.series[0];
  const when = depletionLabel(base?.depletionMonth ?? null);

  return (
    <Shell label={card.title || "앞으로의 잔액"} tone="border-emerald-100">
      <div className="mb-2 text-sm">
        {when ? (
          <span className="text-gray-800">
            지금 이대로면 <b className="text-rose-600">{when}</b>에 잔액이 바닥나요
            <span className="text-gray-400"> (약 {base.depletionMonth}개월 뒤)</span>
          </span>
        ) : (
          <span className="text-gray-800">
            지금 이대로면 <b className="text-emerald-700">{card.labels.length - 1}개월 안에는</b> 잔액이
            바닥나지 않아요
          </span>
        )}
      </div>

      <BalanceChart labels={card.labels} series={card.series} />

      {card.series.length > 1 && (
        <ul className="mt-2 flex flex-col gap-1.5 border-t border-gray-100 pt-2">
          {card.series.slice(1).map((s, i) => {
            const w = depletionLabel(s.depletionMonth);
            return (
              <li key={s.label} className="flex gap-2 text-[11px] leading-snug">
                <span
                  className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: SERIES_COLORS[(i + 1) % SERIES_COLORS.length] }}
                />
                <span className="min-w-0 text-gray-600">
                  <b className="text-gray-800">{s.label}</b>
                  {s.why ? ` — ${s.why}` : ""}
                  <span className="text-gray-400">
                    {" "}
                    ({w ? `${w}에 소진` : "24개월 내 소진 안 함"})
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {card.insight && (
        <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-[12px] leading-relaxed text-emerald-900">
          ✨ {card.insight}
        </p>
      )}
    </Shell>
  );
}

export function RadarCardView({ card }: { card: RadarCardT }) {
  return (
    <Shell
      label={card.title || "자립 준비도"}
      tone="border-emerald-100"
      right={
        <span className="text-sm font-bold text-emerald-700">
          {card.score}
          <span className="text-xs font-normal text-gray-400">/100</span>
        </span>
      }
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="mx-auto w-44 shrink-0 sm:mx-0">
          <RadarChart axes={card.axes} score={card.score} />
        </div>
        <ul className="flex min-w-0 flex-1 flex-col gap-1">
          {card.axes.map((a) => (
            <li key={a.label} className="text-[11px] leading-snug">
              <span className="font-medium text-gray-700">{a.label}</span>
              <span className="ml-1 text-gray-400">{a.value}점</span>
              {a.hint && <span className="block text-gray-500">{a.hint}</span>}
            </li>
          ))}
        </ul>
      </div>
      {card.advice && (
        <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-[12px] leading-relaxed text-emerald-900">
          ✨ {card.advice}
        </p>
      )}
    </Shell>
  );
}

/** 원문 위에 위험 문구를 색칠한다 */
function Highlighted({ text, spans }: { text: string; spans: ScanCardT["spans"] }) {
  const marks: { start: number; end: number; level: "danger" | "warning"; why: string }[] = [];
  for (const s of spans) {
    const start = text.indexOf(s.text);
    if (start === -1) continue;
    const end = start + s.text.length;
    if (marks.some((m) => start < m.end && end > m.start)) continue; // 겹치면 건너뛴다
    marks.push({ start, end, level: s.level, why: s.why });
  }
  marks.sort((a, b) => a.start - b.start);

  const out: React.ReactNode[] = [];
  let cursor = 0;
  marks.forEach((m, i) => {
    if (m.start > cursor) out.push(<span key={`t${i}`}>{text.slice(cursor, m.start)}</span>);
    out.push(
      <mark
        key={`m${i}`}
        title={m.why}
        className={`rounded px-0.5 ${
          m.level === "danger"
            ? "bg-rose-100 text-rose-900 decoration-rose-400"
            : "bg-amber-100 text-amber-900 decoration-amber-400"
        } underline decoration-wavy underline-offset-2`}
      >
        {text.slice(m.start, m.end)}
      </mark>,
    );
    cursor = m.end;
  });
  if (cursor < text.length) out.push(<span key="tail">{text.slice(cursor)}</span>);

  return <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-gray-700">{out}</p>;
}

export function ScanCardView({ card }: { card: ScanCardT }) {
  const st = RISK_STYLE[card.level] ?? RISK_STYLE.warning;
  return (
    <div className={`flex flex-col gap-3 rounded-2xl border ${st.ring} bg-white p-4 shadow-sm`}>
      <div>
        <div className={`text-base font-bold ${st.head}`}>{card.title}</div>
        <RiskGauge className="mt-2" score={card.score} level={card.level} />
      </div>

      {card.text && (
        <div className="rounded-xl bg-gray-50 p-3">
          <div className="mb-1.5 text-[11px] font-semibold text-gray-500">
            검사한 내용 {card.spans.length > 0 && <span className="text-rose-600">· 색칠된 부분이 위험해요</span>}
          </div>
          <Highlighted text={card.text} spans={card.spans} />
        </div>
      )}

      {!!card.spans.length && (
        <ul className="flex flex-col gap-1.5">
          {card.spans.map((s, i) => (
            <li key={i} className="flex gap-2 text-xs leading-snug">
              <span aria-hidden>{s.level === "danger" ? "🔴" : "🟡"}</span>
              <span className="min-w-0 text-gray-700">
                <b className="text-gray-900">“{s.text}”</b> — {s.why}
              </span>
            </li>
          ))}
        </ul>
      )}

      {!!card.reasons.length && (
        <div>
          <div className="text-[11px] font-semibold text-gray-500">왜 그렇게 봤나요</div>
          <ul className="mt-1 flex flex-col gap-1">
            {card.reasons.map((r, i) => (
              <li key={i} className="text-xs text-gray-700">
                • {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!card.actions.length && (
        <div className={`rounded-lg ${st.chip} p-2.5`}>
          <div className="text-[11px] font-semibold text-gray-600">지금 할 일</div>
          <ul className="mt-1 flex flex-col gap-1">
            {card.actions.map((a, i) => (
              <li key={i} className="text-xs font-medium text-gray-800">
                ✓ {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      {card.source && <p className="text-[11px] text-gray-400">근거: {card.source}</p>}
    </div>
  );
}

/** 카드 하나를 종류에 맞게 렌더링 */
export function CardView({ card }: { card: Card }) {
  switch (card.type) {
    case "budget":
      return <BudgetCard card={card} />;
    case "timeline":
      return <TimelineCard card={card} />;
    case "risk":
      return <RiskCard card={card} />;
    case "forecast":
      return <ForecastCard card={card} />;
    case "radar":
      return <RadarCardView card={card} />;
    case "scan":
      return <ScanCardView card={card} />;
  }
}
