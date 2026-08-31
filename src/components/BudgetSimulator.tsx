"use client";

import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ProfileStore } from "@/lib/profile";
import { formatMan } from "@/lib/cards";
import { initialAlloc, monthsCovered, diagnose } from "@/lib/simulator";

type Props = {
  profile: ProfileStore;
  setProfile: Dispatch<SetStateAction<ProfileStore>>;
  onAsk: (text: string) => void;
  onOpenProfile: () => void;
};

const STEP = 100_000; // 10만원 단위

export function BudgetSimulator({ profile, setProfile, onAsk, onOpenProfile }: Props) {
  const init = useMemo(() => initialAlloc(profile), [profile]);
  const total = init.total;
  const [emergency, setEmergency] = useState(init.alloc.emergency);
  const [living, setLiving] = useState(init.alloc.living);
  const saving = Math.max(0, total - emergency - living);
  const exp = profile.status.expense;

  if (total <= 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-[24px] font-extrabold tracking-[-0.03em] text-ink">목돈 배분 시뮬레이터</h1>
        <div className="mt-4 rounded-2xl border border-line bg-brand-bg p-4 text-[13px] text-brand">
          먼저 정착금(또는 현재 잔액) 금액이 필요해요.
          <button onClick={onOpenProfile} className="ml-1 font-medium underline">
            내 정보에서 입력하기
          </button>
        </div>
      </div>
    );
  }

  const onEmergency = (v: number) => {
    const e = Math.min(v, total);
    setEmergency(e);
    if (e + living > total) setLiving(total - e);
  };
  const onLiving = (v: number) => setLiving(Math.min(v, total - emergency));

  const months = monthsCovered({ emergency, living, saving }, exp);
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  const rows = [
    { key: "비상금", value: emergency, color: "bg-brand" },
    { key: "생활비", value: living, color: "bg-ink2" },
    { key: "저축", value: saving, color: "bg-ink3" },
  ];

  function save() {
    setProfile((p) => ({ ...p, finance: { ...p.finance, alloc: { emergency, living, saving } } }));
    onAsk(
      `제 목돈 배분을 이렇게 정했어요 — 비상금 ${formatMan(emergency)}, 생활비 ${formatMan(living)}, 저축 ${formatMan(
        saving,
      )} (총 ${formatMan(total)}). 이 배분이 괜찮은지 봐주고, 지금 할 다음 행동을 알려주세요.`,
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-[24px] font-extrabold tracking-[-0.03em] text-ink">목돈 배분 시뮬레이터</h1>
        <span className="text-[13px] font-medium text-brand">총 {formatMan(total)}</span>
      </div>

      {/* 세그먼트 바 */}
      <div className="flex h-3 overflow-hidden rounded-full bg-ground">
        {rows.map((r) => (
          <div key={r.key} className={r.color} style={{ width: `${pct(r.value)}%` }} />
        ))}
      </div>

      {/* 슬라이더 */}
      <div className="flex flex-col gap-4 rounded-[20px] bg-white p-5">
        <SliderRow label="비상금" dot="bg-brand" value={emergency} total={total} onChange={onEmergency} />
        <SliderRow label="생활비" dot="bg-ink2" value={living} total={total} onChange={onLiving} />
        <div className="flex items-center justify-between text-[13px]">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-ink3" />
            저축 <span className="text-[11px] text-ink3">(자동)</span>
          </span>
          <span className="font-semibold text-ink">{formatMan(saving)}</span>
        </div>
      </div>

      {/* 새봄의 진단 */}
      <div className="rounded-2xl bg-brand-bg p-4">
        <div className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold text-brand">✨ 새봄의 진단</div>
        <p className="text-[13px] leading-relaxed text-brand">
          소득이 없어도 약 <b>{months}개월</b> 버틸 수 있어요. {diagnose({ emergency, living, saving }, exp).replace(
            /^.*?버틸 수 있어요\.\s*/,
            "",
          )}
        </p>
      </div>

      <button
        onClick={save}
        className="rounded-2xl bg-brand py-3 text-[13px] font-medium text-white transition hover:opacity-90"
      >
        이 배분으로 저장하고 새봄에게 물어보기
      </button>
    </div>
  );
}

function SliderRow({
  label,
  dot,
  value,
  total,
  onChange,
}: {
  label: string;
  dot: string;
  value: number;
  total: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[13px]">
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          {label}
        </span>
        <span className="font-semibold text-ink">{formatMan(value)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={total}
        step={STEP}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand"
      />
    </div>
  );
}
