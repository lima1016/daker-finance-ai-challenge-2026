"use client";

// 자립 준비도 — readiness.ts가 계산한 5축 점수를 막대로만 보여준다.
// 점수는 AI가 매기지 않는다. AI는 아래 코칭 한 줄만 담당한다.
import { readinessGrade, type AxisKey, type Readiness } from "@/lib/readiness";
import { ieyo } from "@/lib/josa";
import { TrustBadge } from "../TrustBadge";
import { SectionTitle, Card } from "./Section";

const AXIS_ORDER: AxisKey[] = ["housing", "income", "spending", "emergency", "benefits"];

// 등급도 두 색만 쓴다. 중간은 색 없이 회색 — 눈이 빨간 곳으로 먼저 가야 한다.
const GRADE_STYLE = {
  good: "bg-brand-bg text-brand",
  warn: "bg-ground text-ink2",
  danger: "bg-alert-bg text-alert",
} as const;

interface Coach {
  advice: string;
  nextStep: string;
  prompt: string;
}

export function ReadinessCard({
  readiness,
  coach,
  onAsk,
}: {
  readiness: Readiness;
  coach: Coach | null;
  onAsk: (text: string) => void;
}) {
  const grade = readinessGrade(readiness.score);
  const axes = AXIS_ORDER.map((k) => readiness.axes.find((a) => a.key === k)).filter(
    (a): a is NonNullable<typeof a> => Boolean(a),
  );
  const weakestLabel = readiness.weakest.label;

  return (
    <section>
      <SectionTitle right={<TrustBadge kind="calc" text="규칙 채점" />}>자립 준비도</SectionTitle>

      <Card>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1 tabular-nums">
            <span className="text-[44px] font-extrabold leading-none tracking-[-0.04em] text-ink">
              {readiness.score}
            </span>
            <span className="text-[15px] font-bold text-ink3">/ 100</span>
          </div>
          <span
            className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${GRADE_STYLE[grade.tone]}`}
          >
            {grade.label}
          </span>
        </div>

        <p className="mt-3 text-[13px] leading-snug text-ink2">
          가장 먼저 챙길 항목은 <b className="font-bold text-ink">{weakestLabel}</b>
          {ieyo(weakestLabel).slice(weakestLabel.length)}
        </p>

        <div className="mt-5 flex flex-col gap-3">
          {axes.map((a) => {
            const low = a.value < 45;
            return (
              <div key={a.key} className="flex items-center gap-3" title={a.hint}>
                <span className="w-[56px] shrink-0 text-[12px] font-medium text-ink2">
                  {a.label}
                </span>
                <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-ground">
                  {/* 0점도 흔적은 남겨야 '아직 안 채워진 항목'으로 읽힌다 */}
                  <span
                    className={`block h-full rounded-full ${low ? "bg-alert" : "bg-brand"}`}
                    style={{ width: `${Math.max(a.value, 3)}%` }}
                  />
                </span>
                <span
                  className={`w-[24px] shrink-0 text-right text-[12px] font-bold tabular-nums ${
                    low ? "text-alert" : "text-ink2"
                  }`}
                >
                  {a.value}
                </span>
              </div>
            );
          })}
        </div>

        {coach?.advice && (
          <p className="mt-5 rounded-2xl bg-ground px-4 py-3 text-[13px] leading-relaxed text-ink2">
            {coach.advice}
          </p>
        )}

        <button
          onClick={() =>
            onAsk(
              coach?.prompt ||
                `제 자립 준비도에서 ${weakestLabel} 점수가 낮게 나왔어요. 어떻게 올릴 수 있을까요?`,
            )
          }
          className="mt-4 w-full rounded-2xl bg-ground py-3.5 text-[14px] font-bold text-ink2 transition hover:bg-line"
        >
          {coach?.nextStep || "자세히 보기"}
        </button>
      </Card>
    </section>
  );
}
