"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  computeDday,
  sampleProfile,
  DEFAULT_PROFILE,
  HOUSING_OPTIONS,
  WORK_OPTIONS,
  REGION_OPTIONS,
  type ProfileStore,
} from "@/lib/profile";
import { formatMan } from "@/lib/cards";

type Props = {
  open: boolean;
  onClose: () => void;
  data: ProfileStore;
  setData: Dispatch<SetStateAction<ProfileStore>>;
  /** DB에서 값을 읽어 온다. 저장은 하지 않고 임시 입력값에만 채운다 */
  onFetchFromDb: () => Promise<ProfileStore | null>;
};

// 만원 단위 입력 <-> 원 단위 저장 변환
const wonFromMan = (v: string): number | undefined => {
  const t = v.replace(/[, ]/g, "").trim();
  if (t === "") return undefined;
  const n = Number(t);
  return isNaN(n) ? undefined : Math.round(n * 10000);
};
const manFromWon = (v?: number): string => (v == null ? "" : String(v / 10000));

/**
 * 입력 한 칸.
 *
 * 테두리 대신 회색 배경으로 입력 영역을 표시한다. 폼이 길 때 테두리를 두르면
 * 선이 10개 넘게 쌓여 어디를 채워야 할지 보이지 않는다.
 */
function Field({
  label,
  suffix,
  children,
}: {
  label: string;
  suffix?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="px-1 text-[12px] font-semibold text-ink3">{label}</span>
      <span className="relative flex items-center">
        {children}
        {suffix && (
          <span className="pointer-events-none absolute right-4 text-[13px] font-semibold text-ink3">
            {suffix}
          </span>
        )}
      </span>
    </label>
  );
}

const inputCls =
  "w-full min-w-0 rounded-2xl bg-ground px-4 py-3.5 text-[15px] font-semibold text-ink outline-none transition placeholder:font-medium placeholder:text-ink3 focus:bg-line/70";

/**
 * 정해진 선택지 중에서 고르는 입력.
 * 예전에 자유 입력으로 저장된 값(또는 DB에서 불러온 값)이 목록에 없으면
 * 지워버리지 않고 맨 위에 그대로 남겨 보여준다.
 */
