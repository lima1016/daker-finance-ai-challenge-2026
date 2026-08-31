// 채팅 메시지 모델 — 화면(page.tsx)과 채팅 패널(ChatPane)이 함께 쓴다.
import type { ChatMessage, ChatRole } from "./prompt";
import type { Card } from "./cards";

/** 어시스턴트 답변은 텍스트와 카드가 순서대로 섞인 블록 목록이다 */
export type Block = { kind: "text"; text: string } | { kind: "card"; card: Card };
export type UiMessage = { role: ChatRole; blocks: Block[] };

export const blocksToText = (blocks: Block[]) =>
  blocks
    .map((b) => (b.kind === "text" ? b.text : `[${b.card.type} 카드를 보여줌]`))
    .join("")
    .trim();

export const toHistory = (messages: UiMessage[]): ChatMessage[] =>
  messages
    .map((m) => ({ role: m.role, content: blocksToText(m.blocks) }))
    .filter((m) => m.content.length > 0);
