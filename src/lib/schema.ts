// 구조화 출력 스키마 (표준 JSON Schema 한 벌)
//
// Gemini  → config.responseJsonSchema
// Anthropic → tool의 input_schema
// 두 공급자가 같은 스키마를 받으므로 여기서만 정의한다.

export type JsonSchema = Record<string, unknown>;

const str = (description: string): JsonSchema => ({ type: "string", description });
const num = (description: string): JsonSchema => ({ type: "number", description });

const obj = (properties: Record<string, JsonSchema>, required: string[]): JsonSchema => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});

const arr = (items: JsonSchema, description: string): JsonSchema => ({
  type: "array",
  items,
  description,
});

/** 현금흐름 what-if 시나리오 — 금액이 아니라 '변화량'만 받는다 */
export const SCENARIOS_SCHEMA: JsonSchema = obj(
  {
    scenarios: arr(
      obj(
        {
          label: str("8자 이내의 짧은 이름. 예: '취업하면', '월세 줄이면'"),
          why: str("이 시나리오를 왜 제안하는지 한 문장 (40자 이내)"),
          incomeDelta: num("월 수입 변화(원). 늘면 양수, 줄면 음수. 없으면 0"),
          expenseDelta: num("월 지출 변화(원). 줄이면 음수. 없으면 0"),
          balanceDelta: num("일시금 변화(원). 지원금을 받으면 양수. 없으면 0"),
          startMonth: num("몇 개월 뒤부터 적용되는지. 지금부터면 0"),
        },
        ["label", "why", "incomeDelta", "expenseDelta", "balanceDelta", "startMonth"],
      ),
      "현실적으로 시도할 수 있는 시나리오 2~3개",
    ),
    insight: str("현재 흐름에 대한 코치의 한 마디 (2문장 이내, 존댓말)"),
  },
  ["scenarios", "insight"],
);

/** 홈 화면 '오늘의 브리핑' */
export const BRIEFING_SCHEMA: JsonSchema = obj(
  {
    greeting: str("오늘 이 사람에게 건네는 한 문장 인사 (30자 이내, 존댓말)"),
    items: arr(
      obj(
        {
          tone: { type: "string", enum: ["info", "warn", "danger"], description: "중요도" },
          title: str("무엇을 챙겨야 하는지 (25자 이내)"),
          desc: str("왜 그런지 한 문장 (45자 이내)"),
          action: {
            type: "string",
            enum: ["chat", "scanner", "simulator", "forecast"],
            description: "눌렀을 때 이동할 곳",
          },
          prompt: str("action이 chat일 때 새봄에게 보낼 질문. 아니면 빈 문자열"),
        },
        ["tone", "title", "desc", "action", "prompt"],
      ),
      "지금 이 사람에게 가장 중요한 것 3~4개, 급한 순서대로",
    ),
  },
  ["greeting", "items"],
);

/** 위험 스캐너 판정 — 문장 단위 하이라이트 포함 */
export const SCAN_SCHEMA: JsonSchema = obj(
  {
    level: { type: "string", enum: ["danger", "warning", "safe"], description: "종합 판정" },
    score: num("위험도 0~100. 100에 가까울수록 위험"),
    title: str("한 줄 결론 (30자 이내). 예: '통장을 빌려주면 매우 위험해요'"),
    extracted: str(
      "이미지를 받은 경우 읽어낸 원문 전체. 텍스트를 직접 받았으면 빈 문자열",
    ),
    spans: arr(
      obj(
        {
          text: str("원문에서 그대로 발췌한 위험 문구 (반드시 원문에 있는 그대로, 변형 금지)"),
          level: { type: "string", enum: ["danger", "warning"], description: "이 문구의 위험도" },
          why: str("이 문구가 왜 위험한지 청년 눈높이로 한 문장"),
        },
        ["text", "level", "why"],
      ),
      "위험한 문구들. 원문에 그대로 등장하는 짧은 조각으로 발췌. 없으면 빈 배열",
    ),
    reasons: arr(str("왜 위험한지 한 줄"), "판단 근거 1~3개"),
    actions: arr(str("지금 할 수 있는 구체적 행동 한 줄"), "지금 할 일 1~3개"),
    source: str("근거로 삼은 공식 자료 이름. 없으면 빈 문자열"),
  },
  ["level", "score", "title", "extracted", "spans", "reasons", "actions", "source"],
);

