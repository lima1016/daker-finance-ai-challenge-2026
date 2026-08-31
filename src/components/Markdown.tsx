// 답변 텍스트를 사람이 읽기 좋게 그린다.
//
// 모델은 마크다운으로 답한다 — 그대로 뿌리면 화면에 별표가 그대로 보인다.
// 라이브러리를 쓰지 않는 이유: 모델이 실제로 쓰는 건 굵게·목록·번호 정도라
// 그 부분집합만 그리면 충분하고, 스트리밍 중 끊긴 문법도 조용히 넘길 수 있다.
//
// HTML은 해석하지 않는다. 모델이 <script>를 뱉어도 그냥 글자로 보인다.
import type { ReactNode } from "react";

// 굵게 → 기울임 → 코드 → 링크 순으로 한 번에 훑는다.
// 굵게(**)를 기울임(*)보다 먼저 두지 않으면 **굵게**의 앞 별표 하나만 먹는다.
const INLINE =
  /\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|`([^`\n]+)`|\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g;

/** 한 줄 안의 굵게·기울임·코드·링크를 그린다. 짝이 안 맞는 기호는 글자 그대로 둔다 */
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let cursor = 0;
  let i = 0;

  INLINE.lastIndex = 0;
  for (let m = INLINE.exec(text); m; m = INLINE.exec(text)) {
    if (m.index > cursor) out.push(text.slice(cursor, m.index));
    const k = `${key}-${i++}`;

    if (m[1] !== undefined) {
      out.push(
        <strong key={k} className="font-semibold text-ink">
          {m[1]}
        </strong>,
      );
    } else if (m[2] !== undefined) {
      out.push(
        <em key={k} className="italic">
          {m[2]}
        </em>,
      );
    } else if (m[3] !== undefined) {
      out.push(
        <code key={k} className="rounded bg-ground px-1 py-0.5 font-mono text-[12px] text-ink2">
          {m[3]}
        </code>,
      );
    } else {
      out.push(
        <a
          key={k}
          href={m[5]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand underline underline-offset-2 hover:text-brand"
        >
          {m[4]}
        </a>,
      );
    }
    cursor = m.index + m[0].length;
  }

  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}

const BULLET = /^\s*[-*•]\s+/;
const NUMBER = /^\s*\d+[.)]\s+/;
const HEADING = /^\s*#{1,6}\s+/;
const RULE = /^\s*([-*_]\s*){3,}$/;
const QUOTE = /^\s*>\s?/;

type Chunk =
  | { kind: "p"; lines: string[] }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "h"; text: string };

/**
 * 줄 단위로 훑으며 문단·목록·소제목을 나눈다.
 *
 * 빈 줄로만 나누면 "설명:\n- 항목" 처럼 빈 줄 없이 이어지는 목록을 놓친다.
 * 그래서 목록 기호를 만나는 순간 문단을 끊는다.
 */
function parse(src: string): Chunk[] {
  const chunks: Chunk[] = [];
  let para: string[] = [];

  const flush = () => {
    if (para.length) chunks.push({ kind: "p", lines: para });
    para = [];
  };
  const push = (item: string, kind: "ul" | "ol") => {
    const last = chunks[chunks.length - 1];
    if (last?.kind === kind) last.items.push(item);
    else chunks.push(kind === "ul" ? { kind, items: [item] } : { kind, items: [item] });
  };

  for (const raw of src.split("\n")) {
    const line = raw.replace(QUOTE, "");

    if (!line.trim() || RULE.test(line)) {
      flush();
    } else if (HEADING.test(line)) {
      flush();
      chunks.push({ kind: "h", text: line.replace(HEADING, "") });
    } else if (BULLET.test(line)) {
      flush();
      push(line.replace(BULLET, ""), "ul");
    } else if (NUMBER.test(line)) {
      flush();
      push(line.replace(NUMBER, ""), "ol");
    } else {
      // 목록 바로 뒤에 이어지는 들여쓴 줄은 그 항목의 설명이다
      const last = chunks[chunks.length - 1];
      if (!para.length && raw.startsWith("  ") && (last?.kind === "ul" || last?.kind === "ol")) {
        last.items[last.items.length - 1] += "\n" + line.trim();
      } else {
        para.push(line);
      }
    }
  }
  flush();
  return chunks;
}

/** 모델이 쓴 마크다운(부분집합)을 그린다 */
export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const chunks = parse(text);
  if (!chunks.length) return null;

  return (
    <div className={`flex flex-col gap-2.5 leading-7 ${className}`}>
      {chunks.map((c, i) => {
        if (c.kind === "h") {
          return (
            <p key={i} className="pt-1 font-bold text-ink">
              {inline(c.text, `h${i}`)}
            </p>
          );
        }
        if (c.kind === "p") {
          return (
            <p key={i} className="whitespace-pre-wrap break-words">
              {inline(c.lines.join("\n"), `p${i}`)}
            </p>
          );
        }
        const List = c.kind === "ul" ? "ul" : "ol";
        return (
          <List
            key={i}
            className={`flex flex-col gap-1.5 pl-5 ${
              c.kind === "ul"
                ? "list-disc marker:text-brand"
                : "list-decimal marker:font-medium marker:text-brand"
            }`}
          >
            {c.items.map((it, j) => (
              <li key={j} className="whitespace-pre-wrap break-words pl-0.5 leading-6">
                {inline(it, `l${i}-${j}`)}
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
