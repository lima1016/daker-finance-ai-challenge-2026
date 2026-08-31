"use client";

// 홈 대시보드 — 카드형 레이아웃.
//
// 이 파일은 '조립'만 한다. 금액·점수·소진 시점은 전부 서버/규칙 계산
// (budget.ts / forecast.ts / readiness.ts / briefing.ts)에서 가져오고,
// AI는 문장(greeting·coach)만 채운다.
import { useEffect, useMemo, useState } from "react";
import { hasEnoughForDashboard, type ProfileStore } from "@/lib/profile";
import { buildBriefing, briefingSignature, type BriefingItem } from "@/lib/briefing";
import type { NavAction } from "@/lib/nav";
import { computeReadiness, type Readiness } from "@/lib/readiness";
import { cachedPost } from "@/lib/requestCache";
import { PreviewBanner } from "./ProblemIntro";
import { TodayCards } from "./home/TodayCards";
import { MoneyStatus } from "./home/MoneyStatus";
import { ToolGrid } from "./home/ToolGrid";
import { ReadinessCard } from "./home/ReadinessCard";
import { WhyCard } from "./home/WhyCard";

/** 홈에 보여줄 "오늘 챙길" 개수 */
const TODAY_COUNT = 3;

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
  /** 아직 내 정보가 없어 예시 데이터를 보여주는 중인지 */
  previewing?: boolean;
  onAsk: (text: string) => void;
  onOpenProfile: () => void;
  onLoadSample: () => void;
  onLoadFromDb: () => void;
  onNavigate: (action: NavAction, prompt?: string) => void;
};

export function Dashboard({
  profile,
  previewing = false,
  onAsk,
  onOpenProfile,
  onLoadSample,
  onLoadFromDb,
  onNavigate,
}: Props) {
  // 예시 데이터도 '채워진' 프로필이므로 대시보드는 그대로 그린다
  const filled = hasEnoughForDashboard(profile);
  const name = profile.status.nickname?.trim();

  // 브리핑을 실제로 좌우하는 값만 키로 쓴다 (닉네임·거주 지역 제외)
  const profileKey = useMemo(() => briefingSignature(profile), [profile]);
  const [ai, setAi] = useState<AiBriefing | null>(null);
  // 프로필이 바뀌면 예전 브리핑은 자동으로 무시된다
  const fresh = ai?.key === profileKey ? ai : null;

  // AI 응답 전(그리고 실패했을 때)에도 화면이 비지 않게 규칙 기반 결과를 깔아둔다.
  // AI가 몇 개를 줄지는 보장되지 않으므로, 모자라면 규칙 기반으로 채워 개수를 고정한다 —
  // 큰 제목이 "3가지를 발견했어요"인데 카드가 2장이면 앞뒤가 안 맞는다.
  const aiItems = fresh?.items ?? null;
  const items = useMemo(() => {
    if (!filled) return [];
    const rules = buildBriefing(profile);
    const base = aiItems?.length ? aiItems : rules;
    if (base.length >= TODAY_COUNT) return base.slice(0, TODAY_COUNT);
    const extra = rules.filter((r) => !base.some((b) => b.title === r.title));
    return [...base, ...extra].slice(0, TODAY_COUNT);
  }, [filled, profile, aiItems]);
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

  const count = items.length;

  return (
    <div className="flex flex-col gap-6">
      {previewing && <PreviewBanner onStart={onOpenProfile} />}

      {/* 헤더 */}
      <header className="flex flex-wrap items-start justify-between gap-4 px-1 pt-1">
        <div className="min-w-0">
          <h1 className="text-[26px] font-extrabold leading-[1.3] tracking-[-0.03em] text-ink md:text-[30px]">
            {count > 0 ? (
              <>
                새봄이 오늘 {name ? `${name}님을` : "당신을"} 위해
                <br />
                <span className="text-brand">{count}가지</span>를 발견했어요
              </>
            ) : (
              <>{name ? `${name}님, 안녕하세요` : "안녕하세요"}</>
            )}
          </h1>
          <p className="mt-2.5 flex items-center gap-2 text-[14px] leading-relaxed text-ink3">
            {greeting || "지금 상황을 바탕으로 꼭 챙겨야 할 것만 먼저 알려드려요."}
            {loading && (
              <span className="inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-line border-t-ink3" />
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <a
            href="/verify"
            title="AI가 금액을 만들지 못하도록 막았는지 측정한 결과"
            className="hidden items-center gap-1 rounded-full bg-white px-4 py-2.5 text-[13px] font-bold text-ink2 transition hover:bg-line/60 sm:flex"
          >
            AI 신뢰성 검증 <span aria-hidden>›</span>
          </a>
          {/* 아직 내 정보가 없을 때만 — 예시를 실제로 저장해 두고 둘러볼 수 있게 */}
          {previewing && (
            <button
              onClick={onLoadSample}
              className="rounded-full bg-white px-4 py-2.5 text-[13px] font-bold text-ink2 transition hover:bg-line/60"
            >
              예시로 둘러보기
            </button>
          )}
          <button
            onClick={onOpenProfile}
            className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-bold text-white transition hover:opacity-90"
          >
            내 정보로 시작하기
          </button>
        </div>
      </header>

      {!filled ? (
        <div className="rounded-[20px] bg-white p-5">
          <div className="text-[17px] font-bold text-ink">내 정보를 알려주세요</div>
          <div className="mt-1.5 text-[13px] leading-relaxed text-ink3">
            보호종료일·정착금·잔액을 입력하면, 새봄이 자립 준비도·현금흐름을 계산해 딱 맞는 브리핑을
            챙겨드려요.
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              onClick={onOpenProfile}
              className="rounded-full bg-ink px-4 py-2.5 text-[13px] font-bold text-white"
            >
              내 정보 입력하기
            </button>
            <button onClick={onLoadFromDb} className="text-[13px] font-semibold text-ink3 underline">
              DB에서 불러오기
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          {/* 가장 먼저 봐야 할 것 — 전체 폭 */}
          <TodayCards items={items} onNavigate={onNavigate} />

          {/* 왼쪽(내 상태 + 도구)과 오른쪽(준비도)의 높이가 맞도록 묶는다 */}
          <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-w-0 flex-col gap-7">
              <MoneyStatus profile={profile} onNavigate={onNavigate} />
              <ToolGrid onNavigate={onNavigate} />
            </div>
            {readiness && <ReadinessCard readiness={readiness} coach={coach} onAsk={onAsk} />}
          </div>

          <WhyCard />
        </div>
      )}
    </div>
  );
}
