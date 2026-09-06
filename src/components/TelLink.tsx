"use client";

// 전화번호 버튼.
//
// tel: 링크는 휴대폰에서만 동작한다. PC에서 누르면 아무 반응이 없어, 급한 사람이
// 고장난 줄 안다. 전화를 걸 수 있는 기기면 그대로 걸고, 아니면 번호를 복사한다.
// 복사도 막힌 브라우저에서는 번호를 대신 선택해 Ctrl+C를 안내한다.
import { useEffect, useRef, useState } from "react";

/** 이 기기가 실제로 전화를 걸 수 있는가 */
function canDial(): boolean {
  if (typeof navigator === "undefined") return false;
  // 최신 브라우저는 UA 문자열 대신 이 힌트를 준다
  const hint = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
  if (typeof hint?.mobile === "boolean") return hint.mobile;
  return /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // clipboard API가 막힌 환경 대비 — 예전 방식으로 한 번 더 시도한다
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

type State = "idle" | "copied" | "manual";

export function TelLink({ tel, className = "" }: { tel: string; className?: string }) {
  const [state, setState] = useState<State>("idle");
  const numRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  // href는 항상 tel:로 두고 기기 판별은 클릭할 때만 한다 — 서버와 클라이언트가
  // 같은 마크업을 그려야 하이드레이션이 어긋나지 않는다.
  const onClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (canDial()) return; // 휴대폰이면 그대로 전화 앱으로
    e.preventDefault();

    const ok = await copy(tel);
    if (!ok && numRef.current) {
      // 복사가 막혔으면 번호를 선택해 둔다 — 사용자가 Ctrl+C만 누르면 된다
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(numRef.current);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }

    setState(ok ? "copied" : "manual");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2500);
  };

  return (
    <a
      href={`tel:${tel}`}
      onClick={onClick}
      aria-label={`${tel}로 전화하기. PC에서는 번호가 복사돼요`}
      className={className}
    >
      {/* 번호는 항상 그대로 둔다. 상태는 옆에 짧게 붙여서 번호 자리가 흔들리지 않게 한다 */}
      <span ref={numRef}>{tel}</span>
      {state !== "idle" && (
        <span aria-live="polite" className="ml-1.5 text-[11px] font-bold text-brand">
          {state === "copied" ? "복사됨" : "Ctrl+C"}
        </span>
      )}
    </a>
  );
}
