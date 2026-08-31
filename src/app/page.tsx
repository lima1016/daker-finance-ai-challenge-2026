"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Card } from "@/lib/cards";
import { ProfilePanel } from "@/components/ProfilePanel";
import { Dashboard } from "@/components/Dashboard";
import { RiskScanner } from "@/components/RiskScanner";
import { BudgetSimulator } from "@/components/BudgetSimulator";
import { Forecast } from "@/components/Forecast";
import { Benefits } from "@/components/Benefits";
import { Sidebar, MobileTabBar } from "@/components/Sidebar";
import { ChatPane } from "@/components/ChatPane";
import { Icon } from "@/components/Icon";
import { useProfile } from "@/lib/useProfile";
import {
  computeDday,
  hasEnoughForDashboard,
  sampleProfile,
  type ProfileStore,
} from "@/lib/profile";
import { formatMan } from "@/lib/cards";
import { toHistory, type Block, type UiMessage } from "@/lib/chat";
import { useViewRoute } from "@/lib/useViewRoute";
import { useLocalFlag } from "@/lib/useLocalFlag";
import type { NavAction, NavItem } from "@/lib/nav";

/** 우측 채팅 패널이 상시 보이는 폭 (Tailwind xl) */
const WIDE = "(min-width: 1280px)";

type DbRow = {
  nickname?: string | null;
  end_date?: string | null;
  region?: string | null;
  housing?: string | null;
  work?: string | null;
  income?: number | null;
  expense?: number | null;
  settlement?: number | null;
  allowance?: number | null;
  balance?: number | null;
  alloc?: { emergency?: number; living?: number; saving?: number } | null;
};

function rowToProfile(r: DbRow): ProfileStore {
  return {
    status: {
      nickname: r.nickname ?? undefined,
      endDate: r.end_date ?? undefined,
      region: r.region ?? undefined,
      housing: r.housing ?? undefined,
      work: r.work ?? undefined,
      income: r.income ?? undefined,
      expense: r.expense ?? undefined,
    },
    finance: {
      settlement: r.settlement ?? undefined,
      allowance: r.allowance ?? undefined,
      balance: r.balance ?? undefined,
      alloc: r.alloc ?? undefined,
    },
  };
}

