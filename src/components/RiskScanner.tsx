"use client";

import { useState } from "react";
import { MessageContent } from "./Cards";

const SAMPLE =
  "안녕하세요 OO은행입니다. 잠깐 통장 좀 빌려주시면 하루 30만원 드릴게요. 계좌번호랑 비밀번호만 알려주세요.";

export function RiskScanner() {
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function scan() {
    if (!text.trim() || loading) return;
    setResult("");
    setLoading(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok || !res.body) {
        setResult(await res.text());
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setResult(acc);
      }
    } catch {
      setResult("검사 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-rose-700">🛡️ 위험 스캐너</h2>
        <p className="mt-1 text-sm text-gray-500">
          받은 문자·카톡·링크·계약서를 붙여넣으면 사기 수법과 독소조항을 검사해요. 내용은 저장하지 않아요.
        </p>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="검사할 문자·링크·계약 내용을 여기에 붙여넣으세요…"
        className="w-full resize-none rounded-2xl border border-gray-200 bg-white p-3.5 text-sm outline-none focus:border-rose-300"
      />

      <div className="flex items-center gap-2">
        <button
          onClick={() => setText(SAMPLE)}
          className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
        >
          예시 붙여넣기
        </button>
        <button
          onClick={scan}
          disabled={loading || !text.trim()}
          className="ml-auto flex items-center gap-1.5 rounded-2xl bg-rose-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-40"
        >
          {loading ? "검사 중…" : "검사하기"}
        </button>
      </div>

      {result && (
        <div className="flex flex-col gap-1 rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-800 shadow-sm">
          <MessageContent content={result} />
        </div>
      )}
    </div>
  );
}
