// 사기 탐지 평가셋 실측 결과 (재측정하면 이 파일을 갱신한다).
//
// 평가셋 자체는 fraudEval.ts에 그대로 공개되어 있어 누구든 확인할 수 있다.
// 측정은 실제 /api/scan 과 같은 경로(같은 프롬프트·스키마·RAG)로 돌렸다.

export interface FraudEvalRow {
  id: string;
  label: "scam" | "caution" | "safe";
  type: string;
  level: "danger" | "warning" | "safe";
  score: number;
  spans: number;
  correct: boolean;
}

export const FRAUD_EVAL_RUN = {
  measuredAt: "2026-08-15",
  model: "gemini-3.5-flash",
  cases: 19,
  correct: 19,
  accuracy: "100%",
  /** 사기를 안전하다고 한 경우 — 이 앱에서 가장 위험한 오답 */
  missedScams: 0,
  /** 정상 메시지를 사기라고 한 경우 */
  falseAlarms: 0,
  /** 하이라이트가 원문에 그대로 존재한 비율 */
  spanMatch: "15/15",
  rows: [
    { id: "scam-01", label: "scam", type: "통장 대여", level: "danger", score: 100, spans: 2, correct: true },
    { id: "scam-02", label: "scam", type: "통장 대여(알바 가장)", level: "danger", score: 95, spans: 2, correct: true },
    { id: "scam-03", label: "scam", type: "명의 대여", level: "danger", score: 95, spans: 1, correct: true },
    { id: "scam-04", label: "scam", type: "체크카드·비밀번호 요구", level: "danger", score: 100, spans: 1, correct: true },
    { id: "scam-05", label: "scam", type: "대출 빙자(선입금)", level: "danger", score: 95, spans: 1, correct: true },
    { id: "scam-06", label: "scam", type: "대출 빙자(보증보험료)", level: "danger", score: 95, spans: 1, correct: true },
    { id: "scam-07", label: "scam", type: "수사기관 사칭", level: "danger", score: 100, spans: 2, correct: true },
    { id: "scam-08", label: "scam", type: "금융기관 사칭", level: "danger", score: 95, spans: 2, correct: true },
    { id: "scam-09", label: "scam", type: "스미싱(택배 사칭)", level: "danger", score: 95, spans: 1, correct: true },
    { id: "scam-10", label: "scam", type: "스미싱(지원금 사칭)", level: "danger", score: 95, spans: 1, correct: true },
    { id: "scam-11", label: "scam", type: "불법 사금융", level: "danger", score: 95, spans: 3, correct: true },
    { id: "scam-12", label: "scam", type: "연대보증 요구", level: "danger", score: 95, spans: 2, correct: true },
    { id: "caution-01", label: "caution", type: "원가정 금전 요구", level: "warning", score: 80, spans: 1, correct: true },
    { id: "caution-02", label: "caution", type: "고수익 투자 권유", level: "danger", score: 95, spans: 2, correct: true },
    { id: "caution-03", label: "caution", type: "계약 독소조항", level: "danger", score: 90, spans: 2, correct: true },
    { id: "safe-01", label: "safe", type: "정상 은행 안내", level: "safe", score: 5, spans: 0, correct: true },
    { id: "safe-02", label: "safe", type: "정상 관공서 안내", level: "safe", score: 0, spans: 0, correct: true },
    { id: "safe-03", label: "safe", type: "정상 택배 안내", level: "safe", score: 10, spans: 0, correct: true },
    { id: "safe-04", label: "safe", type: "정상 지인 대화", level: "safe", score: 5, spans: 0, correct: true },
  ] satisfies FraudEvalRow[],
};