export default function Home() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  // 화면 전환을 URL에 남겨 브라우저 뒤로가기가 동작하게 한다
  const { view, panelOpen, push, replace, closePanel } = useViewRoute();
  // 우측 채팅 패널 접힘 — 안 쓸 땐 책갈피만 남긴다. 기기별 취향이라 이 브라우저에만 기억한다
  const [chatOpen, toggleChat] = useLocalFlag("saebom.chatOpen", true);
  // 넓은 화면에서는 채팅이 우측 패널에 상시 떠 있으므로 화면을 바꾸지 않는다
  const [wide, setWide] = useState(false);
  const { data: profile, setData: setProfile } = useProfile();
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // 넓어졌는데 채팅 화면이면 대화는 우측 패널이 이어받는다.
  // 사용자가 누른 이동이 아니므로 히스토리는 쌓지 않는다.
  useEffect(() => {
    if (wide && view === "chat") replace({ view: "home" });
  }, [wide, view, replace]);


  // 내 정보가 없으면 예시 인물의 데이터로 화면을 채운다.
  // 빈 화면을 먼저 보여주면 앱이 무엇을 하는지 알 수 없기 때문. 저장은 하지 않는다.
  const previewing = !hasEnoughForDashboard(profile);
  // sampleProfile()은 호출할 때마다 새 객체라, 메모하지 않으면 effect가 매 렌더 다시 돈다
  const sample = useMemo(() => sampleProfile(), []);
  // 예시를 보는 중이라도 사용자가 이미 고른 값(거주 지역 등)은 그대로 반영한다.
  // 고른 게 화면에 안 나타나면 "선택이 먹히지 않는다"고 느낀다.
  const activeProfile = useMemo(
    () =>
      previewing
        ? { status: { ...sample.status, ...profile.status }, finance: { ...sample.finance, ...profile.finance } }
        : profile,
    [previewing, sample, profile],
  );

  /** 마지막(어시스턴트) 메시지의 블록을 갱신 */
  const patchLast = (fn: (blocks: Block[]) => Block[]) =>
    setMessages((m) => {
      const copy = [...m];
      const last = copy[copy.length - 1];
      if (!last) return copy;
      copy[copy.length - 1] = { ...last, blocks: fn(last.blocks) };
      return copy;
    });

  const appendText = (text: string) =>
    patchLast((blocks) => {
      const last = blocks[blocks.length - 1];
      if (last?.kind === "text") {
        return [...blocks.slice(0, -1), { kind: "text", text: last.text + text }];
      }
      return [...blocks, { kind: "text", text }];
    });

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    // 좁은 화면에서만 채팅 화면으로 넘어간다 (넓으면 우측 패널에 그대로 쌓인다)
    if (!wide) push({ view: "chat" });
    else toggleChat(true);

    const history = [...toHistory(messages), { role: "user" as const, content: trimmed }];
    setMessages((m) => [
      ...m,
      { role: "user", blocks: [{ kind: "text", text: trimmed }] },
      { role: "assistant", blocks: [] },
    ]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, profile: activeProfile }),
      });

      if (!res.body) {
        appendText("응답을 받지 못했어요. 잠시 후 다시 시도해 주세요.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const handle = (raw: string) => {
        if (!raw.trim()) return;
        let ev: { t?: string; v?: unknown };
        try {
          ev = JSON.parse(raw);
        } catch {
          return; // 잘린 줄은 버린다
        }
        if (ev.t === "text" && typeof ev.v === "string") appendText(ev.v);
        else if (ev.t === "card" && ev.v) patchLast((b) => [...b, { kind: "card", card: ev.v as Card }]);
        else if (ev.t === "error" && typeof ev.v === "string") appendText(`\n\n⚠️ ${ev.v}`);
      };

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        lines.forEach(handle);
      }
      handle(buffer);
    } catch {
      appendText("연결에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  async function loadFromDb() {
    setNotice("");
    try {
      const res = await fetch("/api/profiles");
      const json = await res.json();
      if (!res.ok || !json.profiles?.length) {
        setNotice(json.error || "DB에 저장된 사용자가 없어요.");
        return;
      }
      setProfile(rowToProfile(json.profiles[0] as DbRow));
      closePanel();
    } catch {
      setNotice("서버에 연결하지 못했어요. 개발 서버가 켜져 있는지 확인해 주세요.");
    }
  }

  function navigate(action: NavAction, prompt?: string) {
    if (action === "benefits") push({ view: "benefits" });
    else if (action === "scanner") push({ view: "scanner" });
    else if (action === "simulator") push({ view: "simulator" });
    else if (action === "forecast") push({ view: "forecast" });
    else if (prompt) void send(prompt);
  }

  function selectNav(item: NavItem) {
    if (item.view !== "chat") {
      push({ view: item.view });
      return;
    }
    if (item.ask) void send(item.ask);
    else if (wide) {
      toggleChat(true);
      chatInputRef.current?.focus();
    } else push({ view: "chat" });
  }

  const dday = profile.status.endDate ? computeDday(profile.status.endDate).label : null;
  const balance = profile.finance.balance != null ? formatMan(profile.finance.balance) : null;
  const chip = [dday, balance].filter(Boolean).join(" · ");

  const renderChat = (variant: "panel" | "full") => (
    <ChatPane
      variant={variant}
      className={variant === "full" ? "min-h-0 flex-1" : "h-full"}
      messages={messages}
      loading={loading}
      input={input}
      setInput={setInput}
      onSend={send}
      onReset={() => setMessages([])}
      inputRef={variant === "panel" ? chatInputRef : undefined}
      onCollapse={variant === "panel" ? () => toggleChat(false) : undefined}
    />
  );

  return (
    <div className="flex h-dvh bg-ground">
      <Sidebar view={view} onSelect={selectNav} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* 모바일 헤더 (데스크톱은 좌측 사이드바가 대신한다) */}
        <header className="flex shrink-0 items-center gap-2 bg-white px-4 py-3 md:hidden">
          {view !== "home" && (
            <button
              onClick={() => window.history.back()}
              aria-label="뒤로"
              className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink2 transition hover:bg-ground"
            >
              <Icon name="chevronRight" className="h-5 w-5 rotate-180" strokeWidth={2.2} />
            </button>
          )}
          <button
            onClick={() => push({ view: "home" })}
            className="flex items-center gap-2 text-left"
            title="홈으로"
          >
            <Icon name="sprout" className="h-6 w-6 text-brand" strokeWidth={1.8} />
            <span>
              <span className="block text-[15px] font-extrabold leading-none text-brand">새봄</span>
              <span className="mt-1 block text-[11px] font-medium text-ink3">AI 금융 코치</span>
            </span>
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <a
              href="/verify"
              title="AI가 금액을 만들지 못하도록 막았는지 측정한 결과"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-ground text-ink2"
            >
              <Icon name="lock" className="h-4 w-4" strokeWidth={2} />
            </a>
            <button
              onClick={() => push({ panel: true })}
              className="flex items-center gap-1 rounded-full bg-ground px-3 py-1.5 text-[12px] font-bold text-ink2"
            >
              <span>{chip || "내 정보"}</span>
              <span aria-hidden>›</span>
            </button>
          </div>
        </header>

        {notice && (
          <div
            role="status"
            className="mx-4 mt-4 flex shrink-0 items-start gap-2 rounded-2xl bg-white p-4 text-[13px] font-medium leading-relaxed text-ink2"
          >
            <span className="min-w-0 flex-1">{notice}</span>
            <button
              onClick={() => setNotice("")}
              aria-label="알림 닫기"
              className="shrink-0 rounded-full px-2 text-ink3 transition hover:bg-ground"
            >
              ✕
            </button>
          </div>
        )}

        {/* 본문 */}
        {view === "chat" ? (
          renderChat("full")
        ) : (
          <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-5 md:px-8">
            <div className="mx-auto w-full max-w-6xl">
              {view === "home" && (
                <Dashboard
                  profile={activeProfile}
                  previewing={previewing}
                  onAsk={send}
                  onOpenProfile={() => push({ panel: true })}
                  onLoadSample={() => setProfile(sampleProfile())}
                  onLoadFromDb={loadFromDb}
                  onNavigate={navigate}
                />
              )}

              {view === "scanner" && <RiskScanner />}

              {view === "benefits" && (
                <Benefits
                  profile={activeProfile}
                  onAsk={send}
                  onOpenProfile={() => push({ panel: true })}
                />
              )}

              {view === "forecast" && (
                <Forecast
                  profile={activeProfile}
                  onAsk={send}
                  onOpenProfile={() => push({ panel: true })}
                  onOpenSimulator={() => push({ view: "simulator" })}
                />
              )}

              {view === "simulator" && (
                <BudgetSimulator
                  profile={activeProfile}
                  setProfile={setProfile}
                  onAsk={send}
                  onOpenProfile={() => push({ panel: true })}
                />
              )}

              {/* 하단 공통 */}
              <p className="mt-10 flex flex-wrap items-center justify-center gap-1.5 text-center text-[11px] leading-relaxed text-ink3">
                <Icon name="lock" className="h-3 w-3" strokeWidth={2} />
                금융 데이터는 안전하게 보호되며, AI는 수치를 임의로 생성하지 않습니다.{" "}
                <a href="/verify" className="font-semibold underline underline-offset-2 hover:text-ink2">
                  신뢰성 검증 결과 보기 →
                </a>
              </p>
            </div>
          </main>
        )}

        {/* 모바일 하단 — 입력바 + 탭바 (데스크톱은 사이드바·우측 패널이 대신한다) */}
        <div className="shrink-0 md:hidden">
          {view !== "chat" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
              className="flex items-center gap-2 border-t border-line bg-white px-3 py-2.5"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="새봄에게 무엇이든 물어보세요"
                className="min-w-0 flex-1 rounded-full bg-ground px-4 py-2.5 text-[13px] font-medium outline-none placeholder:text-ink3"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="보내기"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white disabled:opacity-30"
              >
                <span aria-hidden>➤</span>
              </button>
            </form>
          )}
          <MobileTabBar view={view} onSelect={selectNav} />
        </div>
      </div>

      {/* 우측 채팅 패널 (xl 이상에서만 상시 표시). 접으면 폭만 0으로 줄인다 */}
      {wide && (
        <div
          className={`shrink-0 overflow-hidden transition-[width] duration-300 ease-out ${
            chatOpen ? "w-[340px]" : "w-0"
          }`}
        >
          <div className="h-full w-[340px]">{renderChat("panel")}</div>
        </div>
      )}

      {/* 접었을 때 화면 오른쪽에 붙는 책갈피 */}
      {wide && !chatOpen && (
        <button
          onClick={() => toggleChat(true)}
          title="새봄에게 물어보기"
          className="group fixed right-0 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-2 rounded-l-2xl bg-white py-5 pl-3.5 pr-3 shadow-[-6px_0_20px_rgba(25,31,40,0.10)] transition-all duration-200 hover:pr-4"
        >
          <span className="relative flex h-6 w-6 items-center justify-center text-brand">
            <Icon name="chat" className="h-5 w-5" strokeWidth={1.9} />
            {messages.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-alert" />
            )}
          </span>
          <span
            className="text-[12px] font-bold tracking-tight text-ink2"
            style={{ writingMode: "vertical-rl" }}
          >
            새봄
          </span>
        </button>
      )}

      <ProfilePanel
        open={panelOpen}
        onClose={closePanel}
        data={profile}
        setData={setProfile}
        onLoadFromDb={loadFromDb}
      />
    </div>
  );
}
