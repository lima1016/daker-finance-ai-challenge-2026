"use client";

import type { Dispatch, SetStateAction } from "react";
import { computeDday, sampleProfile, DEFAULT_PROFILE, type ProfileStore } from "@/lib/profile";
import { formatMan } from "@/lib/cards";

type Props = {
  open: boolean;
  onClose: () => void;
  data: ProfileStore;
  setData: Dispatch<SetStateAction<ProfileStore>>;
  onLoadFromDb: () => void;
};

// 만원 단위 입력 <-> 원 단위 저장 변환
const wonFromMan = (v: string): number | undefined => {
  const t = v.replace(/[, ]/g, "").trim();
  if (t === "") return undefined;
  const n = Number(t);
  return isNaN(n) ? undefined : Math.round(n * 10000);
};
const manFromWon = (v?: number): string => (v == null ? "" : String(v / 10000));

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-400";

export function ProfilePanel({ open, onClose, data, setData, onLoadFromDb }: Props) {
  const s = data.status;
  const f = data.finance;

  const setStatus = (patch: Partial<ProfileStore["status"]>) =>
    setData((p) => ({ ...p, status: { ...p.status, ...patch } }));
  const setFinance = (patch: Partial<ProfileStore["finance"]>) =>
    setData((p) => ({ ...p, finance: { ...p.finance, ...patch } }));
  const setAlloc = (patch: Partial<NonNullable<ProfileStore["finance"]["alloc"]>>) =>
    setData((p) => ({ ...p, finance: { ...p.finance, alloc: { ...p.finance.alloc, ...patch } } }));

  const dday = s.endDate ? computeDday(s.endDate) : null;
  const a = f.alloc ?? {};
  const allocTotal = (a.emergency || 0) + (a.living || 0) + (a.saving || 0);
  const net = s.income != null && s.expense != null ? s.income - s.expense : null;

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      {/* 배경 */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/30 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
      />
      {/* 패널 */}
      <div
        className={`absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-gray-50 shadow-xl transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <h2 className="text-base font-bold text-gray-800">내 정보</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100" aria-label="닫기">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* 요약 */}
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-emerald-100 bg-white p-3">
              <div className="text-[11px] text-gray-500">보호종료</div>
              <div className="text-lg font-bold text-emerald-700">{dday?.label || "—"}</div>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white p-3">
              <div className="text-[11px] text-gray-500">현재 잔액</div>
              <div className="text-lg font-bold text-emerald-700">
                {f.balance != null ? formatMan(f.balance) : "—"}
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-3">
              <div className="text-[11px] text-gray-500">정착금</div>
              <div className="text-sm font-semibold text-gray-800">
                {f.settlement != null ? formatMan(f.settlement) : "—"}
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-3">
              <div className="text-[11px] text-gray-500">월 수지</div>
              <div className={`text-sm font-semibold ${net == null ? "text-gray-800" : net >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                {net == null ? "—" : `${net >= 0 ? "+" : "-"}${formatMan(Math.abs(net))}`}
              </div>
            </div>
          </div>

          {/* 배분 막대 */}
          {allocTotal > 0 && (
            <div className="mb-4 rounded-xl border border-gray-100 bg-white p-3">
              <div className="mb-2 text-xs font-semibold text-gray-500">용도별 배분</div>
              {[
                { k: "비상금", v: a.emergency || 0, c: "bg-emerald-500" },
                { k: "생활비", v: a.living || 0, c: "bg-sky-500" },
                { k: "저축", v: a.saving || 0, c: "bg-amber-500" },
              ].map((row) => {
                const pct = allocTotal > 0 ? Math.round((row.v / allocTotal) * 100) : 0;
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

          {/* 내 상태 */}
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-bold text-gray-700">내 상태</h3>
            <div className="flex flex-col gap-3">
              <Field label="닉네임">
                <input className={inputCls} value={s.nickname ?? ""} onChange={(e) => setStatus({ nickname: e.target.value })} placeholder="예) 새봄이" />
              </Field>
              <Field label="보호종료(예정)일">
                <input type="date" className={inputCls} value={s.endDate ?? ""} onChange={(e) => setStatus({ endDate: e.target.value })} />
              </Field>
              <Field label="주거 상태">
                <input className={inputCls} value={s.housing ?? ""} onChange={(e) => setStatus({ housing: e.target.value })} placeholder="예) 원룸 월세 / LH임대 / 자립생활관 / 미정" />
              </Field>
              <Field label="근로 상태">
                <input className={inputCls} value={s.work ?? ""} onChange={(e) => setStatus({ work: e.target.value })} placeholder="예) 재직 중 / 구직 중 / 학생" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="월 수입 (만원)">
                  <input type="number" inputMode="numeric" className={inputCls} value={manFromWon(s.income)} onChange={(e) => setStatus({ income: wonFromMan(e.target.value) })} placeholder="120" />
                </Field>
                <Field label="월 지출 (만원)">
                  <input type="number" inputMode="numeric" className={inputCls} value={manFromWon(s.expense)} onChange={(e) => setStatus({ expense: wonFromMan(e.target.value) })} placeholder="90" />
                </Field>
              </div>
            </div>
          </div>

          {/* 내 재정 */}
          <div className="mb-2">
            <h3 className="mb-2 text-sm font-bold text-gray-700">내 재정</h3>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="정착금 총액 (만원)">
                  <input type="number" inputMode="numeric" className={inputCls} value={manFromWon(f.settlement)} onChange={(e) => setFinance({ settlement: wonFromMan(e.target.value) })} placeholder="1500" />
                </Field>
                <Field label="자립수당·월 (만원)">
                  <input type="number" inputMode="numeric" className={inputCls} value={manFromWon(f.allowance)} onChange={(e) => setFinance({ allowance: wonFromMan(e.target.value) })} placeholder="50" />
                </Field>
              </div>
              <Field label="현재 통장 잔액 (만원)">
                <input type="number" inputMode="numeric" className={inputCls} value={manFromWon(f.balance)} onChange={(e) => setFinance({ balance: wonFromMan(e.target.value) })} placeholder="1300" />
              </Field>
              <div className="rounded-xl border border-gray-100 bg-white p-3">
                <div className="mb-2 text-xs font-medium text-gray-600">용도별 배분 (만원)</div>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="비상금">
                    <input type="number" inputMode="numeric" className={inputCls} value={manFromWon(a.emergency)} onChange={(e) => setAlloc({ emergency: wonFromMan(e.target.value) })} placeholder="450" />
                  </Field>
                  <Field label="생활비">
                    <input type="number" inputMode="numeric" className={inputCls} value={manFromWon(a.living)} onChange={(e) => setAlloc({ living: wonFromMan(e.target.value) })} placeholder="600" />
                  </Field>
                  <Field label="저축">
                    <input type="number" inputMode="numeric" className={inputCls} value={manFromWon(a.saving)} onChange={(e) => setAlloc({ saving: wonFromMan(e.target.value) })} placeholder="450" />
                  </Field>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <button
              onClick={onLoadFromDb}
              className="rounded-lg border border-emerald-300 bg-emerald-50 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
            >
              DB에서 사용자 불러오기
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setData(sampleProfile())}
                className="flex-1 rounded-lg border border-emerald-200 bg-white py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
              >
                샘플 데이터
              </button>
              <button
                onClick={() => setData(DEFAULT_PROFILE)}
                className="flex-1 rounded-lg border border-gray-200 bg-white py-2 text-xs text-gray-500 hover:bg-gray-50"
              >
                초기화
              </button>
            </div>
          </div>

          <p className="mt-3 text-center text-[10px] text-gray-400">
            입력한 정보는 이 기기에만 저장되며(익명), 새봄이 답변에 참고합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
