"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import type { ScanCard } from "@/lib/cards";
import { ScanCardView } from "./Cards";

const SAMPLE =
  "안녕하세요 OO은행입니다. 잠깐 통장 좀 빌려주시면 하루 30만원 드릴게요. 계좌번호랑 비밀번호만 알려주세요.";

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_BYTES = 4 * 1024 * 1024;

interface Picked {
  mimeType: string;
  data: string; // base64 (data: 접두사 없음)
  preview: string; // data URL
}

function readImage(file: File): Promise<Picked> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("이미지를 읽지 못했어요."));
    reader.onload = () => {
      const url = String(reader.result);
      const comma = url.indexOf(",");
      resolve({ mimeType: file.type, data: url.slice(comma + 1), preview: url });
    };
    reader.readAsDataURL(file);
  });
}

export function RiskScanner() {
  const [text, setText] = useState("");
  const [image, setImage] = useState<Picked | null>(null);
  const [card, setCard] = useState<ScanCard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pick(file: File | null | undefined) {
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      setError("이미지 파일만 올릴 수 있어요. PNG·JPG·WEBP로 올려주세요.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("이미지가 너무 커요. 4MB 이하로 줄여서 올려주세요.");
      return;
    }
    try {
      setImage(await readImage(file));
      setError("");
    } catch {
      setError("이미지를 읽지 못했어요.");
    }
  }

  function onPaste(e: React.ClipboardEvent) {
    const file = Array.from(e.clipboardData.files).find((f) => ALLOWED.includes(f.type));
    if (file) {
      e.preventDefault();
      void pick(file);
    }
  }

  async function scan() {
    if ((!text.trim() && !image) || loading) return;
    setCard(null);
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          image: image ? { mimeType: image.mimeType, data: image.data } : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || "확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
        return;
      }
      setCard(json.card as ScanCard);
    } catch {
      setError("연결에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  const canScan = (!!text.trim() || !!image) && !loading;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-[24px] font-extrabold tracking-[-0.03em] text-ink">위험 스캐너</h1>
        <p className="mt-1 text-[13px] text-ink3">
          받은 문자·카톡·링크·계약서를 붙여넣거나, <b>스크린샷을 그대로 올려도</b> 돼요. 어떤 문장이 왜
          위험한지 짚어드릴게요. 내용은 저장하지 않아요.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void pick(e.dataTransfer.files[0]);
        }}
        className={`flex flex-col gap-2 rounded-2xl border-2 border-dashed p-2 transition ${
          dragging ? "border-alert bg-alert-bg/50" : "border-transparent"
        }`}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={onPaste}
          rows={5}
          placeholder="받은 문자나 링크를 그대로 붙여넣어 보세요. 스크린샷은 Ctrl+V로 바로 붙여도 돼요"
          className="w-full resize-none rounded-2xl bg-white p-4 text-[13px] leading-relaxed text-ink outline-none transition placeholder:text-ink3 focus:ring-2 focus:ring-ink/10"
        />

        {image && (
          <div className="relative w-fit">
            <Image
              src={image.preview}
              alt="올린 스크린샷 미리보기"
              width={160}
              height={160}
              unoptimized
              className="h-auto max-h-44 w-auto rounded-xl border border-line object-contain"
            />
            <button
              onClick={() => setImage(null)}
              aria-label="이미지 제거"
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[12px] text-white shadow"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ALLOWED.join(",")}
        className="hidden"
        onChange={(e) => void pick(e.target.files?.[0])}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-full bg-white px-3 py-1.5 text-[12px] text-ink2 hover:bg-ground"
        >
          스크린샷 올리기
        </button>
        <button
          onClick={() => setText(SAMPLE)}
          className="rounded-full bg-white px-3 py-1.5 text-[12px] text-ink3 hover:bg-ground"
        >
          예시 붙여넣기
        </button>
        <button
          onClick={scan}
          disabled={!canScan}
          className="ml-auto rounded-2xl bg-alert px-5 py-2.5 text-[13px] font-medium text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {loading ? "살펴보는 중…" : "안전한지 확인하기"}
        </button>
      </div>

      {loading && (
        <div className="flex flex-col gap-2 rounded-[20px] bg-white p-5">
          <div className="h-4 w-1/3 animate-pulse rounded bg-ground" />
          <div className="h-16 animate-pulse rounded bg-ground" />
          <p className="text-[12px] text-ink3">
            {image ? "스크린샷의 글자를 읽고 있어요…" : "문장을 하나씩 살펴보는 중이에요…"}
          </p>
        </div>
      )}

      {error && (
        <p className="rounded-2xl border border-warn/30 bg-warn-bg p-3 text-[13px] text-warn">{error}</p>
      )}

      {card && <ScanCardView card={card} />}
    </div>
  );
}
