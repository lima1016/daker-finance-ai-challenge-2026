import { SYSTEM_PROMPT } from "@/lib/prompt";
import { generateObject, llmConfigError } from "@/lib/llm";
import { buildGrounding } from "@/lib/grounding";
import { BRIEFING_SCHEMA, COACH_SCHEMA } from "@/lib/schema";
import { buildBriefing, type BriefingItem } from "@/lib/briefing";
import { computeReadiness, readinessContext } from "@/lib/readiness";
import { buildForecast, forecastContext } from "@/lib/forecast";
import { buildProfileContext, DEFAULT_PROFILE, type ProfileStore } from "@/lib/profile";
import { cached, cacheKey } from "@/lib/serverCache";

const BRIEFING_INSTRUCTION = `# 오늘의 브리핑 모드
이 사람이 앱을 열었을 때 가장 먼저 봐야 할 것을 골라 줍니다. 질문을 기다리지 말고 먼저 챙겨주세요.

- 급한 것부터 3~4개. 시점을 놓치면 손해가 큰 것(신청 마감·잔액 소진)을 위로.
- 이미 잘 하고 있는 부분은 굳이 항목으로 만들지 말고, greeting에서 한 번 알아주세요.
- title은 사실을, desc는 왜 지금 중요한지를. 겁주지 말고 담담하게 씁니다.
- action: 금액 배분은 simulator, 잔액 흐름은 forecast, 수상한 문자 확인은 scanner, 나머지는 chat.
- action이 chat이면 prompt에 이 사람 입장에서 새봄에게 던질 질문을 1인칭으로 씁니다.
- 숫자를 새로 만들어내지 마세요. 주어진 정보에 있는 값만 인용합니다.`;

const COACH_INSTRUCTION = `# 자립 준비도 코칭 모드
5축 점수는 앱이 규칙으로 계산했습니다. 당신은 점수를 다시 매기지 말고, 가장 약한 축을 어떻게 올릴지만 알려주세요.

- advice는 2문장 이내. "왜 낮은지"보다 "그래서 뭘 하면 되는지"에 무게를 둡니다.
- nextStep은 오늘 당장 할 수 있는 아주 작은 행동 하나로.
- 점수나 등급을 다시 언급하지 마세요.`;

interface BriefingResponse {
  greeting: string;
  items: BriefingItem[];
}

interface CoachResponse {
  advice: string;
  nextStep: string;
  prompt: string;
}

export async function POST(req: Request) {
  let profile: ProfileStore = DEFAULT_PROFILE;
  try {
    const body = await req.json();
    if (body.profile && typeof body.profile === "object") profile = body.profile as ProfileStore;
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  // AI가 실패해도 화면은 채워져야 한다 — 규칙 기반 결과를 먼저 준비
  const readiness = computeReadiness(profile);
  const fallback = { greeting: "", items: buildBriefing(profile), readiness, ai: false };

  if (llmConfigError()) return Response.json(fallback);

  const profileText = buildProfileContext(profile);
  const forecast = buildForecast(profile, []);
  const situation = [
    profileText ? `# 사용자 정보\n${profileText}` : "",
    forecast.ready ? `# 현금흐름\n${forecastContext(profile, forecast)}` : "",
    `# 자립 준비도 (앱이 계산한 값)\n${readinessContext(profile, readiness)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const grounding = await buildGrounding(
    "자립준비청년 자립수당 주거지원 신청 시기 자산형성",
    { matchCount: 3, minSimilarity: 0.35 },
  );

  // 화면은 이미 규칙 기반 브리핑으로 채워져 있고, 결과가 오면 교체된다.
  // 사용자를 막고 있지 않으므로, 멈춘 시도를 끊고 한 번 더 걸 만큼의 예산을 준다.
  const BUDGET_MS = 50_000;

  // 예시 데이터로 첫 화면을 채우기 때문에, 방문자가 많으면 같은 프로필로 같은 요청이 반복된다.
  // 상황이 같으면 결과도 같으니 잠시 재사용해 무료 할당량을 아낀다.
  const CACHE_MS = 20 * 60_000;

  const startedAt = Date.now();
  const [briefingRes, coachRes] = await Promise.allSettled([
    cached(cacheKey("briefing", situation), CACHE_MS, () =>
      generateObject<BriefingResponse>({
        system: [SYSTEM_PROMPT, BRIEFING_INSTRUCTION, grounding].filter(Boolean).join("\n\n"),
        prompt: `${situation}\n\n오늘 이 사람이 먼저 봐야 할 것을 골라 주세요.`,
        schema: BRIEFING_SCHEMA,
        timeoutMs: BUDGET_MS,
      }),
    ),
    cached(cacheKey("coach", situation), CACHE_MS, () =>
      generateObject<CoachResponse>({
        system: [SYSTEM_PROMPT, COACH_INSTRUCTION, grounding].filter(Boolean).join("\n\n"),
        prompt: `${situation}\n\n가장 약한 축인 '${readiness.weakest.label}'을(를) 올릴 방법을 알려주세요.`,
        schema: COACH_SCHEMA,
        timeoutMs: BUDGET_MS,
      }),
    ),
  ]);

  // 실패해도 규칙 기반으로 내려가지만, 왜 실패했는지는 남겨야 고칠 수 있다
  const elapsed = Date.now() - startedAt;
  for (const [name, res] of [
    ["briefing", briefingRes],
    ["coach", coachRes],
  ] as const) {
    if (res.status === "rejected") {
      console.warn(
        `[briefing] ${name} 생성 실패 (${elapsed}ms 경과, 예산 ${BUDGET_MS}ms):`,
        res.reason instanceof Error ? res.reason.message : String(res.reason),
      );
    }
  }

  const briefing =
    briefingRes.status === "fulfilled" && briefingRes.value.items?.length
      ? briefingRes.value
      : { greeting: "", items: fallback.items };

  return Response.json({
    greeting: briefing.greeting ?? "",
    items: sanitizeItems(briefing.items).slice(0, 4),
    readiness,
    coach: coachRes.status === "fulfilled" ? coachRes.value : null,
    ai: briefingRes.status === "fulfilled",
  });
}

const ACTIONS = ["chat", "scanner", "simulator", "forecast"] as const;
const TONES = ["info", "warn", "danger"] as const;

function sanitizeItems(items: BriefingItem[]): BriefingItem[] {
  return (items ?? [])
    .filter((it) => it && typeof it.title === "string" && it.title.trim())
    .map((it) => ({
      tone: TONES.includes(it.tone) ? it.tone : "info",
      title: it.title.trim(),
      desc: typeof it.desc === "string" ? it.desc.trim() : "",
      action: ACTIONS.includes(it.action) ? it.action : "chat",
      prompt: typeof it.prompt === "string" && it.prompt.trim() ? it.prompt.trim() : undefined,
    }));
}
