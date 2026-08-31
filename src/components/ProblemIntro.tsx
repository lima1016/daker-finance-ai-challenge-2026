"use client";

// 앱을 처음 여는 사람이 보는 화면.
//
// "이 앱이 왜 필요한가"를 먼저 말하지 않으면, 자립준비청년이라는 말 자체가 낯선
// 사람에게는 그냥 또 하나의 가계부로 보인다. 숫자는 전부 정부·공공 통계다.
import { HEADLINE_STATS, CONTEXT_STATS, STAT_SOURCES } from "@/lib/stats";
import { TrustNote } from "./TrustBadge";

export function ProblemIntro({ onStart, onSample }: { onStart: () => void; onSample: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      {/* 한 문장으로 문제 */}
      <div className="rounded-[20px] bg-gradient-to-b from-brand-bg to-white p-5">
        <p className="text-[11px] font-semibold tracking-wide text-brand">자립준비청년</p>
        <h2 className="mt-1 text-[22px] font-bold leading-snug text-ink">
          열여덟에 홀로 서면서
          <br />
          <b className="text-brand">1,000만원</b>을 처음 손에 쥡니다.
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink2">
          어떻게 나눠 써야 하는지, 어떤 지원을 신청할 수 있는지,
          <br />이 문자가 사기인지 — <b className="text-ink">물어볼 어른이 없습니다.</b>
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {HEADLINE_STATS.map((s) => (
            <div key={s.label} className="rounded-[20px] bg-white/80 p-2.5">
              <div className="text-[17px] font-bold leading-tight text-brand">{s.value}</div>
              <div className="mt-0.5 text-[11px] font-medium leading-snug text-ink2">{s.label}</div>
              {s.detail && (
                <div className="mt-0.5 text-[10px] leading-snug text-ink3">{s.detail}</div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={onStart}
            className="rounded-2xl bg-brand px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-brand"
          >
            내 정보로 시작하기
          </button>
          <button
            onClick={onSample}
            className="rounded-[20px] bg-white px-4 py-2.5 text-[13px] font-medium text-brand transition hover:bg-brand-bg"
          >
            예시 데이터로 저장
          </button>
        </div>
      </div>

      {/* 이 앱의 원칙 — 금융권 심사에서 가장 먼저 묻는 부분 */}
      <TrustNote />

      {/* 보조 수치 */}
      <div className="grid gap-2 sm:grid-cols-3">
        {CONTEXT_STATS.map((s) => (
          <div key={s.label} className="rounded-[20px] bg-white p-3">
            <div className="text-[13px] font-bold text-ink">{s.value}</div>
            <div className="mt-0.5 text-[11px] font-medium text-ink2">{s.label}</div>
            {s.detail && <div className="mt-0.5 text-[10px] leading-snug text-ink3">{s.detail}</div>}
          </div>
        ))}
      </div>

      <p className="text-[10px] leading-relaxed text-ink3">
        출처:{" "}
        {STAT_SOURCES.map((s, i) => (
          <span key={s.name}>
            {i > 0 && " · "}
            <a href={s.url} target="_blank" rel="noreferrer" className="underline hover:text-ink2">
              {s.name}
            </a>
            {s.note ? ` (${s.note})` : ""}
          </span>
        ))}
      </p>
    </div>
  );
}

/** 예시 데이터를 보고 있다는 걸 계속 알려주는 띠 */
export function PreviewBanner({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[20px] bg-white px-4 py-3">
      <span className="h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden />
      <p className="min-w-0 flex-1 text-[12px] font-medium leading-snug text-ink3">
        아래는 <b className="font-bold text-ink">김새봄님(예시)</b>의 화면이에요. 실제로 어떻게
        보이는지 그대로 둘러보세요.
      </p>
      <button
        onClick={onStart}
        className="shrink-0 text-[12px] font-bold text-brand transition hover:opacity-70"
      >
        내 정보 넣기 →
      </button>
    </div>
  );
}
