"use client";

// "필요할 때 바로 사용하세요" — 도구 4개.
// 아이콘 배경은 넷 다 같은 색이다. 도구마다 색을 달리하면 우선순위가 있는 것처럼 보인다.
import type { NavAction } from "@/lib/nav";
import { Icon, type IconName } from "../Icon";
import { SectionTitle } from "./Section";

const TOOLS: { icon: IconName; title: string; desc: string; action: NavAction }[] = [
  { icon: "forecast", title: "현금흐름 예측", desc: "언제까지 버틸까", action: "forecast" },
  { icon: "allocate", title: "목돈 배분", desc: "어떻게 나눌까", action: "simulator" },
  { icon: "shield", title: "위험 스캐너", desc: "이 문자, 사기일까", action: "scanner" },
  { icon: "gift", title: "지원제도 찾기", desc: "뭘 받을 수 있을까", action: "benefits" },
];

export function ToolGrid({
  onNavigate,
}: {
  onNavigate: (action: NavAction, prompt?: string) => void;
}) {
  return (
    <section>
      <SectionTitle>필요할 때 바로 사용하세요</SectionTitle>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {TOOLS.map((t) => (
          <button
            key={t.title}
            onClick={() => onNavigate(t.action)}
            className="flex h-full flex-col items-start rounded-[20px] bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(25,31,40,0.07)]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ground text-ink2">
              <Icon name={t.icon} className="h-5 w-5" strokeWidth={1.9} />
            </span>
            <span className="mt-3.5 text-[15px] font-bold tracking-tight text-ink">{t.title}</span>
            <span className="mt-1 text-[12px] leading-snug text-ink3">{t.desc}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
