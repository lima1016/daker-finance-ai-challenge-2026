"use client";

import { useId, useMemo, useState } from "react";
import { formatMan } from "@/lib/cards";

// 시리즈 색은 고정 순서로만 배정한다 (순환 금지).
// 대비·색각 검증을 통과한 조합: 밝은 배경(#fff) 기준 전부 3:1 이상.
export const SERIES_COLORS = ["#047857", "#0284c7", "#c2410c", "#7c3aed"] as const;

// 상태색은 예약 — 시리즈 색으로 재사용하지 않는다.
export const STATUS = {
  safe: { color: "#059669", label: "안전" },
  warning: { color: "#c77700", label: "주의" },
  danger: { color: "#f04452", label: "위험" },
} as const;

// SVG는 클래스가 아니라 색 값을 직접 받는다. globals.css의 토큰과 같은 값을 쓴다
// (--color-ink / ink2 / ink3 / line). 토큰을 바꾸면 여기도 함께 고칠 것.
const INK = { primary: "#191f28", secondary: "#4e5968", muted: "#8b95a1", grid: "#e5e8eb" };

// ── 잔액 예측 곡선 ────────────────────────────────────────────

export interface ChartSeries {
  label: string;
  points: number[];
  depletionMonth?: number | null;
}

const W = 400;
const H = 210;
const PAD = { top: 14, right: 76, bottom: 26, left: 8 };

