"use client";

import { computeDday, hasProfile, type ProfileStore } from "@/lib/profile";
import { formatMan } from "@/lib/cards";
import { buildBriefing, type BriefingItem } from "@/lib/briefing";

const FEATURES = [
  { icon: "🏠", tint: "bg-emerald-50 text-emerald-700", title: "지원제도 찾기", action: "ask" as const, ask: "제가 지금 받을 수 있는 지원제도를 우선순위로 정리해 주세요." },
  { icon: "💰", tint: "bg-amber-50 text-amber-700", title: "배분 시뮬레이터", action: "simulator" as const, ask: "" },
  { icon: "🛡️", tint: "bg-rose-50 text-rose-700", title: "위험 스캐너", action: "scanner" as const, ask: "" },
  { icon: "🗓️", tint: "bg-sky-50 text-sky-700", title: "할 일 타임라인", action: "ask" as const, ask: "보호종료 전후로 지금부터 무엇을 신청하고 준비해야 하는지 순서대로 알려주세요." },
];

const TONE = {
  info: { icon: "💡", ring: "border-emerald-100", chip: "bg-emerald-100 text-emerald-700" },
  warn: { icon: "⏰", ring: "border-amber-100", chip: "bg-amber-100 text-amber-700" },
  danger: { icon: "⚠️", ring: "border-rose-100", chip: "bg-rose-100 text-rose-700" },
} as const;

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-3.5 ${accent ? "bg-emerald-50" : "border border-gray-100 bg-white"}`}>
      <div className={`text-[11px] ${accent ? "text-emerald-600" : "text-gray-500"}`}>{label}</div>
      <div className={`text-lg font-bold ${accent ? "text-emerald-800" : "text-gray-800"}`}>{value}</div>
    </div>
  );
}

type Props = {
  profile: ProfileStore;
  onAsk: (text: string) => void;
  onOpenProfile: () => void;
  onLoadSample: () => void;
  onLoadFromDb: () => void;
  onOpenScanner: () => void;
  onOpenSimulator: () => void;
};

export function Dashboard({ profile, onAsk, onOpenProfile, onLoadSample, onLoadFromDb, onOpenScanner, onOpenSimulator }: Props) {
  const s = profile.status;
  const f = profile.finance;
  const dday = s.endDate ? computeDday(s.endDate) : null;
  const net = s.income != null && s.expense != null ? s.income - s.expense : null;
  const filled = hasProfile(profile);
  const name = s.nickname?.trim();

  const runAction = (item: BriefingItem) => {
    if (item.action === "scanner") onOpenScanner();
    else if (item.action === "simulator") onOpenSimulator();
    else onAsk(item.prompt ?? "");
  };

  const briefing = filled ? buildBriefing(profile) : [];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div className="pt-1">
        <h2 className="text-xl font-bold text-gray-800">{name ? `${name}님, 안녕하세요` : "안녕하세요"}</h2>
        <p className="text-sm text-gray-500">오늘도 새봄이 곁에서 도와드릴게요.</p>
      </div>

      {!filled ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-bold text-emerald-800">내 정보를 알려주세요</div>
          <div className="mt-1 text-xs leading-relaxed text-emerald-700">
            보호종료일·정착금·잔액을 입력하면, 새봄이 딱 맞는 브리핑과 배분을 챙겨드려요.
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <button onClick={onOpenProfile} className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white">
              내 정보 입력하기 →
            </button>
            <button onClick={onLoadSample} className="text-xs text-emerald-700 underline">샘플로 둘러보기</button>
            <button onClick={onLoadFromDb} className="text-xs text-emerald-700 underline">DB에서 불러오기</button>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-3xl bg-emerald-50 p-4">
            <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
              ✨ 새봄이 오늘 챙긴 {briefing.length}가지
            </div>
            <div className="flex flex-col gap-2">
              {briefing.map((item, i) => {
                const t = TONE[item.tone];
                return (
                  <button
                    key={i}
                    onClick={() => runAction(item)}
                    className={`flex items-center gap-3 rounded-2xl border ${t.ring} bg-white p-3 text-left transition hover:bg-gray-50`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base ${t.chip}`}>{t.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium leading-tight text-gray-800">{item.title}</span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-gray-500">{item.desc}</span>
                    </span>
                    <span className="text-gray-300">›</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Stat label="보호종료" value={dday?.label || "—"} accent />
            <Stat label="현재 잔액" value={f.balance != null ? formatMan(f.balance) : "—"} accent />
            <Stat label="정착금" value={f.settlement != null ? formatMan(f.settlement) : "—"} />
            <Stat label="월 수지" value={net == null ? "—" : `${net >= 0 ? "+" : "-"}${formatMan(Math.abs(net))}`} />
          </div>
        </>
      )}

      <div>
        <div className="mb-2 text-sm font-bold text-gray-700">바로 쓰기</div>
        <div className="grid grid-cols-2 gap-2.5">
          {FEATURES.map((ft) => (
            <button
              key={ft.title}
              onClick={() => (ft.action === "scanner" ? onOpenScanner() : ft.action === "simulator" ? onOpenSimulator() : onAsk(ft.ask))}
              className="flex flex-col items-start gap-1 rounded-2xl border border-gray-100 bg-white p-3.5 text-left shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/40"
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg ${ft.tint}`}>{ft.icon}</span>
              <span className="mt-1 text-sm font-semibold text-gray-800">{ft.title}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="text-center text-[11px] text-gray-400">아래 입력창에 무엇이든 편하게 물어보세요. 익명이에요.</p>
    </div>
  );
}
