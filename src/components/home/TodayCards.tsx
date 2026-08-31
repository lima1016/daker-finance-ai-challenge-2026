"use client";

// "오늘 챙길 3가지" — briefing.ts(또는 /api/briefing)가 만든 항목을 카드로만 바꿔 보여준다.
// 내용·순서는 전부 브리핑 로직이 정하고, 여기서는 색과 버튼 문구만 붙인다.
//
// 빨강은 화면에 하나만 쓴다. 위험 항목이 둘이어도 첫 번째만 빨강으로 두고
// 나머지는 중립으로 내린다 — 셋 다 빨갛면 무엇을 먼저 볼지 알 수 없다.
import type { BriefingAction, BriefingItem } from "@/lib/briefing";
import { Icon, type IconName } from "../Icon";

/** 라벨·아이콘은 '무엇을 하는 항목인가'(action)에서 뽑는다. 같은 말이 두 번 나오지 않게. */
const BY_ACTION: Record<BriefingAction, { eyebrow: string; icon: IconName; cta: string }> = {
  forecast: { eyebrow: "현금흐름 경고", icon: "forecast", cta: "현금흐름 확인" },
  scanner: { eyebrow: "사기 주의", icon: "shield", cta: "위험 스캔" },
  simulator: { eyebrow: "목돈 정리", icon: "allocate", cta: "목돈 배분" },
  chat: { eyebrow: "놓치지 마세요", icon: "gift", cta: "새봄에게 묻기" },
};

type Props = {
  items: BriefingItem[];
  onNavigate: (action: BriefingAction, prompt?: string) => void;
};

export function TodayCards({ items, onNavigate }: Props) {
  const three = items.slice(0, 3);
  if (three.length === 0) return null;

  // 가장 앞선 위험 항목 하나만 빨강을 갖는다
  const alertAt = three.findIndex((i) => i.tone === "danger");

  return (
    <section>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {three.map((item, i) => {
          const meta = BY_ACTION[item.action] ?? BY_ACTION.chat;
          const alert = i === alertAt;
          return (
            <button
              key={`${item.title}-${i}`}
              onClick={() => onNavigate(item.action, item.prompt)}
              className="group flex flex-col rounded-[20px] bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(25,31,40,0.07)]"
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  alert ? "bg-alert-bg text-alert" : "bg-brand-bg text-brand"
                }`}
              >
                <Icon name={alert ? "alert" : meta.icon} className="h-5 w-5" strokeWidth={1.9} />
              </span>

              <span
                className={`mt-3.5 text-[12px] font-bold ${alert ? "text-alert" : "text-brand"}`}
              >
                {meta.eyebrow}
              </span>
              <span className="mt-1 text-[17px] font-bold leading-[1.35] tracking-tight text-ink">
                {item.title}
              </span>
              <span className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink3">
                {item.desc}
              </span>

              <span className="mt-4 flex items-center gap-0.5 text-[13px] font-bold text-ink2">
                {meta.cta}
                <span className="transition group-hover:translate-x-0.5" aria-hidden>
                  ›
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
