"use client";

// "왜 새봄인가요?" — 숫자 3개로만 말한다. 값·출처는 stats.ts가 단일 출처.
import { HEADLINE_STATS, CONTEXT_STATS, STAT_SOURCES } from "@/lib/stats";
import { SectionTitle } from "./Section";

const ROWS = [
  { stat: HEADLINE_STATS[0], prefix: "약 " },
  { stat: HEADLINE_STATS[1], prefix: "" },
  { stat: CONTEXT_STATS[0], prefix: "" },
];

export function WhyCard() {
  return (
    <section>
      <SectionTitle>왜 새봄인가요?</SectionTitle>

      <div className="grid gap-3 sm:grid-cols-3">
        {ROWS.map(({ stat, prefix }) => (
          <div key={stat.label} className="rounded-[20px] bg-white p-5">
            <div className="text-[26px] font-extrabold leading-none tracking-[-0.03em] text-brand">
              {prefix}
              {stat.value}
            </div>
            <div className="mt-2.5 text-[13px] font-bold leading-snug text-ink">{stat.label}</div>
            {stat.detail && (
              <div className="mt-1 text-[12px] leading-snug text-ink3">{stat.detail}</div>
            )}
          </div>
        ))}
      </div>

      <p className="mt-3 px-1 text-[11px] leading-relaxed text-ink3">
        출처:{" "}
        {STAT_SOURCES.map((s, i) => (
          <span key={s.name}>
            {i > 0 && " · "}
            <a href={s.url} target="_blank" rel="noreferrer" className="underline hover:text-ink2">
              {s.name}
            </a>
          </span>
        ))}
      </p>
    </section>
  );
}
