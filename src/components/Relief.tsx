"use client";

// "그래서 어떻게 하면 되나" — 현금흐름 예측 아래에 붙는다.
//
// 판단("바닥나요")만 주고 끝내면 사용자는 더 불안해진다.
// 오늘 신청할 수 있는 제도와 그 효과를 숫자로 같이 보여준다.
import { buildReliefs, survivalLabel, HELPLINES } from "@/lib/relief";
import type { ProfileStore } from "@/lib/profile";
import { Icon } from "./Icon";
import { TrustBadge } from "./TrustBadge";

export function Relief({
  profile,
  onOpenBenefits,
}: {
  profile: ProfileStore;
  onOpenBenefits: () => void;
}) {
  const reliefs = buildReliefs(profile).slice(0, 3);

  return (
    <div className="flex flex-col gap-4">
      {reliefs.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2 px-1">
            <h2 className="text-[17px] font-bold tracking-tight text-ink">
              이걸 신청하면 달라져요
            </h2>
            <TrustBadge kind="calc" text="앱이 계산" />
          </div>

          <div className="flex flex-col gap-2.5">
            {reliefs.map(({ benefit, before, after, gainedMonths }) => (
              <div key={benefit.id} className="rounded-[20px] bg-white p-5">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h3 className="text-[17px] font-bold tracking-tight text-ink">{benefit.name}</h3>
                  <span className="text-[13px] font-bold text-brand">{benefit.amount}</span>
                </div>

                {/* 효과를 숫자로 — 이 값이 이 카드의 존재 이유다.
                    숫자만 두면 무엇의 몇 개월인지 알 수 없어서 이름표를 붙인다. */}
                <div className="mt-3.5 flex items-end gap-3 rounded-2xl bg-ground px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold text-ink3">지금</span>
                    <span className="text-[15px] font-bold tabular-nums text-ink3">
                      {survivalLabel(before)}
                    </span>
                  </div>
                  <Icon name="chevronRight" className="mb-1 h-4 w-4 shrink-0 text-ink3" strokeWidth={2.2} />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold text-brand">신청하면</span>
                    <span className="text-[22px] font-extrabold tracking-[-0.03em] tabular-nums text-brand">
                      {survivalLabel(after)}
                    </span>
                  </div>
                  <span className="mb-1 ml-auto text-[12px] font-semibold text-ink3">
                    {gainedMonths >= 25 ? "24개월 넘게" : `${gainedMonths}개월`} 더 버텨요
                  </span>
                </div>

                <p className="mt-3 text-[13px] leading-relaxed text-ink2">{benefit.how}</p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <a
                    href={benefit.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-full bg-ink px-4 py-2.5 text-[13px] font-bold text-white transition hover:opacity-90"
                  >
                    신청 방법 보기
                    <Icon name="chevronRight" className="h-3.5 w-3.5" strokeWidth={2.4} />
                  </a>
                  {benefit.tel && (
                    <a
                      href={`tel:${benefit.tel}`}
                      className="rounded-full bg-white px-4 py-2.5 text-[13px] font-bold text-ink2 ring-1 ring-line transition hover:bg-ground"
                    >
                      {benefit.tel}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={onOpenBenefits}
            className="mt-2.5 w-full rounded-2xl bg-white py-3.5 text-[13px] font-bold text-ink2 transition hover:bg-line/50"
          >
            받을 수 있는 지원제도 전부 보기
          </button>
        </section>
      )}

      {/* 돈이 급할 때 — 상품을 나열하지 않고 사람에게 연결한다 */}
      <section>
        <h2 className="mb-3 px-1 text-[17px] font-bold tracking-tight text-ink">
          지금 당장 막막하다면
        </h2>
        <div className="divide-y divide-line rounded-[20px] bg-white px-5">
          {HELPLINES.map((h) => (
            <div key={h.tel} className="flex items-center gap-3 py-4">
              <div className="min-w-0 flex-1">
                <a
                  href={h.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[15px] font-bold text-ink hover:opacity-70"
                >
                  {h.name}
                </a>
                <p className="mt-0.5 text-[12px] leading-snug text-ink3">{h.desc}</p>
              </div>
              <a
                href={`tel:${h.tel}`}
                className="shrink-0 rounded-full bg-ground px-4 py-2.5 text-[13px] font-bold tabular-nums text-ink transition hover:bg-line"
              >
                {h.tel}
              </a>
            </div>
          ))}
        </div>
        <p className="mt-3 px-1 text-[12px] leading-relaxed text-ink3">
          새봄은 대출을 권하지 않아요. 빌리는 것보다 <b className="font-semibold text-ink2">받을 수 있는
          돈을 먼저 챙기는 것</b>이 순서예요. 이미 빚이 있다면 채무조정으로 이자와 상환기간을 줄일 수
          있어요.
        </p>
      </section>
    </div>
  );
}
