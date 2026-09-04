"use client";

import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ProfileStore } from "@/lib/profile";
import { formatMan } from "@/lib/cards";
import { initialAlloc, diagnose } from "@/lib/simulator";
import type { AllocTone } from "@/lib/simulator";

type Props = {
  profile: ProfileStore;
  setProfile: Dispatch<SetStateAction<ProfileStore>>;
  onAsk: (text: string) => void;
  onOpenProfile: () => void;
};

const STEP = 100_000; // 10만원 단위

// 버틸 돈이 없는 배분을 초록 박스에 담으면 위험이 안심처럼 읽힌다
const TONE: Record<AllocTone, { box: string; text: string }> = {
  good: { box: "bg-brand-bg", text: "text-brand" },
  warn: { box: "bg-warn-bg", text: "text-warn" },
  danger: { box: "bg-alert-bg", text: "text-alert" },
};

export function BudgetSimulator({ profile, setProfile, onAsk, onOpenProfile }: Props) {
  const init = useMemo(() => initialAlloc(profile), [profile]);
  const total = init.total;
  const [emergency, setEmergency] = useState(init.alloc.emergency);
  const [living, setLiving] = useState(init.alloc.living);

  // useState 초기값은 첫 렌더에만 쓰인다. 그런데 내 정보 패널은 이 화면을 덮는
  // 오버레이라 컴포넌트가 살아있는 채로 프로필만 바뀐다 — 잔액을 고치면 총액만
  // 갱신되고 슬라이더는 옛 값에 남아 세그먼트 바가 100%를 넘었다.
  // 객체 identity 대신 값으로 비교해, 불필요한 초기화로 조작 중인 값이 튀지 않게 한다.
  const initKey = `${init.total}:${init.alloc.emergency}:${init.alloc.living}`;
  const [seenKey, setSeenKey] = useState(initKey);
  if (seenKey !== initKey) {
    setSeenKey(initKey);
    setEmergency(init.alloc.emergency);
    setLiving(init.alloc.living);
  }

  const saving = Math.max(0, total - emergency - living);
  const exp = profile.status.expense;

  if (total <= 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-[24px] font-extrabold tracking-[-0.03em] text-ink">목돈 배분 시뮬레이터</h1>
        <div className="mt-4 rounded-2xl bg-brand-bg p-4 text-[13px] text-brand">
          먼저 현재 통장 잔액(또는 정착금) 금액이 필요해요.
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

  const dx = diagnose({ emergency, living, saving }, exp);
  const tone = TONE[dx.tone];
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  // 나누는 돈이 정착금 총액이 아니라 '지금 통장에 있는 돈'이라는 걸 밝힌다.
  // 제목이 "목돈"이라 이름표가 없으면 정착금 전액을 나누는 화면으로 읽힌다.
  const fromBalance = profile.finance.balance != null;
  const sourceLabel = fromBalance ? "현재 잔액" : "정착금";
  const settlementDiffers =
    fromBalance &&
    profile.finance.settlement != null &&
    profile.finance.settlement !== profile.finance.balance;

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
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-[24px] font-extrabold tracking-[-0.03em] text-ink">목돈 배분 시뮬레이터</h1>
          <span className="shrink-0 text-[13px] font-medium text-brand">
            {sourceLabel} {formatMan(total)}
          </span>
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink3">
          이 돈을 세 갈래로 나눠보고, 수입이 끊겼을 때 얼마나 버틸 수 있는지 확인해요.
          {settlementDiffers && " 정착금 총액이 아니라 지금 통장에 있는 돈으로 나눠요."}
        </p>
      </div>

      {/* 세그먼트 바 */}
      <div className="flex h-3 overflow-hidden rounded-full bg-line">
        {rows.map((r) => (
          <div key={r.key} className={r.color} style={{ width: `${pct(r.value)}%` }} />
        ))}
      </div>

      {/* 슬라이더 */}
      <div className="flex flex-col gap-4 rounded-[20px] bg-white p-5">
        <SliderRow
          label="비상금"
          hint="갑자기 아프거나 일이 끊겼을 때 꺼내 쓸 돈"
          dot="bg-brand"
          value={emergency}
          total={total}
          onChange={onEmergency}
        />
        <SliderRow
          label="생활비"
          hint="월세·식비처럼 앞으로 매달 나갈 돈"
          dot="bg-ink2"
          value={living}
          total={total}
          onChange={onLiving}
        />
        <div className="flex items-start justify-between gap-3 text-[13px]">
          <div className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-ink3" />
              저축 <span className="text-[11px] text-ink3">(남는 만큼)</span>
            </span>
            <p className="mt-0.5 text-[11px] leading-snug text-ink3">
              당장 안 쓰고 모아둘 돈. 위 둘을 정하면 나머지가 자동으로 들어와요
            </p>
          </div>
          <span className="shrink-0 font-semibold text-ink">{formatMan(saving)}</span>
        </div>
      </div>

      {/* 새봄의 진단 */}
      <div className={`rounded-2xl p-4 ${tone.box}`}>
        <div className={`mb-1 flex items-center gap-1.5 text-[13px] font-semibold ${tone.text}`}>
          새봄의 진단
        </div>
        <p className={`text-[13px] leading-relaxed ${tone.text}`}>
          수입이 끊기면 버티는 기간은 <b>약 {dx.months}개월</b>이에요. {dx.advice}
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
  hint,
  dot,
  value,
  total,
  onChange,
}: {
  label: string;
  hint: string;
  dot: string;
  value: number;
  total: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-start justify-between gap-3 text-[13px]">
        <div className="min-w-0">
          <span className="flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
            {label}
          </span>
          <p className="mt-0.5 text-[11px] leading-snug text-ink3">{hint}</p>
        </div>
        <span className="shrink-0 font-semibold text-ink">{formatMan(value)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={total}
        step={STEP}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        // 값 옆의 글자는 시각적으로만 붙어 있다. 이름을 주지 않으면 스크린리더가
        // 세 슬라이더를 모두 "슬라이더"로만 읽어 무엇을 조절하는지 알 수 없다.
        aria-label={`${label} 금액`}
        aria-valuetext={formatMan(value)}
        className="w-full accent-brand"
      />
    </div>
  );
}
