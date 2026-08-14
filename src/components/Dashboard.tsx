"use client";

import { useEffect, useMemo, useState } from "react";
import { computeDday, hasProfile, type ProfileStore } from "@/lib/profile";
import { formatMan } from "@/lib/cards";
import { buildBriefing, type BriefingAction, type BriefingItem } from "@/lib/briefing";
import { computeReadiness, readinessGrade, type Readiness } from "@/lib/readiness";
import { buildForecast, depletionLabel } from "@/lib/forecast";
import { cachedPost } from "@/lib/requestCache";
import { RadarChart } from "./charts";

const FEATURES = [
  {
    icon: "📉",
    tint: "bg-emerald-50 text-emerald-700",
    title: "현금흐름 예측",
    action: "forecast" as const,
    ask: "",
  },
  { icon: "💰", tint: "bg-amber-50 text-amber-700", title: "배분 시뮬레이터", action: "simulator" as const, ask: "" },
  { icon: "🛡️", tint: "bg-rose-50 text-rose-700", title: "위험 스캐너", action: "scanner" as const, ask: "" },
  {
    icon: "🏠",
    tint: "bg-sky-50 text-sky-700",
    title: "지원제도 찾기",
    action: "chat" as const,
    ask: "제가 지금 받을 수 있는 지원제도를 우선순위로 정리해 주세요.",
  },
];

const TONE = {
  info: { icon: "💡", ring: "border-emerald-100", chip: "bg-emerald-100 text-emerald-700" },
  warn: { icon: "⏰", ring: "border-amber-100", chip: "bg-amber-100 text-amber-700" },
  danger: { icon: "⚠️", ring: "border-rose-100", chip: "bg-rose-100 text-rose-700" },
} as const;

