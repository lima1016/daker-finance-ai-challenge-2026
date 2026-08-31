"use client";

// 지원제도 찾기 — 목록과 공식 링크를 눈으로 훑는 화면.
//
// 챗봇(새봄에게 물어보기)과 역할이 다르다. 챗봇은 '알고 물어보는 사람'용이고,
// 이 화면은 '뭐가 있는지 모르는 사람'용이다. 기획서의 핵심 문제가
// "받을 수 있는 제도를 모름"이라, 목록을 훑는 경험이 따로 있어야 한다.
//
// 금액·조건은 전부 benefits.ts에 적힌 확인된 값이다. AI가 만들지 않는다.
import { BENEFITS, CATEGORY_LABEL, isStale, sortBenefits, type Benefit } from "@/lib/benefits";
import type { ProfileStore } from "@/lib/profile";
import { Icon } from "./Icon";
import { SectionTitle } from "./home/Section";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-2.5">
      <span className="w-[52px] shrink-0 text-[12px] font-semibold text-ink3">{label}</span>
      <span className="min-w-0 flex-1 text-[13px] leading-relaxed text-ink2">{value}</span>
    </div>
  );
}

function BenefitCard({
  b,
  profile,
  urgent,
  onAsk,
}: {
  b: Benefit;
  profile: ProfileStore;
  urgent: boolean;
  onAsk: (text: string) => void;
}) {
  // 지역을 알면 범위 대신 정확한 금액을 보여준다
  const exactAmount = b.amountFor?.(profile) ?? null;
  const amount = exactAmount ?? b.amount;
  const exact = Boolean(exactAmount);
  const caution = b.cautionFor?.(profile) ?? b.caution;

  return (
    <article className="rounded-[20px] bg-white p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-ground px-2.5 py-1 text-[11px] font-bold text-ink3">
          {CATEGORY_LABEL[b.category]}
        </span>
        {b.regional && (
          <span className="rounded-full bg-ground px-2.5 py-1 text-[11px] font-bold text-ink3">
            {profile.status.region?.trim() ? `${profile.status.region} 기준` : "지역별로 다름"}
          </span>
        )}
        {urgent && (
          <span className="rounded-full bg-alert-bg px-2.5 py-1 text-[11px] font-bold text-alert">
            지금 챙기세요
          </span>
        )}
        {isStale(b) && (
          <span className="rounded-full bg-ground px-2.5 py-1 text-[11px] font-bold text-ink3">
            정보 확인 필요
          </span>
        )}
      </div>

      <h3 className="mt-3 text-[19px] font-extrabold tracking-tight text-ink">{b.name}</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-ink3">{b.summary}</p>

      <p className="mt-3.5 text-[22px] font-extrabold tracking-[-0.03em] text-brand">{amount}</p>
      {exact && (
        <p className="mt-1 text-[12px] font-semibold text-ink3">내 지역 기준 금액이에요</p>
      )}

      <div className="mt-3 divide-y divide-line border-t border-line">
        <Row label="대상" value={b.target} />
        <Row label="신청" value={b.how} />
        {b.tel && <Row label="전화" value={b.tel} />}
      </div>

      {caution && (
        <p className="mt-3 rounded-2xl bg-ground px-4 py-3 text-[12px] leading-relaxed text-ink2">
          {caution}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a
          href={b.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 rounded-full bg-ink px-4 py-2.5 text-[13px] font-bold text-white transition hover:opacity-90"
        >
          공식 안내 보기
          <Icon name="chevronRight" className="h-3.5 w-3.5" strokeWidth={2.4} />
        </a>
        <button
          onClick={() => onAsk(`${b.name}에 대해 알려주세요. 제 상황에서 받을 수 있는지, 어떻게 신청하는지 궁금해요.`)}
          className="rounded-full bg-white px-4 py-2.5 text-[13px] font-bold text-ink2 ring-1 ring-line transition hover:bg-ground"
        >
          새봄에게 묻기
        </button>
      </div>

      <p className="mt-3 text-[11px] leading-snug text-ink3">
        출처: {b.source} · {b.checkedAt} 확인
      </p>
    </article>
  );
}

export function Benefits({
  profile,
  onAsk,
  onOpenProfile,
}: {
  profile: ProfileStore;
  onAsk: (text: string) => void;
  onOpenProfile: () => void;
}) {
  const list = sortBenefits(profile);
  const urgentCount = BENEFITS.filter((b) => b.urgentFor?.(profile)).length;
  const noRegion = !profile.status.region?.trim();

  return (
    <div className="flex flex-col gap-6">
      <header className="px-1 pt-1">
        <h1 className="text-[26px] font-extrabold leading-[1.3] tracking-[-0.03em] text-ink md:text-[30px]">
          받을 수 있는 지원제도
        </h1>
        <p className="mt-2.5 text-[14px] leading-relaxed text-ink3">
          {urgentCount > 0 ? (
            <>
              지금 상황에서 특히 급한 <b className="font-bold text-alert">{urgentCount}가지</b>를 위로
              올렸어요. 금액과 조건은 전부 공식 자료 그대로예요.
            </>
          ) : (
            "금액과 조건은 전부 공식 자료 그대로예요. 새봄이 지어낸 숫자가 아니에요."
          )}
        </p>
      </header>

      {/* 자립정착금은 지역별로 2배까지 차이 난다 — 범위로만 보여주면 계획을 세울 수 없다 */}
      {noRegion && (
        <button
          onClick={onOpenProfile}
          className="flex w-full items-center gap-3 rounded-[20px] bg-white p-5 text-left transition hover:bg-white/70"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ground text-ink2">
            <Icon name="home" className="h-5 w-5" strokeWidth={1.9} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold text-ink">거주 지역을 알려주세요</span>
            <span className="mt-0.5 block text-[12px] leading-snug text-ink3">
              자립정착금은 지역에 따라 1,000만원에서 2,000만원까지 차이가 나요
            </span>
          </span>
          <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-ink3" strokeWidth={2.2} />
        </button>
      )}

      <section>
        <SectionTitle>제도 {list.length}가지</SectionTitle>
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((b) => (
            <BenefitCard
              key={b.id}
              b={b}
              profile={profile}
              urgent={Boolean(b.urgentFor?.(profile))}
              onAsk={onAsk}
            />
          ))}
        </div>
      </section>

      <p className="px-1 text-[12px] leading-relaxed text-ink3">
        제도는 해마다 바뀌고 지자체마다 다릅니다. 신청 전에 반드시 공식 안내나 관할 행정복지센터에서
        확인하세요. 어디에 물어야 할지 모르겠다면 자립준비청년 상담센터(1855-2455)에서 먼저 상담받을 수
        있어요.
      </p>
    </div>
  );
}
