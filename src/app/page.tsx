"use client";

import { useRef, useState } from "react";
import type { ChatMessage } from "@/lib/prompt";
import { MessageContent } from "@/components/Cards";
import { ProfilePanel } from "@/components/ProfilePanel";
import { Dashboard } from "@/components/Dashboard";
import { useProfile } from "@/lib/useProfile";
import { buildProfileContext, computeDday, sampleProfile, type ProfileStore } from "@/lib/profile";
import { computeAllocation, budgetResultToMessage } from "@/lib/budget";
import { formatMan } from "@/lib/cards";

// DB(snake_case) 행 → 앱 프로필(camelCase) 변환
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

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const { data: profile, setData: setProfile } = useProfile();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const next: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);
    scrollToBottom();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, profile: buildProfileContext(profile) || undefined }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text();
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: errText || "오류가 발생했어요." };
          return copy;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
        scrollToBottom();
      }
    } catch {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: "연결에 문제가 생겼어요. 잠시 후 다시 시도해 주세요." };
        return copy;
      });
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }

  // 목돈 배분 — 규칙엔진으로 결정적 계산 후 카드로 표시 (LLM 미사용)
  function showBudget() {
    const userMsg: ChatMessage = { role: "user", content: "내 목돈, 어떻게 나누면 좋을까?" };
    const result = computeAllocation(profile);
    if (!result) {
      setMessages((m) => [
        ...m,
        userMsg,
        {
          role: "assistant",
          content:
            "먼저 정착금(또는 현재 잔액) 금액이 필요해요. 우측 위 '내 정보'에서 정착금을 입력하시면, 규칙에 따라 배분안을 바로 계산해 드릴게요.",
        },
      ]);
      return;
    }
    setMessages((m) => [...m, userMsg, { role: "assistant", content: budgetResultToMessage(result) }]);
  }

  async function loadFromDb() {
    try {
      const res = await fetch("/api/profiles");
      const json = await res.json();
      if (!res.ok || !json.profiles?.length) {
        alert(json.error || "DB에 저장된 사용자가 없어요.");
        return;
      }
      setProfile(rowToProfile(json.profiles[0] as DbRow));
    } catch {
      alert("DB 연결에 실패했어요. 서버와 Supabase 설정을 확인해 주세요.");
    }
  }

  const empty = messages.length === 0;
  const dday = profile.status.endDate ? computeDday(profile.status.endDate).label : null;
  const balance = profile.finance.balance != null ? formatMan(profile.finance.balance) : null;
  const chip = [dday, balance].filter(Boolean).join(" · ");

  return (
    <div className="flex h-dvh flex-col bg-gradient-to-b from-emerald-50 to-white">
      {/* 헤더 */}
      <header className="flex items-center gap-2 border-b border-emerald-100 bg-white/80 px-4 py-3 backdrop-blur">
        <span className="text-2xl">🌱</span>
        <div>
          <h1 className="text-lg font-bold leading-none text-emerald-700">새봄</h1>
          <p className="mt-0.5 text-[11px] text-gray-500">자립준비청년 곁의 AI 금융 코치</p>
        </div>
        <button
          onClick={() => setPanelOpen(true)}
          className="ml-auto flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50"
        >
          <span>{chip || "내 정보"}</span>
          <span aria-hidden>›</span>
        </button>
      </header>

      {/* 대화 영역 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {empty ? (
          <Dashboard
            profile={profile}
            onAsk={send}
            onOpenProfile={() => setPanelOpen(true)}
            onLoadSample={() => setProfile(sampleProfile())}
            onLoadFromDb={loadFromDb}
            onBudget={showBudget}
          />
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-emerald-600 px-4 py-2.5 text-sm text-white"
                      : "flex max-w-[90%] flex-col gap-1 rounded-2xl rounded-bl-sm border border-gray-100 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm"
                  }
                >
                  {m.role === "user" ? (
                    m.content
                  ) : m.content ? (
                    <MessageContent content={m.content} />
                  ) : loading && i === messages.length - 1 ? (
                    "…"
                  ) : (
                    ""
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 입력창 */}
      <div className="border-t border-gray-100 bg-white px-3 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mx-auto flex max-w-2xl items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="메시지를 입력하세요…"
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
          새봄은 참고용 안내를 제공해요. 중요한 결정은 공식 창구(서민금융 1397·금감원 1332)를 함께 확인하세요.
        </p>
      </div>

      <ProfilePanel open={panelOpen} onClose={() => setPanelOpen(false)} data={profile} setData={setProfile} />
    </div>
  );
}
