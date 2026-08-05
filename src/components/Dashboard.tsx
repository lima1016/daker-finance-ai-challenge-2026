"use client";

import { computeDday, hasProfile, type ProfileStore } from "@/lib/profile";
import { formatMan } from "@/lib/cards";

const FEATURES = [
  { icon: "🏠", title: "지원제도 찾기", sub: "내가 받을 수 있는 제도", ask: "제가 지금 받을 수 있는 지원제도를 우선순위로 정리해 주세요." },
  { icon: "💰", title: "목돈 관리", sub: "정착금 배분 코칭", budget: true, ask: "" },
  { icon: "🛡️", title: "위험 스캐너", sub: "이거 사기인지 확인", ask: "받은 문자·링크·계약이 사기인지 확인하고 싶어요. 어떻게 하면 되나요?" },
  { icon: "🗓️", title: "할 일 타임라인", sub: "보호종료 전후 순서", ask: "보호종료 전후로 지금부터 무엇을 신청하고 준비해야 하는지 순서대로 알려주세요." },
];

function Stat({ label, value, accent, tone }: { label: string; value: string; accent?: boolean; tone?: "pos" | "neg" }) {
  const color =
    tone === "pos" ? "text-emerald-700" : tone === "neg" ? "text-rose-600" : accent ? "text-emerald-700" : "text-gray-800";
  return (
    <div className={`rounded-2xl border ${accent ? "border-emerald-100" : "border-gray-100"} bg-white p-3`}>
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

type Props = {
  profile: ProfileStore;
  onAsk: (text: string) => void;
  onOpenProfile: () => void;
  onLoadSample: () => void;
  onLoadFromDb: () => void;
  onBudget: () => void;
};

export function Dashboard({ profile, onAsk, onOpenProfile, onLoadSample, onLoadFromDb, onBudget }: Props) {
  const s = profile.status;
  const f = profile.finance;
  const dday = s.endDate ? computeDday(s.endDate) : null;
  const net = s.income != null && s.expense != null ? s.income - s.expense : null;
  const a = f.alloc ?? {};
  const allocTotal = (a.emergency || 0) + (a.living || 0) + (a.saving || 0);
  const filled = hasProfile(profile);
  const name = s.nickname?.trim();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      {/* 인사 */}
      <div className="pt-1">
        <h2 className="text-xl font-bold text-gray-800">{name ? `${name}님, 안녕하세요 🌱` : "안녕하세요 🌱"}</h2>
        <p className="text-sm text-gray-500">오늘도 새봄이 곁에서 도와드릴게요.</p>
      </div>

      {/* 재정 요약 or 온보딩 */}
      {filled ? (
        <div className="grid grid-cols-2 gap-2">
          <Stat label="보호종료" value={dday?.label || "—"} accent />
          <Stat label="현재 잔액" value={f.balance != null ? formatMan(f.balance) : "—"} accent />
          <Stat label="정착금" value={f.settlement != null ? formatMan(f.settlement) : "—"} />
          <Stat
            label="월 수지"
            value={net == null ? "—" : `${net >= 0 ? "+" : "-"}${formatMan(Math.abs(net))}`}
            tone={net == null ? undefined : net >= 0 ? "pos" : "neg"}
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-bold text-emerald-800">내 정보를 알려주세요</div>
          <div className="mt-1 text-xs leading-relaxed text-emerald-700">
            보호종료일·정착금·잔액을 입력하면, 새봄이 딱 맞는 조언과 목돈 배분을 그려드려요.
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <button onClick={onOpenProfile} className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white">
              내 정보 입력하기 →
            </button>
            <button onClick={onLoadSample} className="text-xs text-emerald-700 underline">샘플로 둘러보기</button>
            <button onClick={onLoadFromDb} className="text-xs text-emerald-700 underline">DB에서 불러오기</button>
          </div>
        </div>
      )}

      {/* 목돈 배분 */}
      {allocTotal > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-3">
          <div className="mb-2 text-xs font-semibold text-gray-500">내 목돈 배분</div>
          {[
            { k: "비상금", v: a.emergency || 0, c: "bg-emerald-500" },
            { k: "생활비", v: a.living || 0, c: "bg-sky-500" },
            { k: "저축", v: a.saving || 0, c: "bg-amber-500" },
          ].map((row) => {
            const pct = Math.round((row.v / allocTotal) * 100);
            return (
              <div key={row.k} className="mb-1.5">
                <div className="flex justify-between text-[11px] text-gray-600">
                  <span>{row.k}</span>
                  <span>{formatMan(row.v)} · {pct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className={`h-full ${row.c}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 기능 바로가기 */}
      <div>
        <div className="mb-2 text-sm font-bold text-gray-700">무엇을 도와드릴까요?</div>
        <div className="grid grid-cols-2 gap-2">
          {FEATURES.map((ft) => (
            <button
              key={ft.title}
              onClick={() => ("budget" in ft && ft.budget ? onBudget() : onAsk(ft.ask))}
              className="flex flex-col items-start gap-1 rounded-2xl border border-gray-100 bg-white p-3 text-left shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
            >
              <span className="text-2xl">{ft.icon}</span>
              <span className="text-sm font-semibold text-gray-800">{ft.title}</span>
              <span className="text-[11px] text-gray-500">{ft.sub}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="text-center text-[11px] text-gray-400">아래 입력창에 무엇이든 편하게 물어보세요. 익명이에요.</p>
    </div>
  );
}