const GRADE_COLOR = {
  good: "text-emerald-700",
  warn: "text-amber-700",
  danger: "text-rose-700",
} as const;

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-3.5 ${accent ? "bg-emerald-50" : "border border-gray-100 bg-white"}`}>
      <div className={`text-[11px] ${accent ? "text-emerald-600" : "text-gray-500"}`}>{label}</div>
      <div className={`text-lg font-bold ${accent ? "text-emerald-800" : "text-gray-800"}`}>{value}</div>
    </div>
  );
}

interface Coach {
  advice: string;
  nextStep: string;
  prompt: string;
}

/** /api/briefing 응답 */
interface BriefingResponse {
  greeting?: string;
  items?: BriefingItem[];
  readiness?: Readiness;
  coach?: Coach;
}

/** 화면이 들고 있는 상태. null 필드는 "규칙 기반 값을 그대로 쓴다"는 뜻 */
interface AiBriefing {
  key: string;
  greeting: string;
  items: BriefingItem[] | null;
  readiness: Readiness | null;
  coach: Coach | null;
}

type Props = {
  profile: ProfileStore;
  onAsk: (text: string) => void;
  onOpenProfile: () => void;
  onLoadSample: () => void;
  onLoadFromDb: () => void;
  onNavigate: (action: BriefingAction, prompt?: string) => void;
};

export function Dashboard({
  profile,
  onAsk,
  onOpenProfile,
  onLoadSample,
  onLoadFromDb,
  onNavigate,
}: Props) {
  const s = profile.status;
  const f = profile.finance;
  const dday = s.endDate ? computeDday(s.endDate) : null;
  const net = s.income != null && s.expense != null ? s.income - s.expense : null;
  const filled = hasProfile(profile);
  const name = s.nickname?.trim();

  const profileKey = useMemo(() => JSON.stringify(profile), [profile]);
  const [ai, setAi] = useState<AiBriefing | null>(null);
  // 프로필이 바뀌면 예전 브리핑은 자동으로 무시된다
  const fresh = ai?.key === profileKey ? ai : null;

  // AI 응답 전(그리고 실패했을 때)에도 화면이 비지 않게 규칙 기반 결과를 깔아둔다
  const items = fresh?.items ?? (filled ? buildBriefing(profile) : []);
  const readiness = fresh?.readiness ?? (filled ? computeReadiness(profile) : null);
  const greeting = fresh?.greeting ?? "";
  const coach = fresh?.coach ?? null;
  const loading = filled && !fresh;

  // 홈에 들어오면 새봄이 먼저 오늘 챙길 것을 정리해 둔다 (질문을 기다리지 않음).
  // 프로필이 그대로면 캐시된 응답을 쓰므로, 홈에 다시 와도 재요청하지 않는다.
  useEffect(() => {
    if (!filled) return;
    let cancelled = false;

    cachedPost<BriefingResponse>(`briefing:${profileKey}`, "/api/briefing", { profile })
      .then((json) => {
        if (cancelled) return;
        setAi({
          key: profileKey,
          greeting: typeof json?.greeting === "string" ? json.greeting : "",
          items: json?.items?.length ? json.items : null,
          readiness: json?.readiness ?? null,
          coach: json?.coach ?? null,
        });
      })
      .catch(() => {
        if (cancelled) return;
        // 규칙 기반 결과로 계속 간다 — 로딩 표시만 끈다
        setAi({ key: profileKey, greeting: "", items: null, readiness: null, coach: null });
      });

    return () => {
      cancelled = true;
    };
  }, [profile, profileKey, filled]);

  const forecast = filled ? buildForecast(profile, []) : null;
  const depletion =
    forecast?.ready ? depletionLabel(forecast.series[0].depletionMonth) : null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div className="pt-1">
        <h2 className="text-xl font-bold text-gray-800">
          {name ? `${name}님, 안녕하세요` : "안녕하세요"}
        </h2>
        <p className="text-sm text-gray-500">{greeting || "오늘도 새봄이 곁에서 도와드릴게요."}</p>
      </div>

      {!filled ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-bold text-emerald-800">내 정보를 알려주세요</div>
          <div className="mt-1 text-xs leading-relaxed text-emerald-700">
            보호종료일·정착금·잔액을 입력하면, 새봄이 자립 준비도·현금흐름을 계산해 딱 맞는 브리핑을
            챙겨드려요.
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              onClick={onOpenProfile}
              className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white"
            >
              내 정보 입력하기 →
            </button>
            <button onClick={onLoadSample} className="text-xs text-emerald-700 underline">
              샘플로 둘러보기
            </button>
            <button onClick={onLoadFromDb} className="text-xs text-emerald-700 underline">
              DB에서 불러오기
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 자립 준비도 */}
          {readiness && <ReadinessPanel readiness={readiness} coach={coach} onAsk={onAsk} />}

          {/* 오늘의 브리핑 */}
          <div className="rounded-3xl bg-emerald-50 p-4">
            <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
              ✨ 새봄이 오늘 챙긴 {items.length}가지
              {loading && (
                <span className="ml-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              {items.map((item, i) => {
                const t = TONE[item.tone] ?? TONE.info;
                return (
                  <button
                    key={`${item.title}-${i}`}
                    onClick={() => onNavigate(item.action, item.prompt)}
                    className={`flex items-center gap-3 rounded-2xl border ${t.ring} bg-white p-3 text-left transition hover:bg-gray-50`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base ${t.chip}`}
                      aria-hidden
                    >
                      {t.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium leading-tight text-gray-800">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-gray-500">{item.desc}</span>
                    </span>
                    <span className="text-gray-300" aria-hidden>
                      ›
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Stat label="보호종료" value={dday?.label || "—"} accent />
            <Stat label="현재 잔액" value={f.balance != null ? formatMan(f.balance) : "—"} accent />
            <Stat label="정착금" value={f.settlement != null ? formatMan(f.settlement) : "—"} />
            <Stat
              label="월 수지"
              value={net == null ? "—" : `${net >= 0 ? "+" : "−"}${formatMan(Math.abs(net))}`}
            />
          </div>

          {depletion && (
            <button
              onClick={() => onNavigate("forecast")}
              className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-white p-3 text-left transition hover:bg-rose-50/40"
            >
              <span className="text-lg" aria-hidden>
                📉
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-gray-800">
                  지금 흐름이면 <b className="text-rose-600">{depletion}</b>에 잔액이 바닥나요
                </span>
                <span className="text-[11px] text-gray-500">무엇을 바꾸면 달라지는지 그래프로 보기</span>
              </span>
              <span className="text-gray-300" aria-hidden>
                ›
              </span>
            </button>
          )}
        </>
      )}

      <div>
        <div className="mb-2 text-sm font-bold text-gray-700">바로 쓰기</div>
        <div className="grid grid-cols-2 gap-2.5">
          {FEATURES.map((ft) => (
            <button
              key={ft.title}
              onClick={() => onNavigate(ft.action, ft.ask)}
              className="flex flex-col items-start gap-1 rounded-2xl border border-gray-100 bg-white p-3.5 text-left shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/40"
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg ${ft.tint}`} aria-hidden>
                {ft.icon}
              </span>
              <span className="mt-1 text-sm font-semibold text-gray-800">{ft.title}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="text-center text-[11px] text-gray-400">
        아래 입력창에 무엇이든 편하게 물어보세요. 익명이에요.
      </p>
    </div>
  );
}

function ReadinessPanel({
  readiness,
  coach,
  onAsk,
}: {
  readiness: Readiness;
  coach: Coach | null;
  onAsk: (text: string) => void;
}) {
  const grade = readinessGrade(readiness.score);

  return (
    <div className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-32 shrink-0 sm:w-36">
          <RadarChart axes={readiness.axes} score={readiness.score} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold text-gray-500">자립 준비도</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-emerald-800">{readiness.score}</span>
            <span className="text-sm text-gray-400">/ 100</span>
          </div>
          <div className={`text-xs font-medium ${GRADE_COLOR[grade.tone]}`}>{grade.label}</div>
          <p className="mt-2 text-[11px] leading-snug text-gray-500">
            가장 약한 곳은 <b className="text-gray-700">{readiness.weakest.label}</b>
            <span className="block">{readiness.weakest.hint}</span>
          </p>
        </div>
      </div>

      {coach && (
        <div className="mt-3 rounded-2xl bg-emerald-50 p-3">
          <p className="text-[12px] leading-relaxed text-emerald-900">✨ {coach.advice}</p>
          {coach.nextStep && (
            <button
              onClick={() => onAsk(coach.prompt || coach.nextStep)}
              className="mt-2 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-emerald-700"
            >
              {coach.nextStep} →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
