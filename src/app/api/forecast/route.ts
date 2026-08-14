import { SYSTEM_PROMPT } from "@/lib/prompt";
import { generateObject, llmConfigError, friendlyError } from "@/lib/llm";
import { buildGrounding } from "@/lib/grounding";
import { SCENARIOS_SCHEMA } from "@/lib/schema";
import { buildForecast, forecastContext, type Scenario } from "@/lib/forecast";
import { buildProfileContext, DEFAULT_PROFILE, type ProfileStore } from "@/lib/profile";

const INSTRUCTION = `# 현금흐름 시나리오 모드
이 사람의 앞으로 24개월 잔액 흐름을 놓고, 시도해볼 만한 what-if 시나리오를 만듭니다.

매우 중요 — 당신은 금액을 계산하지 않습니다:
- 잔액 곡선과 소진 시점은 앱이 정확히 계산합니다. 당신은 "무엇을 바꿔볼지"만 정하세요.
- 각 시나리오는 월 수입/월 지출/일시금의 **변화량**으로만 표현합니다.
- 변화량은 이 사람의 현재 수준에 비춰 현실적인 크기로 잡으세요.
  (예: 월세 20만원 절감 → expenseDelta: -200000 / 최저임금 수준 취업 → incomeDelta: 1800000)

시나리오를 고르는 기준:
- 자립준비청년이 실제로 손댈 수 있는 것: 취업·근로시간, 주거비(공공임대 이동), 지원제도 신규 신청, 고정비 정리.
- 서로 다른 종류로 2~3개. 비슷한 걸 반복하지 마세요.
- 비현실적인 제안(대출, 투자, 갑작스러운 고소득)은 넣지 않습니다.
- label은 8자 이내로 짧게. why는 왜 이게 가능한지 한 문장.

insight는 지금 흐름을 어떻게 봐야 하는지 따뜻하게 두 문장 이내로.`;

interface ScenarioResponse {
  scenarios: Scenario[];
  insight: string;
}

export async function POST(req: Request) {
  let profile: ProfileStore = DEFAULT_PROFILE;
  try {
    const body = await req.json();
    if (body.profile && typeof body.profile === "object") profile = body.profile as ProfileStore;
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  // 곡선은 AI와 무관하게 먼저 계산해 둔다 — AI가 실패해도 그래프는 보여준다
  const base = buildForecast(profile, []);
  if (!base.ready) {
    return Response.json({ forecast: base, error: `${base.missing.join("·")} 정보가 필요해요.` });
  }

  const configError = llmConfigError();
  if (configError) return Response.json({ forecast: base, error: "⚠️ " + configError });

  try {
    const grounding = await buildGrounding("자립준비청년 주거지원 취업지원 자립수당", {
      matchCount: 3,
      minSimilarity: 0.35,
    });
    const profileText = buildProfileContext(profile);

    const result = await generateObject<ScenarioResponse>({
      system: [SYSTEM_PROMPT, INSTRUCTION, grounding].filter(Boolean).join("\n\n"),
      prompt: [
        profileText ? `# 사용자 정보\n${profileText}` : "",
        `# 현재 현금흐름\n${forecastContext(profile, base)}`,
        "위 상황에 맞는 what-if 시나리오를 만들어 주세요.",
      ]
        .filter(Boolean)
        .join("\n\n"),
      schema: SCENARIOS_SCHEMA,
      // 그래프는 이미 화면에 있고 스피너가 돌고 있으니, 멈춘 시도를 끊고 다시 걸 여유를 준다
      timeoutMs: 45_000,
    });

    const scenarios = (result.scenarios ?? []).filter(
      (s) => s?.label && (s.incomeDelta || s.expenseDelta || s.balanceDelta),
    );

    return Response.json({
      forecast: buildForecast(profile, scenarios),
      insight: result.insight ?? "",
    });
  } catch (e) {
    // 시나리오 생성이 실패해도 기본 곡선은 살려서 내려보낸다
    return Response.json({ forecast: base, error: friendlyError(e) });
  }
}
