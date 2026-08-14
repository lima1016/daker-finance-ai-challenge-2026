// 자립준비청년 현황 — 화면에 쓰는 모든 수치의 단일 출처
//
// 이 앱이 왜 필요한지를 말할 때 쓰는 숫자다. 전부 정부·공공기관 통계이며,
// 출처 없이 숫자를 늘리지 않는다. 값을 고칠 일이 생기면 반드시 출처도 함께 고친다.

export interface Stat {
  value: string;
  label: string;
  detail?: string;
  source: string;
}

/** 히어로에 크게 보여줄 핵심 수치 */
export const HEADLINE_STATS: Stat[] = [
  {
    value: "2,000명",
    label: "매년 홀로서기를 시작",
    detail: "보호가 끝나 사회로 나오는 청년",
    source: "아동권리보장원",
  },
  {
    value: "68.2%",
    label: "가장 필요한 건 경제적 지원",
    detail: "주거지원(20.2%)보다 3배 이상 높음",
    source: "2023 자립지원 실태조사",
  },
  {
    value: "46.5%",
    label: "자살을 생각해 본 적 있음",
    detail: "일반 청년 10.5%의 4배 이상",
    source: "2023 자립지원 실태조사",
  },
];

/** 문제를 한 문장으로 설명할 때 쓰는 보조 수치 */
export const CONTEXT_STATS: Stat[] = [
  {
    value: "1,000만원 이상",
    label: "자립정착금",
    detail: "열여덟에 처음 쥐는 목돈. 17개 시·도에서 지급",
    source: "보건복지부",
  },
  {
    value: "월 50만원",
    label: "자립수당",
    detail: "보호종료 후 5년간",
    source: "보건복지부",
  },
  {
    value: "28.7%",
    label: "심각한 자살생각의 이유 — 경제적 문제",
    detail: "우울 등 정신과적 문제(30.7%)에 이어 2위",
    source: "2023 자립지원 실태조사",
  },
];

export const STAT_SOURCES = [
  {
    name: "보건복지부 「2023 자립지원 실태조사」",
    note: "보호종료 5년 이내 자립준비청년 5,032명 응답",
    url: "https://mohw.go.kr/board.es?act=view&bid=0027&list_no=1482061&mid=a10503010300",
  },
  {
    name: "아동권리보장원 아동자립지원 통계",
    note: "연간 보호종료 인원",
    url: "https://www.ncrc.or.kr/ncrc/cm/cntnts/cntntsView.do?mi=1034&cntntsId=1083",
  },
];
