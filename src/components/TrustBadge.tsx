"use client";

// "이 숫자는 누가 만들었나"를 화면에 드러내는 배지.
//
// 이 앱의 핵심 설계는 'AI가 금액을 지어내지 않는다'는 것이다.
// 코드에만 있으면 아무도 모르므로, 숫자 옆에 출처를 붙여 보이게 한다.

import { Icon, type IconName } from "./Icon";

type Kind = "calc" | "ai" | "official";

const STYLE: Record<Kind, { icon: IconName; label: string; className: string; title: string }> = {
  calc: {
    icon: "calc",
    label: "앱이 계산",
    className: "bg-brand-bg text-brand",
    title: "AI가 아니라 정해진 공식으로 계산한 값이에요. 같은 정보를 넣으면 항상 같은 결과가 나옵니다.",
  },
  ai: {
    icon: "sparkle",
    label: "AI 해석",
    className: "bg-ground text-ink2",
    title: "AI가 쓴 설명이에요. 금액은 만들지 않고, 계산된 값을 해석하고 제안만 합니다.",
  },
  official: {
    icon: "clip",
    label: "공식 자료",
    className: "bg-ground text-ink3",
    title: "정부·공공기관 자료에 근거한 내용이에요.",
  },
};

export function TrustBadge({ kind, text }: { kind: Kind; text?: string }) {
  const s = STYLE[kind];
  return (
    <span
      title={s.title}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium leading-none ${s.className}`}
    >
      <Icon name={s.icon} className="h-3 w-3" strokeWidth={2} />
      {text ?? s.label}
    </span>
  );
}

/** 앱 전체의 원칙을 한 줄로 알리는 띠 */
export function TrustNote({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-start gap-2 rounded-2xl border border-line bg-brand-bg p-3 ${className}`}
    >
      <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
      <p className="min-w-0 text-[12px] leading-relaxed text-brand">
        <b>이 앱에서 금액은 AI가 만들지 않습니다.</b> 잔액 곡선·소진 시점·준비도 점수·목돈 배분은 정해진
        공식으로 계산하고, AI는 <b>무엇을 바꿔볼지</b>와 <b>왜 그런지</b>만 설명해요. AI가 엉뚱한 금액을
        말해도 화면에 반영되지 않도록 서버에서 걸러냅니다.{" "}
        <a href="/verify" className="font-semibold underline underline-offset-2 hover:text-brand">
          실제로 막히는지 측정한 결과 보기 →
        </a>
      </p>
    </div>
  );
}
