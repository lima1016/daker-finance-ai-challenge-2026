"use client";

// "이 숫자는 누가 만들었나"를 화면에 드러내는 배지.
//
// 이 앱의 핵심 설계는 'AI가 금액을 지어내지 않는다'는 것이다.
// 코드에만 있으면 아무도 모르므로, 숫자 옆에 출처를 붙여 보이게 한다.

type Kind = "calc" | "ai" | "official";

const STYLE: Record<Kind, { icon: string; label: string; className: string; title: string }> = {
  calc: {
    icon: "🧮",
    label: "앱이 계산",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    title: "AI가 아니라 정해진 공식으로 계산한 값이에요. 같은 정보를 넣으면 항상 같은 결과가 나옵니다.",
  },
  ai: {
    icon: "✨",
    label: "AI 해석",
    className: "border-sky-200 bg-sky-50 text-sky-800",
    title: "AI가 쓴 설명이에요. 금액은 만들지 않고, 계산된 값을 해석하고 제안만 합니다.",
  },
  official: {
    icon: "📎",
    label: "공식 자료",
    className: "border-gray-200 bg-gray-50 text-gray-700",
    title: "정부·공공기관 자료에 근거한 내용이에요.",
  },
};

export function TrustBadge({ kind, text }: { kind: Kind; text?: string }) {
  const s = STYLE[kind];
  return (
    <span
      title={s.title}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none ${s.className}`}
    >
      <span aria-hidden>{s.icon}</span>
      {text ?? s.label}
    </span>
  );
}

/** 앱 전체의 원칙을 한 줄로 알리는 띠 */
export function TrustNote({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-start gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 ${className}`}
    >
      <span className="text-base leading-none" aria-hidden>
        🔒
      </span>
      <p className="min-w-0 text-[11.5px] leading-relaxed text-emerald-900">
        <b>이 앱에서 금액은 AI가 만들지 않습니다.</b> 잔액 곡선·소진 시점·준비도 점수·목돈 배분은 정해진
        공식으로 계산하고, AI는 <b>무엇을 바꿔볼지</b>와 <b>왜 그런지</b>만 설명해요. AI가 엉뚱한 금액을
        말해도 화면에 반영되지 않도록 서버에서 걸러냅니다.{" "}
        <a href="/verify" className="font-semibold underline underline-offset-2 hover:text-emerald-700">
          실제로 막히는지 측정한 결과 보기 →
        </a>
      </p>
    </div>
  );
}
