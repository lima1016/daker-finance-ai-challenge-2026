import {
  parseSegments,
  formatMan,
  type BudgetCard as BudgetCardT,
  type TimelineCard as TimelineCardT,
  type RiskCard as RiskCardT,
} from "@/lib/cards";

const BAR_COLORS = ["bg-emerald-500", "bg-sky-500", "bg-amber-500", "bg-violet-500", "bg-rose-500"];

function BudgetCard({ card }: { card: BudgetCardT }) {
  const total = card.total || card.items.reduce((s, it) => s + it.amount, 0);
  return (
    <div className="my-2 rounded-xl border border-emerald-100 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs font-semibold text-gray-500">목돈 배분</span>
        <span className="text-sm font-bold text-emerald-700">총 {formatMan(total)}</span>
      </div>
      <div className="flex flex-col gap-2">
        {card.items.map((it, idx) => {
          const pct = total > 0 ? Math.round((it.amount / total) * 100) : 0;
          return (
            <div key={idx}>
              <div className="mb-0.5 flex items-baseline justify-between text-xs">
                <span className="font-medium text-gray-800">{it.label}</span>
                <span className="text-gray-500">
                  {formatMan(it.amount)} · {pct}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className={`h-full ${BAR_COLORS[idx % BAR_COLORS.length]}`} style={{ width: `${pct}%` }} />
              </div>
              {it.desc && <p className="mt-0.5 text-[11px] text-gray-400">{it.desc}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimelineCard({ card }: { card: TimelineCardT }) {
  return (
    <div className="my-2 rounded-xl border border-sky-100 bg-white p-3 shadow-sm">
      {card.title && <div className="mb-2 text-xs font-semibold text-gray-500">{card.title}</div>}
      <ol className="relative flex flex-col gap-3 border-l border-sky-200 pl-4">
        {card.steps.map((s, idx) => (
          <li key={idx} className="relative">
            <span
              className={`absolute -left-[21px] top-0.5 h-3 w-3 rounded-full border-2 ${
                s.done ? "border-emerald-500 bg-emerald-500" : "border-sky-400 bg-white"
              }`}
            />
            <div className="text-[11px] font-semibold text-sky-600">{s.when}</div>
            <div className="text-sm font-medium text-gray-800">{s.title}</div>
            {s.desc && <div className="text-xs text-gray-500">{s.desc}</div>}
          </li>
        ))}
      </ol>
    </div>
  );
}

const RISK_STYLE = {
  danger: { emoji: "🔴", ring: "border-rose-200", head: "text-rose-700", chip: "bg-rose-50" },
  warning: { emoji: "🟡", ring: "border-amber-200", head: "text-amber-700", chip: "bg-amber-50" },
  safe: { emoji: "🟢", ring: "border-emerald-200", head: "text-emerald-700", chip: "bg-emerald-50" },
} as const;

function RiskCard({ card }: { card: RiskCardT }) {
  const st = RISK_STYLE[card.level] ?? RISK_STYLE.warning;
  return (
    <div className={`my-2 rounded-xl border ${st.ring} bg-white p-3 shadow-sm`}>
      <div className={`flex items-center gap-2 text-sm font-bold ${st.head}`}>
        <span className="text-lg">{st.emoji}</span>
        <span>{card.title}</span>
      </div>
      {card.reasons && card.reasons.length > 0 && (
        <div className="mt-2">
          <div className="text-[11px] font-semibold text-gray-500">왜 위험한가요</div>
          <ul className="mt-1 flex flex-col gap-1">
            {card.reasons.map((r, i) => (
              <li key={i} className="text-xs text-gray-700">• {r}</li>
            ))}
          </ul>
        </div>
      )}
      {card.actions && card.actions.length > 0 && (
        <div className={`mt-2 rounded-lg ${st.chip} p-2`}>
          <div className="text-[11px] font-semibold text-gray-600">지금 할 일</div>
          <ul className="mt-1 flex flex-col gap-1">
            {card.actions.map((a, i) => (
              <li key={i} className="text-xs font-medium text-gray-800">✓ {a}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** 어시스턴트 메시지 본문: 텍스트 + 카드 혼합 렌더링 */
export function MessageContent({ content }: { content: string }) {
  const segments = parseSegments(content);
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.kind === "text") {
          return (
            <p key={i} className="whitespace-pre-wrap">
              {seg.text.trim()}
            </p>
          );
        }
        if (seg.card.type === "budget") return <BudgetCard key={i} card={seg.card} />;
        if (seg.card.type === "timeline") return <TimelineCard key={i} card={seg.card} />;
        if (seg.card.type === "risk") return <RiskCard key={i} card={seg.card} />;
        return null;
      })}
    </>
  );
}