// ── 대화 중 카드를 그리는 도구 ────────────────────────────────
// 금액이 들어가는 카드(배분·현금흐름·준비도)는 인자를 받지 않는다.
// 모델은 "지금 이걸 보여주자"만 결정하고, 숫자는 서버가 프로필에서 계산한다.

export interface ToolSpec {
  name: string;
  description: string;
  inputSchema: JsonSchema;
}

const NO_ARGS: JsonSchema = { type: "object", properties: {}, additionalProperties: false };

export const CARD_TOOLS: ToolSpec[] = [
  {
    name: "show_allocation",
    description:
      "사용자의 목돈(자립정착금·잔액)을 비상금/생활비/저축으로 어떻게 나눌지 배분 카드를 보여준다. 금액을 나누는 이야기를 할 때 사용. 금액은 서버가 규칙으로 계산하므로 인자가 필요 없다.",
    inputSchema: {
      type: "object",
      properties: {
        total: {
          type: "number",
          description:
            "사용자가 대화에서 직접 말한 목돈 금액(원). 프로필에 금액이 있거나 언급이 없으면 0",
        },
      },
      required: ["total"],
      additionalProperties: false,
    },
  },
  {
    name: "show_forecast",
    description:
      "앞으로 24개월 잔액이 어떻게 변하는지, 언제 바닥나는지 예측 그래프를 보여준다. '돈이 얼마나 버틸까', '언제까지 괜찮을까' 같은 질문에 사용. 숫자는 서버가 계산하므로 인자가 필요 없다.",
    inputSchema: NO_ARGS,
  },
  {
    name: "show_readiness",
    description:
      "자립 준비도 5축 점수(주거·소득·비상금·지출관리·제도활용)를 레이더 차트로 보여준다. '지금 내 상태가 어떤지', '뭐부터 챙겨야 할지' 물을 때 사용.",
    inputSchema: NO_ARGS,
  },
  {
    name: "show_timeline",
    description:
      "시점별로 해야 할 일을 순서대로 보여준다. 신청 절차·준비 순서를 설명할 때 사용.",
    inputSchema: obj(
      {
        title: str("타임라인 제목 (20자 이내)"),
        steps: arr(
          obj(
            {
              when: str("시점. 예: '종료 3개월 전', '지금 바로'"),
              title: str("무엇을 하는지 (20자 이내)"),
              desc: str("어디서 어떻게 하는지 한 줄. 없으면 빈 문자열"),
            },
            ["when", "title", "desc"],
          ),
          "시간 순서대로 2~5단계",
        ),
      },
      ["title", "steps"],
    ),
  },
  {
    name: "show_risk",
    description:
      "사기·독소조항 위험을 신호등 카드로 보여준다. 명의도용·통장대여·보증 요구 같은 위험 신호가 대화에 나오면 사용.",
    inputSchema: obj(
      {
        level: { type: "string", enum: ["danger", "warning", "safe"], description: "위험도" },
        title: str("한 줄 결론 (30자 이내)"),
        reasons: arr(str("왜 위험한지 한 줄"), "근거 1~3개"),
        actions: arr(str("지금 할 일 한 줄"), "행동 1~3개"),
      },
      ["level", "title", "reasons", "actions"],
    ),
  },
];

/** 자립 준비도 코칭 (점수는 코드가 계산, AI는 조언만) */
export const COACH_SCHEMA: JsonSchema = obj(
  {
    advice: str("가장 약한 축을 올리기 위해 지금 할 수 있는 일 (2문장 이내, 존댓말)"),
    nextStep: str("당장 취할 수 있는 행동 하나 (20자 이내). 예: '자립수당 신청하기'"),
    prompt: str("그 행동을 더 알아보려면 새봄에게 물어볼 질문 한 문장"),
  },
  ["advice", "nextStep", "prompt"],
);