function Choice({
  value,
  options,
  onChange,
}: {
  value?: string;
  options: readonly string[];
  onChange: (v: string | undefined) => void;
}) {
  const unknown = value && !options.includes(value) ? value : null;
  return (
    <select
      className={`${inputCls} appearance-none pr-10`}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || undefined)}
    >
      <option value="">선택해 주세요</option>
      {unknown && <option value={unknown}>{unknown} (예전 입력)</option>}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function Summary({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <div>
      <div className="text-[12px] font-medium text-ink3">{label}</div>
      <div
        className={`mt-1 whitespace-nowrap text-[19px] font-extrabold tracking-[-0.03em] tabular-nums ${
          alert ? "text-alert" : "text-ink"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export function ProfilePanel({ open, onClose, data, setData, onFetchFromDb }: Props) {
  // 입력은 임시값(draft)에만 쌓고, 저장은 '저장하기'를 눌러야 일어난다.
  // 예전에는 글자를 칠 때마다 바로 저장돼서, 잘못 눌렀다 닫아도 되돌릴 수 없었다.
  const [draft, setDraft] = useState<ProfileStore>(data);

  // 패널을 열 때마다 저장된 값으로 되돌린다.
  // effect 대신 렌더 중에 맞추는 React 권장 방식 — 여분의 렌더가 생기지 않는다.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(data);
  }

  const s = draft.status;
  const f = draft.finance;
  const dirty = JSON.stringify(draft) !== JSON.stringify(data);

  const save = () => {
    setData(draft);
    onClose();
  };

  const setStatus = (patch: Partial<ProfileStore["status"]>) =>
    setDraft((p) => ({ ...p, status: { ...p.status, ...patch } }));
  const setFinance = (patch: Partial<ProfileStore["finance"]>) =>
    setDraft((p) => ({ ...p, finance: { ...p.finance, ...patch } }));
  const setAlloc = (patch: Partial<NonNullable<ProfileStore["finance"]["alloc"]>>) =>
    setDraft((p) => ({ ...p, finance: { ...p.finance, alloc: { ...p.finance.alloc, ...patch } } }));

  const dday = s.endDate ? computeDday(s.endDate) : null;
  const a = f.alloc ?? {};
  const allocTotal = (a.emergency || 0) + (a.living || 0) + (a.saving || 0);
  const net = s.income != null && s.expense != null ? s.income - s.expense : null;

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      {/* 배경 */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-ink/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
      />
      {/* 패널 */}
      <div
        className={`absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col bg-ground transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between bg-white px-5 py-4">
          <h2 className="text-[19px] font-extrabold tracking-tight text-ink">내 정보</h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-ground text-ink2 transition hover:bg-line"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className="h-4 w-4" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="flex flex-col gap-5">
            {/* 요약 */}
            <div className="grid grid-cols-2 gap-y-4 rounded-[20px] bg-white p-5">
              <Summary label="보호종료" value={dday?.label || "—"} />
              <Summary label="현재 잔액" value={f.balance != null ? formatMan(f.balance) : "—"} />
              <Summary label="정착금" value={f.settlement != null ? formatMan(f.settlement) : "—"} />
              <Summary
                label={net != null && net < 0 ? "매달 모자란 돈" : "매달 남는 돈"}
                alert={net != null && net < 0}
                value={net == null ? "—" : formatMan(Math.abs(net))}
              />
            </div>

            {/* 배분 막대 — 색은 브랜드 + 무채색 명도차로만 구분한다 */}
            {allocTotal > 0 && (
              <div className="rounded-[20px] bg-white p-5">
                <div className="mb-3.5 text-[15px] font-bold text-ink">용도별 배분</div>
                <div className="flex flex-col gap-3">
                  {[
                    { k: "비상금", v: a.emergency || 0, c: "bg-brand" },
                    { k: "생활비", v: a.living || 0, c: "bg-ink2" },
                    { k: "저축", v: a.saving || 0, c: "bg-ink3" },
                  ].map((row) => {
                    const pct = Math.round((row.v / allocTotal) * 100);
                    return (
                      <div key={row.k}>
                        <div className="mb-1.5 flex justify-between text-[12px]">
                          <span className="font-semibold text-ink2">{row.k}</span>
                          <span className="font-semibold tabular-nums text-ink3">
                            {formatMan(row.v)} · {pct}%
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-ground">
                          <div className={`h-full rounded-full ${row.c}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 내 상태 */}
            <div className="rounded-[20px] bg-white p-5">
              <h3 className="mb-4 text-[15px] font-bold text-ink">기본 정보</h3>
              <div className="flex flex-col gap-3.5">
                <Field label="닉네임">
                  <input
                    className={inputCls}
                    value={s.nickname ?? ""}
                    onChange={(e) => setStatus({ nickname: e.target.value })}
                    placeholder="예) 새봄이"
                  />
                </Field>
                <Field label="보호종료(예정)일">
                  <input
                    type="date"
                    className={inputCls}
                    value={s.endDate ?? ""}
                    onChange={(e) => setStatus({ endDate: e.target.value })}
                  />
                </Field>
                <Field label="거주 지역">
                  <Choice
                    value={s.region}
                    options={REGION_OPTIONS}
                    onChange={(region) => setStatus({ region })}
                  />
                </Field>
                <Field label="주거 상태">
                  <Choice
                    value={s.housing}
                    options={HOUSING_OPTIONS}
                    onChange={(housing) => setStatus({ housing })}
                  />
                </Field>
                <Field label="근로 상태">
                  <Choice value={s.work} options={WORK_OPTIONS} onChange={(work) => setStatus({ work })} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="월 수입" suffix="만원">
                    <input
                      type="number"
                      inputMode="numeric"
                      className={`${inputCls} pr-14`}
                      value={manFromWon(s.income)}
                      onChange={(e) => setStatus({ income: wonFromMan(e.target.value) })}
                      placeholder="120"
                    />
                  </Field>
                  <Field label="월 지출" suffix="만원">
                    <input
                      type="number"
                      inputMode="numeric"
                      className={`${inputCls} pr-14`}
                      value={manFromWon(s.expense)}
                      onChange={(e) => setStatus({ expense: wonFromMan(e.target.value) })}
                      placeholder="90"
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* 내 재정 */}
            <div className="rounded-[20px] bg-white p-5">
              <h3 className="mb-4 text-[15px] font-bold text-ink">내 돈</h3>
              <div className="flex flex-col gap-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="정착금 총액" suffix="만원">
                    <input
                      type="number"
                      inputMode="numeric"
                      className={`${inputCls} pr-14`}
                      value={manFromWon(f.settlement)}
                      onChange={(e) => setFinance({ settlement: wonFromMan(e.target.value) })}
                      placeholder="1500"
                    />
                  </Field>
                  <Field label="자립수당 (월)" suffix="만원">
                    <input
                      type="number"
                      inputMode="numeric"
                      className={`${inputCls} pr-14`}
                      value={manFromWon(f.allowance)}
                      onChange={(e) => setFinance({ allowance: wonFromMan(e.target.value) })}
                      placeholder="50"
                    />
                  </Field>
                </div>
                <Field label="현재 통장 잔액" suffix="만원">
                  <input
                    type="number"
                    inputMode="numeric"
                    className={`${inputCls} pr-14`}
                    value={manFromWon(f.balance)}
                    onChange={(e) => setFinance({ balance: wonFromMan(e.target.value) })}
                    placeholder="1300"
                  />
                </Field>

                <div className="mt-1">
                  <div className="mb-2.5 px-1 text-[12px] font-semibold text-ink3">
                    용도별 배분 (만원)
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Field label="비상금">
                      <input
                        type="number"
                        inputMode="numeric"
                        className={inputCls}
                        value={manFromWon(a.emergency)}
                        onChange={(e) => setAlloc({ emergency: wonFromMan(e.target.value) })}
                        placeholder="450"
                      />
                    </Field>
                    <Field label="생활비">
                      <input
                        type="number"
                        inputMode="numeric"
                        className={inputCls}
                        value={manFromWon(a.living)}
                        onChange={(e) => setAlloc({ living: wonFromMan(e.target.value) })}
                        placeholder="600"
                      />
                    </Field>
                    <Field label="저축">
                      <input
                        type="number"
                        inputMode="numeric"
                        className={inputCls}
                        value={manFromWon(a.saving)}
                        onChange={(e) => setAlloc({ saving: wonFromMan(e.target.value) })}
                        placeholder="450"
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </div>

            {/* 보조 동작 — 주 버튼과 섞이지 않게 약하게 둔다 */}
            <div className="flex items-center justify-center gap-1 text-[12px] font-semibold text-ink3">
              <button
                onClick={async () => {
                  const loaded = await onFetchFromDb();
                  if (loaded) setDraft(loaded);
                }}
                className="rounded-xl px-2 py-1 hover:text-ink2"
              >
                DB에서 불러오기
              </button>
              <span aria-hidden>·</span>
              <button
                onClick={() => setDraft(sampleProfile())}
                className="rounded-xl px-2 py-1 hover:text-ink2"
              >
                샘플 데이터
              </button>
              <span aria-hidden>·</span>
              <button
                onClick={() => setDraft(DEFAULT_PROFILE)}
                className="rounded-xl px-2 py-1 hover:text-ink2"
              >
                초기화
              </button>
            </div>

            <p className="text-center text-[12px] leading-relaxed text-ink3">
              입력한 정보는 이 기기에만 저장되며(익명), 새봄이 답변에 참고합니다.
            </p>
          </div>
        </div>

        {/* 입력은 즉시 저장되지만, 끝내는 버튼이 없으면 언제 끝났는지 알 수 없다 */}
        <div className="shrink-0 bg-white px-5 pb-5 pt-4">
          {dirty && (
            <p className="mb-2.5 text-center text-[12px] font-medium text-ink3">
              저장하지 않고 닫으면 입력한 내용이 사라져요
            </p>
          )}
          <div className="flex gap-2">
            {dirty && (
              <button
                onClick={onClose}
                className="flex-1 rounded-2xl bg-ground py-4 text-[15px] font-bold text-ink2 transition hover:bg-line"
              >
                취소
              </button>
            )}
            <button
              onClick={dirty ? save : onClose}
              className="flex-[2] rounded-2xl bg-ink py-4 text-[15px] font-bold text-white transition hover:opacity-90"
            >
              {dirty ? "저장하기" : "닫기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
