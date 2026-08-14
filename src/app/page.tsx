"use client";

import { useRef, useState } from "react";
import type { ChatMessage, ChatRole } from "@/lib/prompt";
import type { Card } from "@/lib/cards";
import type { BriefingAction } from "@/lib/briefing";
import { CardView } from "@/components/Cards";
import { ProfilePanel } from "@/components/ProfilePanel";
import { Dashboard } from "@/components/Dashboard";
import { RiskScanner } from "@/components/RiskScanner";
import { BudgetSimulator } from "@/components/BudgetSimulator";
import { Forecast } from "@/components/Forecast";
import { useProfile } from "@/lib/useProfile";
import { computeDday, sampleProfile, type ProfileStore } from "@/lib/profile";
import { formatMan } from "@/lib/cards";

type View = "home" | "chat" | "scanner" | "simulator" | "forecast";

/** 어시스턴트 답변은 텍스트와 카드가 순서대로 섞인 블록 목록이다 */
type Block = { kind: "text"; text: string } | { kind: "card"; card: Card };
type UiMessage = { role: ChatRole; blocks: Block[] };

type DbRow = {
  nickname?: string | null;
  end_date?: string | null;
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

const blocksToText = (blocks: Block[]) =>
  blocks
    .map((b) => (b.kind === "text" ? b.text : `[${b.card.type} 카드를 보여줌]`))
    .join("")
    .trim();

const toHistory = (messages: UiMessage[]): ChatMessage[] =>
  messages
    .map((m) => ({ role: m.role, content: blocksToText(m.blocks) }))
    .filter((m) => m.content.length > 0);

export default function Home() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [view, setView] = useState<View>("home");
  const [notice, setNotice] = useState("");
  const { data: profile, setData: setProfile } = useProfile();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  };

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
    setView("chat");

    const history = [...toHistory(messages), { role: "user" as const, content: trimmed }];
    setMessages((m) => [
      ...m,
      { role: "user", blocks: [{ kind: "text", text: trimmed }] },
      { role: "assistant", blocks: [] },
    ]);
    setInput("");
    setLoading(true);
    scrollToBottom();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, profile }),
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
        scrollToBottom();
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
      scrollToBottom();
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
      setPanelOpen(false);
    } catch {
      setNotice("서버에 연결하지 못했어요. 개발 서버가 켜져 있는지 확인해 주세요.");
    }
  }

  function navigate(action: BriefingAction, prompt?: string) {
    if (action === "scanner") setView("scanner");
    else if (action === "simulator") setView("simulator");
    else if (action === "forecast") setView("forecast");
    else if (prompt) void send(prompt);
  }

  function goHome() {
    setMessages([]);
    setView("home");
  }

  const dday = profile.status.endDate ? computeDday(profile.status.endDate).label : null;
  const balance = profile.finance.balance != null ? formatMan(profile.finance.balance) : null;
  const chip = [dday, balance].filter(Boolean).join(" · ");
  const showInput = view === "home" || view === "chat";

  return (
    <div className="flex h-dvh flex-col bg-[#FFFDF8]">
      {/* 헤더 */}
      <header className="flex items-center gap-2 border-b border-emerald-100 bg-white/80 px-4 py-3 backdrop-blur">
        <button onClick={goHome} className="flex items-center gap-2 text-left" title="홈으로">
          <span className="text-2xl" aria-hidden>
            🌱
          </span>
          <div>
            <h1 className="text-lg font-bold leading-none text-emerald-700">새봄</h1>
            <p className="mt-0.5 text-[11px] text-gray-500">자립준비청년 금융 코치</p>
          </div>
        </button>
        <div className="ml-auto flex items-center gap-2">
          {view !== "home" && (
            <button
              onClick={goHome}
              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
            >
              ← 홈
            </button>
          )}
          <button
            onClick={() => setPanelOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50"
          >
            <span>{chip || "내 정보"}</span>
            <span aria-hidden>›</span>
          </button>
        </div>
      </header>

      {/* 본문 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {notice && (
          <div
            role="status"
            className="mx-auto mb-4 flex max-w-2xl items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[13px] leading-relaxed text-amber-900"
          >
            <span aria-hidden>ℹ️</span>
            <span className="min-w-0 flex-1">{notice}</span>
            <button
              onClick={() => setNotice("")}
              aria-label="알림 닫기"
              className="shrink-0 rounded px-1 text-amber-700 hover:bg-amber-100"
            >
              ✕
            </button>
          </div>
        )}

        {view === "home" && (
          <Dashboard
            profile={profile}
            onAsk={send}
            onOpenProfile={() => setPanelOpen(true)}
            onLoadSample={() => setProfile(sampleProfile())}
            onLoadFromDb={loadFromDb}
            onNavigate={navigate}
          />
        )}

        {view === "chat" && (
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            {messages.map((m, i) => {
              const empty = m.blocks.length === 0;
              return (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={
                      m.role === "user"
                        ? "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-emerald-600 px-4 py-2.5 text-sm text-white"
                        : "flex w-full max-w-[92%] flex-col gap-1 rounded-2xl rounded-bl-sm border border-gray-100 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm"
                    }
                  >
                    {empty && loading && i === messages.length - 1 ? (
                      <span className="text-gray-400">…</span>
                    ) : (
                      m.blocks.map((b, j) =>
                        b.kind === "text" ? (
                          <p key={j} className="whitespace-pre-wrap">
                            {b.text.trim()}
                          </p>
                        ) : (
                          <CardView key={j} card={b.card} />
                        ),
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === "scanner" && <RiskScanner />}

        {view === "forecast" && (
          <Forecast
            profile={profile}
            onAsk={send}
            onOpenProfile={() => setPanelOpen(true)}
            onOpenSimulator={() => setView("simulator")}
          />
        )}

        {view === "simulator" && (
          <BudgetSimulator
            profile={profile}
            setProfile={setProfile}
            onAsk={send}
            onOpenProfile={() => setPanelOpen(true)}
          />
        )}
      </div>

      {/* 입력창 (홈·채팅에서만) */}
      {showInput && (
        <div className="border-t border-gray-100 bg-white px-3 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="mx-auto flex max-w-2xl items-end gap-2"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              placeholder="무엇이든 편하게 물어보세요…"
              className="max-h-32 flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-400"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="shrink-0 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition disabled:opacity-40"
            >
              보내기
            </button>
          </form>
          <p className="mx-auto mt-2 max-w-2xl text-center text-[10px] text-gray-400">
            새봄은 참고용 안내를 제공해요. 중요한 결정은 공식 창구(서민금융 1397·금감원 1332)를 함께
            확인하세요.
          </p>
        </div>
      )}

      <ProfilePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        data={profile}
        setData={setProfile}
        onLoadFromDb={loadFromDb}
      />
    </div>
  );
}
