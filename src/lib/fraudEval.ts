// 사기 탐지 평가셋 — 위험 스캐너가 실제로 맞히는지 재는 데이터.
//
// ⚠️ 여기 문장은 실제로 수집한 피해 문자가 아니라, 금융감독원이 공개한 사기 수법
//    유형을 바탕으로 작성한 합성 예시다. 개인정보가 섞이지 않도록 일부러 이렇게 했다.
//
// 라벨 기준
//   scam   : 응하면 금전 피해나 법적 책임이 생기는 것 (danger로 잡아야 함)
//   caution: 당장 사기는 아니나 신중해야 하는 것 (danger 또는 warning이면 통과)
//   safe   : 정상적인 안내 (safe 또는 warning이면 통과, danger면 오탐)
//
// 이 앱에서 가장 위험한 오답은 '사기를 안전하다고 하는 것'(미탐)이므로 따로 센다.

export type FraudLabel = "scam" | "caution" | "safe";

export interface FraudCase {
  id: string;
  label: FraudLabel;
  /** 어떤 수법인지 (금감원 공개 유형 기준) */
  type: string;
  text: string;
}

export const FRAUD_CASES: FraudCase[] = [
  // ── 명의·통장 관련 (자립준비청년이 가장 많이 노출되는 유형) ──
  {
    id: "scam-01",
    label: "scam",
    type: "통장 대여",
    text: "안녕하세요 OO은행입니다. 잠깐 통장 좀 빌려주시면 하루 30만원 드릴게요. 계좌번호랑 비밀번호만 알려주세요.",
  },
  {
    id: "scam-02",
    label: "scam",
    type: "통장 대여(아르바이트 가장)",
    text: "재택 알바 구합니다. 하는 일은 없고 본인 명의 통장으로 입금 들어오면 지정 계좌로 보내주기만 하면 됩니다. 건당 5만원 드려요.",
  },
  {
    id: "scam-03",
    label: "scam",
    type: "명의 대여",
    text: "형이 신용이 안 좋아서 그런데 네 이름으로 휴대폰 하나만 개통해줘. 요금은 내가 다 낼게. 진짜 아무 문제 없어.",
  },
  {
    id: "scam-04",
    label: "scam",
    type: "체크카드·비밀번호 요구",
    text: "[국민은행] 고객님 계좌 보안강화 대상입니다. 체크카드와 비밀번호를 등기로 발송해 주시면 신규 카드로 교체해 드립니다.",
  },

  // ── 대출 빙자 ──
  {
    id: "scam-05",
    label: "scam",
    type: "대출 빙자(선입금)",
    text: "[정부지원] 청년 저금리 대출 승인되셨습니다. 신용등급 상향 작업비 30만원을 먼저 입금해주시면 당일 실행됩니다.",
  },
  {
    id: "scam-06",
    label: "scam",
    type: "대출 빙자(보증보험료)",
    text: "고객님 한도 3000만원 승인 완료. 다만 보증보험료 50만원이 필요하니 아래 계좌로 송금 후 연락 주세요.",
  },

  // ── 기관 사칭 ──
  {
    id: "scam-07",
    label: "scam",
    type: "수사기관 사칭",
    text: "서울중앙지검입니다. 귀하 명의 계좌가 범죄에 연루되어 자금 검증이 필요합니다. 안내하는 안전계좌로 즉시 이체하세요.",
  },
  {
    id: "scam-08",
    label: "scam",
    type: "금융기관 사칭",
    text: "금융감독원입니다. 고객님 계좌가 대포통장으로 의심되어 지급정지 예정입니다. 해제하려면 본인 확인용 인증번호를 알려주세요.",
  },

  // ── 스미싱 ──
  {
    id: "scam-09",
    label: "scam",
    type: "스미싱(택배 사칭)",
    text: "[Web발신] 택배 주소 불일치로 배송이 중단되었습니다. 주소 확인 http://cj-track.co.kr/re",
  },
  {
    id: "scam-10",
    label: "scam",
    type: "스미싱(지원금 사칭)",
    text: "[국가지원금] 자립준비청년 특별지원금 대상자로 선정되셨습니다. 아래 링크에서 본인인증 후 신청하세요 http://bit.ly/gov-supp",
  },

  // ── 불법 사금융·보증 ──
  {
    id: "scam-11",
    label: "scam",
    type: "불법 사금융",
    text: "신용 안 봅니다. 당일 급전 100만원 가능. 일주일에 20만원만 이자로 주시면 됩니다. 계약서는 따로 안 씁니다.",
  },
  {
    id: "scam-12",
    label: "scam",
    type: "연대보증 요구",
    text: "내가 사업자금이 급해서 그런데 대출에 연대보증인 한 명만 있으면 돼. 너는 서명만 하면 되고 갚는 건 내가 다 할게.",
  },

  // ── 원가정 금전 요구 (이 앱의 핵심 상황) ──
  {
    id: "caution-01",
    label: "caution",
    type: "원가정 금전 요구",
    text: "엄마야. 너 정착금 나왔다며. 급하게 쓸 데가 있어서 그러는데 500만원만 보내줄 수 있니? 곧 갚을게.",
  },
  {
    id: "caution-02",
    label: "caution",
    type: "고수익 투자 권유",
    text: "월 20% 확정 수익 보장합니다. 원금 손실 없고 언제든 출금 가능해요. 지금 시작하면 추가 보너스도 드려요.",
  },
  {
    id: "caution-03",
    label: "caution",
    type: "계약 독소조항",
    text: "임대차 계약서 특약: 임차인은 계약기간 중 어떠한 사유로도 보증금 반환을 청구할 수 없으며, 원상복구 비용 전액을 부담한다.",
  },

  // ── 정상 메시지 (오탐 측정용) ──
  {
    id: "safe-01",
    label: "safe",
    type: "정상 은행 안내",
    text: "[국민은행] 8월 15일 급여 1,200,000원이 입금되었습니다. 잔액 1,850,000원.",
  },
  {
    id: "safe-02",
    label: "safe",
    type: "정상 관공서 안내",
    text: "[행정복지센터] 신청하신 자립수당이 8월 20일에 등록된 본인 계좌로 입금될 예정입니다. 문의는 방문 또는 129로 해주세요.",
  },
  {
    id: "safe-03",
    label: "safe",
    type: "정상 택배 안내",
    text: "고객님이 주문하신 상품이 오늘 오후 배송 예정입니다. 부재 시 경비실에 맡겨 드립니다.",
  },
  {
    id: "safe-04",
    label: "safe",
    type: "정상 지인 대화",
    text: "내일 저녁에 시간 돼? 오랜만에 밥이나 먹자. 내가 살게~",
  },
];

/** 라벨과 판정이 맞는지 (미탐/오탐을 구분해서 센다) */
export function isCorrect(label: FraudLabel, level: "danger" | "warning" | "safe"): boolean {
  if (label === "scam") return level === "danger";
  if (label === "caution") return level === "danger" || level === "warning";
  return level === "safe" || level === "warning"; // safe를 warning으로 보는 건 보수적이라 허용
}

/** 사기를 안전하다고 한 경우 — 이 앱에서 가장 위험한 오답 */
export function isMissedScam(label: FraudLabel, level: "danger" | "warning" | "safe"): boolean {
  return label === "scam" && level === "safe";
}

/** 정상 메시지를 사기라고 한 경우 */
export function isFalseAlarm(label: FraudLabel, level: "danger" | "warning" | "safe"): boolean {
  return label === "safe" && level === "danger";
}
