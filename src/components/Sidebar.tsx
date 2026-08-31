"use client";

// 고정 내비게이션.
//
// 데스크톱(md~)은 좌측 사이드바, 모바일은 하단 탭바 — 같은 NAV_ITEMS를 쓴다.
import { NAV_ITEMS, type NavItem, type View } from "@/lib/nav";
import { Icon } from "./Icon";

type Props = {
  view: View;
  onSelect: (item: NavItem) => void;
};

/** 지원제도 찾기와 새봄챗은 둘 다 view가 "chat"이라, 키로 한 번 더 구분한다 */
function isActive(item: NavItem, view: View) {
  if (item.view !== view) return false;
  return view !== "chat" || item.key === "chat";
}

export function Sidebar({ view, onSelect }: Props) {
  return (
    <aside className="hidden w-[228px] shrink-0 flex-col bg-white px-4 py-6 md:flex">
      <button
        onClick={() => onSelect(NAV_ITEMS[0])}
        className="mb-5 flex items-center gap-2 px-2 text-left"
        title="홈으로"
      >
        <span className="text-2xl leading-none" aria-hidden>
          🌱
        </span>
        <span>
          <span className="block text-[19px] font-extrabold leading-none tracking-tight text-brand">
            새봄
          </span>
          <span className="mt-1.5 block text-[12px] font-medium text-ink3">AI 금융 코치</span>
        </span>
      </button>

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item, view);
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item)}
              className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-[14px] transition ${
                active
                  ? "bg-ground font-bold text-ink"
                  : "font-semibold text-ink3 hover:bg-ground/60"
              }`}
            >
              <Icon name={item.icon} className="h-5 w-5 shrink-0" strokeWidth={1.9} />
              <span className="min-w-0 truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto rounded-[20px] bg-brand-bg p-5 text-center">
        <Icon name="sprout" className="mx-auto h-7 w-7 text-brand" strokeWidth={1.7} />
        <p className="mt-2.5 text-[12px] font-semibold leading-relaxed text-brand">
          혼자 시작하는 금융생활,
          <br />
          새봄이 함께할게요
        </p>
      </div>
    </aside>
  );
}

/** 모바일 하단 탭바 */
export function MobileTabBar({ view, onSelect }: Props) {
  const items = NAV_ITEMS.filter((i) => i.mobile);
  return (
    <nav className="flex border-t border-line bg-white pb-[env(safe-area-inset-bottom)]">
      {items.map((item) => {
        const active = isActive(item, view);
        return (
          <button
            key={item.key}
            onClick={() => onSelect(item)}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-bold transition ${
              active ? "text-ink" : "text-ink3"
            }`}
          >
            <Icon name={item.icon} className="h-[22px] w-[22px]" strokeWidth={1.9} />
            {item.short}
          </button>
        );
      })}
    </nav>
  );
}
