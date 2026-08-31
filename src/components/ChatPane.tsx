"use client";

// 새봄 채팅 — 데스크톱에서는 우측 고정 패널, 모바일에서는 전체 화면.
//
// 스트리밍·전송 로직은 page.tsx에 그대로 두고, 여기서는 그리기만 한다.
import { useEffect, useRef, type RefObject } from "react";
import { CardView } from "./Cards";
import { Markdown } from "./Markdown";
import { Icon } from "./Icon";
import type { UiMessage } from "@/lib/chat";

const EXAMPLES = [
  "정착금은 어떻게 나누는 게 좋을까?",
  "지금 돈으로 얼마나 버틸 수 있어?",
  "이 문자는 사기일까?",
  "내가 받을 수 있는 지원이 뭐가 있지?",
];

type Props = {
  messages: UiMessage[];
  loading: boolean;
  input: string;
  setInput: (v: string) => void;
  onSend: (text: string) => void;
  onReset: () => void;
  /** panel = 우측 고정 패널, full = 모바일 전체 화면 */
  variant?: "panel" | "full";
  className?: string;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  /** 우측 패널을 접는다 (panel 변형에서만) */
  onCollapse?: () => void;
};

export function ChatPane({
  messages,
  loading,
  input,
  setInput,
  onSend,
  onReset,
  variant = "panel",
  className = "",
  inputRef,
  onCollapse,
}: Props) {
  const panel = variant === "panel";
  const scrollRef = useRef<HTMLDivElement>(null);
  const empty = messages.length === 0;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  return (
    // h-full이 없으면 높이가 내용만큼만 잡혀 패널이 위쪽에만 뜬다
    <section
      className={`flex h-full min-h-0 flex-col ${panel ? "w-[340px] bg-white" : "bg-ground"} ${className}`}
    >
      {/* 머리말 */}
      <div className="shrink-0 px-5 pb-3 pt-5">
        <div className="flex items-start gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ground text-ink2">
            <Icon name="sprout" className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-bold tracking-tight text-ink">
              새봄에게 무엇이든 물어보세요
            </h2>
            <p className="mt-1 text-[12px] leading-snug text-ink3">
              궁금한 게 있으면 편하게 물어보세요
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {!empty && (
              <button
                onClick={onReset}
                className="rounded-full bg-ground px-2.5 py-1.5 text-[11px] font-bold text-ink3 transition hover:bg-line"
              >
                새 대화
              </button>
            )}
            {onCollapse && (
              <button
                onClick={onCollapse}
                aria-label="채팅 접기"
                title="채팅 접기"
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink3 transition hover:bg-ground hover:text-ink2"
              >
                <Icon name="chevronRight" className="h-4 w-4" strokeWidth={2.2} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 pb-2">
        {empty ? (
          <div className="flex flex-col gap-2">
            {EXAMPLES.map((q) => (
              <button
                key={q}
                onClick={() => onSend(q)}
                className="rounded-2xl bg-ground px-4 py-3.5 text-left text-[13px] font-medium leading-snug text-ink2 transition hover:bg-line hover:text-ink"
              >
                {q}
              </button>
            ))}
          </div>
        ) : (
          <div className={`flex flex-col gap-3 ${panel ? "" : "mx-auto w-full max-w-2xl"}`}>
            {messages.map((m, i) => {
              const isEmpty = m.blocks.length === 0;
              // 모델은 문장을 쓰다 말고 도구를 부른다. 블록 순서대로 그리면 카드가
              // 단어 한가운데를 자른다("…안내해 드" [카드] "립니다.").
              // 그래서 글은 전부 이어 붙이고, 카드는 언제 왔든 글 뒤에 놓는다.
              const text = m.blocks
                .map((b) => (b.kind === "text" ? b.text : ""))
                .join("")
                .trim();
              const cards = m.blocks.flatMap((b) => (b.kind === "card" ? [b.card] : []));
              return (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={
                      m.role === "user"
                        ? "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-[13px] font-medium leading-6 text-white"
                        : "flex w-full max-w-[95%] flex-col gap-3 rounded-2xl rounded-bl-md bg-ground px-4 py-3 text-[13px] leading-6 text-ink"
                    }
                  >
                    {isEmpty && loading && i === messages.length - 1 ? (
                      <span className="text-ink3">…</span>
                    ) : m.role === "user" ? (
                      text
                    ) : (
                      <>
                        <Markdown text={text} />
                        {cards.map((card, j) => (
                          <CardView key={j} card={card} />
                        ))}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 입력 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend(input);
        }}
        className="shrink-0 px-5 pb-5 pt-2"
      >
        <div className={`mx-auto flex items-end gap-2 ${panel ? "" : "w-full max-w-2xl"}`}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend(input);
              }
            }}
            rows={1}
            placeholder="질문을 입력하세요"
            className="max-h-32 min-w-0 flex-1 resize-none rounded-2xl bg-ground px-4 py-3 text-[13px] font-medium text-ink outline-none transition placeholder:font-normal placeholder:text-ink3"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="보내기"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white transition hover:opacity-90 disabled:opacity-30"
          >
            <Icon name="chevronRight" className="h-5 w-5" strokeWidth={2.4} />
          </button>
        </div>
        <p className="mt-2.5 text-center text-[11px] leading-snug text-ink3">
          참고용 안내예요. 중요한 결정은 서민금융 1397·금감원 1332도 함께 확인하세요.
        </p>
      </form>
    </section>
  );
}
