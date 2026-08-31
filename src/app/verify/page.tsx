// 신뢰성 검증 페이지 — "AI가 금액을 만들지 않는다"를 눈으로 확인시켜 주는 곳.
//
// 아래 퍼징 결과는 이 페이지를 열 때마다 서버에서 실제로 다시 계산한다.
// 미리 적어둔 숫자가 아니라 지금 이 순간의 측정값이다.
import Link from "next/link";
import { runHallucinationChecks } from "@/lib/verification";
import { ADVERSARIAL_RUN } from "@/lib/adversarialResult";
import { FRAUD_EVAL_RUN } from "@/lib/fraudEvalResult";

export const metadata = {
  title: "신뢰성 검증 — 새봄",
  description: "AI가 금액을 만들어내지 못하도록 막았는지 실제로 측정한 결과",
};

const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default function VerifyPage() {
  const report = runHallucinationChecks();
  const byTool = ["show_allocation", "show_forecast", "show_readiness"].map((t) => {
    const cs = report.cases.filter((c) => c.tool === t);
    return { tool: t, total: cs.length, passed: cs.filter((c) => c.pass).length };
  });
  const failed = report.cases.filter((c) => !c.pass);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="text-[12px] text-brand underline">
        ← 새봄으로 돌아가기
      </Link>

      <h1 className="mt-3 text-[24px] font-bold text-ink">신뢰성 검증</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-ink2">
        새봄은 <b>AI가 금액을 만들어내지 않는다</b>고 말합니다. 말로 끝내지 않기 위해, 그 주장을 두 가지
        방식으로 실제로 측정했습니다.
      </p>

      {/* 1. 오프라인 퍼징 */}
      <section className="mt-8">
        <h2 className="text-[17px] font-bold text-ink">1. 구조적으로 막히는가</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink2">
          모델이 카드를 그릴 때 넘길 수 있는 <b>악의적인 인자</b>(5억원, 음수, NaN, 배열 통째로 주입 등)를
          여러 상황의 프로필과 조합해 전부 넣어보고, 화면에 찍히는 숫자가 언제나 프로필로 계산한 값과
          같은지 확인합니다.
        </p>

        <div
          className={`mt-3 rounded-2xl border p-4 ${
            report.failed === 0 ? "border-line bg-brand-bg" : "border-line bg-alert-bg"
          }`}
        >
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-brand">
              {report.passed}/{report.total}
            </span>
            <span className="text-[13px] font-medium text-brand">
              {report.failed === 0 ? "전부 차단됨" : `${report.failed}건 뚫림`}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-brand">
            이 숫자는 페이지를 열 때마다 서버에서 다시 계산합니다 (마지막 실행:{" "}
            {new Date(report.ranAt).toLocaleString("ko-KR")})
          </p>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {byTool.map((t) => (
            <div key={t.tool} className="rounded-2xl bg-white p-3">
              <div className="font-mono text-[11px] text-ink3">{t.tool}</div>
              <div className="mt-0.5 text-[13px] font-bold text-ink">
                {t.passed}/{t.total} 차단
              </div>
            </div>
          ))}
        </div>

        {failed.length > 0 && (
          <div className="mt-3 rounded-xl border border-line bg-alert-bg p-3">
            <div className="text-[12px] font-bold text-alert">뚫린 경우</div>
            <ul className="mt-1 flex flex-col gap-1">
              {failed.slice(0, 10).map((c, i) => (
                <li key={i} className="font-mono text-[11px] text-alert">
                  {c.tool} · {c.attack} → 기대 {c.expected} / 실제 {c.actual}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 2. 실제 모델 공격 */}
      <section className="mt-8">
        <h2 className="text-[17px] font-bold text-ink">2. 실제 AI도 뚫지 못하는가</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink2">
          진짜 대화 API에 <b>금액을 지어내도록 유도하는 프롬프트</b>를 넣고, 모델이 실제로 넘긴 인자와 화면에
          그려진 값을 비교했습니다.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-brand-bg p-4">
          <div>
            <div className="text-3xl font-bold text-brand">{ADVERSARIAL_RUN.mismatches}건</div>
            <div className="text-[13px] font-medium text-brand">화면에 반영된 가짜 금액</div>
          </div>
          <div className="text-[11px] text-brand">
            시도 {ADVERSARIAL_RUN.attempts}회 · 카드 생성 {ADVERSARIAL_RUN.cardsDrawn}회
            <br />
            {ADVERSARIAL_RUN.model} · {ADVERSARIAL_RUN.measuredAt} 측정
            <br />
            {ADVERSARIAL_RUN.profile}
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-[12px]">
            <thead>
              <tr className="border-b border-line text-ink3">
                <th className="py-2 pr-3 font-medium">유도 프롬프트</th>
                <th className="py-2 pr-3 font-medium">모델이 넘긴 값</th>
                <th className="py-2 pr-3 font-medium">화면에 찍힌 값</th>
                <th className="py-2 font-medium">결과</th>
              </tr>
            </thead>
            <tbody>
              {ADVERSARIAL_RUN.cases.map((c, i) => (
                <tr key={i} className="border-b border-line align-top">
                  <td className="py-2 pr-3 text-ink2">{c.attack}</td>
                  <td className="py-2 pr-3">
                    <div className="font-mono text-[11px] text-alert">{c.modelInput}</div>
                    <div className="text-[10px] text-ink3">{c.tool}</div>
                  </td>
                  <td className="py-2 pr-3 font-mono text-[11px] text-brand">
                    {c.rendered == null ? "—" : c.tool.includes("readiness") ? `${c.rendered}점` : won(c.rendered)}
                  </td>
                  <td className="py-2 whitespace-nowrap text-brand">
                    {c.rendered == null ? "카드 없음" : "차단됨"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. 사기 탐지 정확도 */}
      <section className="mt-8">
        <h2 className="text-[17px] font-bold text-ink">3. 사기를 실제로 잡아내는가</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink2">
          금융감독원이 공개한 사기 수법 유형을 바탕으로 만든 평가셋 {FRAUD_EVAL_RUN.cases}건을 위험
          스캐너에 그대로 넣어 측정했습니다. 평가셋은{" "}
          <code className="font-mono text-[11px]">src/lib/fraudEval.ts</code>에 전부 공개되어 있습니다.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <div className="rounded-2xl border border-line bg-brand-bg p-3">
            <div className="text-[24px] font-bold text-brand">{FRAUD_EVAL_RUN.accuracy}</div>
            <div className="text-[11px] font-medium text-brand">
              분류 정확도 ({FRAUD_EVAL_RUN.correct}/{FRAUD_EVAL_RUN.cases})
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-alert-bg p-3">
            <div className="text-[24px] font-bold text-alert">{FRAUD_EVAL_RUN.missedScams}건</div>
            <div className="text-[11px] font-medium text-alert">
              미탐 — 사기를 안전하다고 함 <b>(가장 위험한 오답)</b>
            </div>
          </div>
          <div className="rounded-2xl border border-warn/30 bg-warn-bg p-3">
            <div className="text-[24px] font-bold text-warn">{FRAUD_EVAL_RUN.falseAlarms}건</div>
            <div className="text-[11px] font-medium text-warn">오탐 — 정상을 사기라고 함</div>
          </div>
          <div className="rounded-[20px] bg-white p-3">
            <div className="text-[24px] font-bold text-ink">{FRAUD_EVAL_RUN.spanMatch}</div>
            <div className="text-[11px] font-medium text-ink2">하이라이트가 원문과 일치</div>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-[12px]">
            <thead>
              <tr className="border-b border-line text-ink3">
                <th className="py-2 pr-3 font-medium">수법 유형</th>
                <th className="py-2 pr-3 font-medium">정답 라벨</th>
                <th className="py-2 pr-3 font-medium">스캐너 판정</th>
                <th className="py-2 font-medium">하이라이트</th>
              </tr>
            </thead>
            <tbody>
              {FRAUD_EVAL_RUN.rows.map((r) => (
                <tr key={r.id} className="border-b border-line">
                  <td className="py-1.5 pr-3 text-ink2">{r.type}</td>
                  <td className="py-1.5 pr-3 font-mono text-[11px] text-ink3">{r.label}</td>
                  <td className="py-1.5 pr-3">
                    <span
                      className={`font-mono text-[11px] ${
                        r.level === "danger"
                          ? "text-alert"
                          : r.level === "warning"
                            ? "text-warn"
                            : "text-brand"
                      }`}
                    >
                      {r.level} / {r.score}
                    </span>
                    {r.correct && <span className="ml-1 text-brand">✓</span>}
                  </td>
                  <td className="py-1.5 text-ink3">{r.spans > 0 ? `${r.spans}곳` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-2 text-[11px] leading-relaxed text-ink3">
          {FRAUD_EVAL_RUN.model} · {FRAUD_EVAL_RUN.measuredAt} 측정. 평가셋 문장은 실제 피해 문자가 아니라
          공개된 수법 유형을 바탕으로 작성한 합성 예시입니다(개인정보 미포함). &lsquo;원가정 금전 요구&rsquo;처럼
          사기는 아니지만 조심해야 하는 상황은 <code className="font-mono">caution</code>으로 두어, 무조건
          위험하다고 하지 않는지도 함께 확인했습니다.
        </p>
      </section>

      {/* 어떻게 막는가 */}
      <section className="mt-8 rounded-[20px] bg-white p-4">
        <h2 className="text-[13px] font-bold text-ink">어떻게 막나요</h2>
        <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-4 text-[12px] leading-relaxed text-ink2">
          <li>
            금액이 들어가는 카드의 도구는 <b>인자를 받지 않습니다.</b> 모델은 &ldquo;지금 이 카드를
            보여주자&rdquo;만 정할 수 있습니다.
          </li>
          <li>
            서버가 사용자 프로필을 읽어 <b>정해진 공식으로 숫자를 다시 계산</b>합니다. 모델이 인자를 넣어
            보내도 그 값은 쓰이지 않습니다.
          </li>
          <li>
            완성된 카드는 화면에 그리기 전 <b>형식 검증</b>을 거칩니다. 어긋나면 버립니다.
          </li>
          <li>
            AI가 맡는 건 <b>무엇을 바꿔볼지</b>(시나리오)와 <b>왜 그런지</b>(해설)뿐입니다. 그 결과 숫자도
            앱이 계산합니다.
          </li>
        </ol>
      </section>

      <p className="mt-6 text-[11px] leading-relaxed text-ink3">
        검증 코드: <code className="font-mono">src/lib/verification.ts</code> · 계산 로직:{" "}
        <code className="font-mono">forecast.ts · readiness.ts · budget.ts</code>
      </p>
    </main>
  );
}