export function BalanceChart({
  labels,
  series,
  className = "",
}: {
  labels: string[];
  series: ChartSeries[];
  className?: string;
}) {
  const gradId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const shown = series.slice(0, SERIES_COLORS.length);
  const len = Math.max(...shown.map((s) => s.points.length));

  const { min, max, x, y } = useMemo(() => {
    const all = shown.flatMap((s) => s.points);
    const rawMax = Math.max(...all, 0);
    const rawMin = Math.min(...all, 0);
    const pad = (rawMax - rawMin) * 0.08 || 1;
    const max = rawMax + pad;
    const min = rawMin - (rawMin < 0 ? pad : 0);
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;
    return {
      min,
      max,
      x: (i: number) => PAD.left + (i / Math.max(1, len - 1)) * plotW,
      y: (v: number) => PAD.top + (1 - (v - min) / (max - min || 1)) * plotH,
    };
  }, [shown, len]);

  const path = (points: number[]) => points.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");

  // 선 끝 직접 라벨 — 겹치면 위아래로 밀어낸다 (색만으로 구분하지 않기 위해)
  const endLabels = useMemo(() => {
    const raw = shown.map((s, i) => ({
      label: s.label,
      color: SERIES_COLORS[i],
      value: s.points[s.points.length - 1],
      y: y(s.points[s.points.length - 1]),
    }));
    const sorted = [...raw].sort((a, b) => a.y - b.y);
    const GAP = 22;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].y - sorted[i - 1].y < GAP) sorted[i].y = sorted[i - 1].y + GAP;
    }
    return sorted;
  }, [shown, y]);

  const zeroY = min < 0 ? y(0) : null;
  const tickEvery = len > 18 ? 6 : len > 9 ? 3 : 2;
  const base = shown[0];

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const plotW = W - PAD.left - PAD.right;
    const i = Math.round(((px - PAD.left) / plotW) * (len - 1));
    setHover(i >= 0 && i < len ? i : null);
  };

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none"
        role="img"
        aria-label={`${labels[0] ?? ""}부터 ${labels[len - 1] ?? ""}까지 잔액 변화 그래프`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES_COLORS[0]} stopOpacity="0.18" />
            <stop offset="100%" stopColor={SERIES_COLORS[0]} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 격자·축은 뒤로 물러나게 */}
        <line x1={PAD.left} y1={PAD.top} x2={W - PAD.right} y2={PAD.top} stroke={INK.grid} strokeWidth="1" />
        <text x={W - PAD.right + 4} y={PAD.top + 4} fontSize="9" fill={INK.muted}>
          {formatMan(max)}
        </text>

        {zeroY != null && (
          <>
            <line
              x1={PAD.left}
              y1={zeroY}
              x2={W - PAD.right}
              y2={zeroY}
              stroke={STATUS.danger.color}
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <text x={PAD.left + 2} y={zeroY - 4} fontSize="9" fill={STATUS.danger.color}>
              0원
            </text>
          </>
        )}

        {/* 기준 곡선만 면으로 채워 시선을 모은다 */}
        {base && (
          <path
            d={`${path(base.points)} L${x(base.points.length - 1)},${y(min)} L${x(0)},${y(min)} Z`}
            fill={`url(#${gradId})`}
          />
        )}

        {shown.map((s, i) => (
          <path
            key={s.label}
            d={path(s.points)}
            fill="none"
            stroke={SERIES_COLORS[i]}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={i === 0 ? undefined : "5 3"}
          />
        ))}

        {/* 잔액이 0을 지나는 지점 */}
        {base?.depletionMonth != null && base.depletionMonth < len && (
          <g>
            <line
              x1={x(base.depletionMonth)}
              y1={PAD.top}
              x2={x(base.depletionMonth)}
              y2={H - PAD.bottom}
              stroke={STATUS.danger.color}
              strokeWidth="1"
              strokeDasharray="2 3"
            />
            <circle
              cx={x(base.depletionMonth)}
              cy={y(base.points[base.depletionMonth])}
              r="5"
              fill={STATUS.danger.color}
              stroke="#fff"
              strokeWidth="2"
            />
          </g>
        )}

        {/* 끝점 직접 라벨 (범례와 함께 이중 표기) */}
        {endLabels.map((l) => (
          <text key={l.label} x={W - PAD.right + 4} y={l.y + 3} fontSize="9.5" fill={INK.secondary}>
            <tspan fill={l.color}>■ </tspan>
            {l.label}
          </text>
        ))}

        {/* x축 월 라벨 */}
        {labels.slice(0, len).map((lab, i) =>
          i % tickEvery === 0 ? (
            <text key={i} x={x(i)} y={H - 8} fontSize="9" fill={INK.muted} textAnchor="middle">
              {lab}
            </text>
          ) : null,
        )}

        {/* 호버 크로스헤어 */}
        {hover != null && (
          <g pointerEvents="none">
            <line
              x1={x(hover)}
              y1={PAD.top}
              x2={x(hover)}
              y2={H - PAD.bottom}
              stroke={INK.muted}
              strokeWidth="1"
            />
            {shown.map((s, i) =>
              s.points[hover] == null ? null : (
                <circle
                  key={s.label}
                  cx={x(hover)}
                  cy={y(s.points[hover])}
                  r="4.5"
                  fill={SERIES_COLORS[i]}
                  stroke="#fff"
                  strokeWidth="2"
                />
              ),
            )}
          </g>
        )}
      </svg>

      {hover != null && (
        <div
          className="pointer-events-none absolute top-1 rounded-xl border border-line bg-white/95 px-2.5 py-1.5 text-[11px] shadow-md"
          style={{
            left: `${Math.min(72, (x(hover) / W) * 100)}%`,
          }}
        >
          <div className="mb-0.5 font-semibold text-ink2">{labels[hover]}</div>
          {shown.map((s, i) => (
            <div key={s.label} className="flex items-center gap-1.5 whitespace-nowrap">
              <span
                className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: SERIES_COLORS[i] }}
              />
              <span className="text-ink3">{s.label}</span>
              <span className="ml-auto font-medium text-ink">{formatMan(s.points[hover] ?? 0)}</span>
            </div>
          ))}
        </div>
      )}

      {shown.length > 1 && (
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
          {shown.map((s, i) => (
            <span key={s.label} className="flex items-center gap-1.5 text-[11px] text-ink2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: SERIES_COLORS[i] }}
              />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 자립 준비도 레이더 ────────────────────────────────────────

const R_SIZE = 200;
const R_CENTER = R_SIZE / 2;
const R_RADIUS = 62;

export function RadarChart({
  axes,
  score,
  className = "",
}: {
  axes: { label: string; value: number }[];
  score: number;
  className?: string;
}) {
  const n = axes.length;
  const point = (i: number, ratio: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [R_CENTER + Math.cos(angle) * R_RADIUS * ratio, R_CENTER + Math.sin(angle) * R_RADIUS * ratio];
  };
  const poly = (ratio: (i: number) => number) =>
    axes.map((_, i) => point(i, ratio(i)).join(",")).join(" ");

  return (
    <svg
      viewBox={`0 0 ${R_SIZE} ${R_SIZE}`}
      className={`w-full ${className}`}
      role="img"
      aria-label={`자립 준비도 ${score}점. ${axes.map((a) => `${a.label} ${a.value}점`).join(", ")}`}
    >
      {[0.25, 0.5, 0.75, 1].map((r) => (
        <polygon key={r} points={poly(() => r)} fill="none" stroke={INK.grid} strokeWidth="1" />
      ))}
      {axes.map((_, i) => {
        const [px, py] = point(i, 1);
        return <line key={i} x1={R_CENTER} y1={R_CENTER} x2={px} y2={py} stroke={INK.grid} strokeWidth="1" />;
      })}

      <polygon
        points={poly((i) => Math.max(0.04, axes[i].value / 100))}
        fill={SERIES_COLORS[0]}
        fillOpacity="0.2"
        stroke={SERIES_COLORS[0]}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {axes.map((a, i) => {
        const [px, py] = point(i, Math.max(0.04, a.value / 100));
        return <circle key={i} cx={px} cy={py} r="4" fill={SERIES_COLORS[0]} stroke="#fff" strokeWidth="2" />;
      })}

      {axes.map((a, i) => {
        const [px, py] = point(i, 1.28);
        return (
          <text
            key={a.label}
            x={px}
            y={py}
            fontSize="10"
            textAnchor={px > R_CENTER + 6 ? "start" : px < R_CENTER - 6 ? "end" : "middle"}
            dominantBaseline="middle"
            fill={INK.secondary}
          >
            {a.label}
            <tspan fill={INK.muted}> {a.value}</tspan>
          </text>
        );
      })}
    </svg>
  );
}

// ── 위험도 게이지 ─────────────────────────────────────────────

export function RiskGauge({
  score,
  level,
  className = "",
}: {
  score: number;
  level: "safe" | "warning" | "danger";
  className?: string;
}) {
  const st = STATUS[level];
  const r = 44;
  const circumference = Math.PI * r; // 반원
  const filled = (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg viewBox="0 0 110 62" className="w-24 shrink-0" role="img" aria-label={`위험도 ${score}점, ${st.label}`}>
        <path d={`M 11 55 A ${r} ${r} 0 0 1 99 55`} fill="none" stroke={INK.grid} strokeWidth="9" strokeLinecap="round" />
        <path
          d={`M 11 55 A ${r} ${r} 0 0 1 99 55`}
          fill="none"
          stroke={st.color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
        />
        <text x="55" y="50" fontSize="22" fontWeight="700" textAnchor="middle" fill={INK.primary}>
          {Math.round(score)}
        </text>
      </svg>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: st.color }}>
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: st.color }}
          />
          <span>{st.label}</span>
        </div>
        <div className="text-[11px] text-ink3">위험도 {Math.round(score)} / 100</div>
      </div>
    </div>
  );
}
