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
      <div className="rounded-3xl bg-gradient-to-b from-emerald-50 to-emerald-50/30 p-5">
        <p className="text-[11px] font-semibold tracking-wide text-emerald-700">자립준비청년</p>
        <h2 className="mt-1 text-[22px] font-bold leading-snug text-gray-900">
          열여덟에 홀로 서면서
          <br />
          <b className="text-emerald-700">1,000만원</b>을 처음 손에 쥡니다.
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
          어떻게 나눠 써야 하는지, 어떤 지원을 신청할 수 있는지,
          <br />이 문자가 사기인지 — <b className="text-gray-800">물어볼 어른이 없습니다.</b>
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {HEADLINE_STATS.map((s) => (
            <div key={s.label} className="rounded-2xl bg-white/80 p-2.5">
              <div className="text-[17px] font-bold leading-tight text-emerald-800">{s.value}</div>
              <div className="mt-0.5 text-[10.5px] font-medium leading-snug text-gray-700">{s.label}</div>
              {s.detail && (
                <div className="mt-0.5 text-[9.5px] leading-snug text-gray-400">{s.detail}</div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={onStart}
            className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            내 정보로 시작하기
          </button>
          <button
            onClick={onSample}
            className="rounded-2xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
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
          <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-3">
            <div className="text-sm font-bold text-gray-800">{s.value}</div>
            <div className="mt-0.5 text-[11px] font-medium text-gray-600">{s.label}</div>
            {s.detail && <div className="mt-0.5 text-[10px] leading-snug text-gray-400">{s.detail}</div>}
          </div>
        ))}
      </div>

      <p className="text-[10px] leading-relaxed text-gray-400">
        출처:{" "}
        {STAT_SOURCES.map((s, i) => (
          <span key={s.name}>
            {i > 0 && " · "}
            <a href={s.url} target="_blank" rel="noreferrer" className="underline hover:text-gray-600">
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
    <div className="sticky top-0 z-10 -mx-1 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50/95 px-3 py-2 backdrop-blur">
      <span aria-hidden>👀</span>
      <p className="min-w-0 flex-1 text-[11.5px] leading-snug text-amber-900">
        아래는 <b>김새봄님(예시)</b>의 화면이에요. 실제로 어떻게 보이는지 그대로 둘러보세요.
      </p>
      <button
        onClick={onStart}
        className="shrink-0 rounded-full bg-amber-600 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-amber-700"
      >
        내 정보 넣기
      </button>
    </div>
  );
}
