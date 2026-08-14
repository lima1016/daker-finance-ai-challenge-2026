// LLM 프로바이더 추상화 — Gemini / Anthropic 를 환경변수 하나로 교체
// 라우트는 이 파일만 호출하므로, 나중에 공급자를 바꿔도 앱 코드는 그대로.
//
// 제공하는 것:
//   streamText()      — 순수 텍스트 스트림 (기존 호환)
//   streamAssistant() — 텍스트 + 도구 호출(카드) 이벤트 스트림
//   generateObject()  — JSON 스키마로 강제된 구조화 출력 (이미지 입력 지원)
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import type { ChatMessage } from "./prompt";
import type { JsonSchema, ToolSpec } from "./schema";

export type LlmProvider = "gemini" | "anthropic";

export function activeProvider(): LlmProvider {
  const p = (process.env.LLM_PROVIDER || "gemini").toLowerCase();
  return p === "anthropic" ? "anthropic" : "gemini";
}

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

// Gemini 무료 티어는 "모델당" 하루 20회다. GEMINI_MODEL에 쉼표로 여러 개를 적어두면
// 할당량이 찬 모델은 건너뛰고 다음 모델로 이어서 쓴다 (20회 → 모델 수 × 20회).
// 한 번 할당량이 찬 모델은 한동안 건너뛴다.
// 기억하지 않으면 매 요청마다 소진된 모델들을 다시 두드리게 된다.
const QUOTA_COOLDOWN_MS = 30 * 60_000;
const exhaustedUntil = new Map<string, number>();

function markExhausted(model: string) {
  exhaustedUntil.set(model, Date.now() + QUOTA_COOLDOWN_MS);
}

function configuredModels(): string[] {
  const raw = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const list = raw
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return list.length ? list : ["gemini-3.5-flash"];
}

function geminiModels(): string[] {
  const all = configuredModels();
  const now = Date.now();
  const usable = all.filter((m) => (exhaustedUntil.get(m) ?? 0) <= now);
  // 전부 소진됐다면 그래도 시도는 해본다 (한도가 이미 풀렸을 수도 있으므로)
  return usable.length ? usable : all;
}

/** 이 모델의 할당량이 찼다는 뜻인지 (다른 모델로 넘어가면 풀린다) */
function isQuotaError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /\b429\b|RESOURCE_EXHAUSTED|exceeded your current quota/i.test(msg);
}

/** 현재 선택된 프로바이더의 키가 없으면 안내 메시지를, 있으면 null 반환 */
export function llmConfigError(): string | null {
  const p = activeProvider();
  if (p === "gemini" && !process.env.GEMINI_API_KEY) {
    return "GEMINI_API_KEY가 설정되지 않았습니다. Google AI Studio(aistudio.google.com/app/apikey)에서 무료 키를 발급받아 .env.local에 넣고 개발 서버를 다시 시작하세요.";
  }
  if (p === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
    return "ANTHROPIC_API_KEY가 설정되지 않았습니다. console.anthropic.com에서 키를 발급받아 .env.local에 넣고 개발 서버를 다시 시작하세요.";
  }
  return null;
}

/** 사용자가 올린 이미지 (base64, data: 접두사 없음) */
export interface ImageInput {
  mimeType: string;
  data: string;
}

/** 스트림에서 나오는 이벤트 */
export type AssistantEvent =
  | { t: "text"; v: string }
  | { t: "tool"; name: string; input: Record<string, unknown> };

type StreamArgs = { system: string; messages: ChatMessage[] };

function anthropicClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}
function geminiClient() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
}

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * 공급자 원본 오류(거대한 JSON)를 사용자에게 보여줄 한 문장으로 바꾼다.
 * 원문은 서버 로그에만 남긴다.
 */
export function friendlyError(e: unknown): string {
  const raw = errText(e);
  console.error("[llm]", raw);

  if (/\b429\b|RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(raw)) {
    return "지금은 AI 사용량이 가득 찼어요. 잠시 뒤에 다시 시도해 주세요.";
  }
  if (/\b(503|500|502|504)\b|UNAVAILABLE|overloaded|high demand/i.test(raw)) {
    return "지금 AI가 많이 붐벼요. 잠시 뒤에 다시 시도해 주세요.";
  }
  if (/abort|timeout|ETIMEDOUT/i.test(raw)) {
    return "응답이 너무 오래 걸려서 멈췄어요. 다시 시도해 주세요.";
  }
  if (/\b(401|403)\b|API key|PERMISSION_DENIED|invalid.?key/i.test(raw)) {
    return "AI 키 설정에 문제가 있어요. .env.local의 키를 확인해 주세요.";
  }
  return "답변을 만들지 못했어요. 잠시 뒤에 다시 시도해 주세요.";
}

/** 스트리밍 전체 상한 (긴 답변도 여기까지는 허용) */
const STREAM_TIMEOUT_MS = 90_000;

/**
 * 첫 글자가 이 시간 안에 오지 않으면 멈춘 것으로 본다.
 *
 * 전체 시간으로 자르면 정상적인 긴 답변까지 죽는다. 반면 '첫 글자'는
 * 정상일 때 몇 초 안에 오므로, 이것만 감시하면 멈춘 호출만 골라낼 수 있다.
 */
const FIRST_TOKEN_MS = 18_000;

// ── 1. 텍스트 전용 스트림 (기존 호환) ─────────────────────────

/** 통합 스트리밍 인터페이스: 어떤 프로바이더든 UTF-8 텍스트 청크 스트림을 반환 */
export function streamText({ system, messages }: StreamArgs): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const ev of streamAssistant({ system, messages })) {
          if (ev.t === "text") controller.enqueue(encoder.encode(ev.v));
        }
      } catch (e) {
        controller.enqueue(encoder.encode(`\n\n⚠️ 답변 생성 중 오류가 났어요. ${errText(e)}`));
      } finally {
        controller.close();
      }
    },
  });
}

// ── 2. 텍스트 + 도구 호출 스트림 ──────────────────────────────

/**
 * 어시스턴트 응답을 이벤트 단위로 흘려보낸다.
 * 텍스트는 조각조각 실시간으로, 도구 호출(카드)은 인자가 완성된 시점에 한 번에.
 */
export async function* streamAssistant({
  system,
  messages,
  tools = [],
}: StreamArgs & { tools?: ToolSpec[] }): AsyncGenerator<AssistantEvent> {
  if (activeProvider() === "anthropic") {
    yield* streamAnthropic({ system, messages, tools });
  } else {
    yield* streamGemini({ system, messages, tools });
  }
}

async function* streamAnthropic({
  system,
  messages,
  tools,
}: StreamArgs & { tools: ToolSpec[] }): AsyncGenerator<AssistantEvent> {
  const stream = anthropicClient().messages.stream(
    {
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      ...(tools.length
        ? {
            tools: tools.map((t) => ({
              name: t.name,
              description: t.description,
              input_schema: t.inputSchema as Anthropic.Tool["input_schema"],
            })),
          }
        : {}),
    },
    { signal: AbortSignal.timeout(STREAM_TIMEOUT_MS) },
  );

  for await (const ev of stream) {
    if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
      yield { t: "text", v: ev.delta.text };
    }
  }

  // 도구 인자는 스트림이 끝난 뒤 완성된 형태로 꺼낸다 (부분 JSON 파싱 불필요)
  const final = await stream.finalMessage();
  for (const block of final.content) {
    if (block.type === "tool_use") {
      yield { t: "tool", name: block.name, input: (block.input ?? {}) as Record<string, unknown> };
    }
  }
}

async function* streamGemini({
  system,
  messages,
  tools,
}: StreamArgs & { tools: ToolSpec[] }): AsyncGenerator<AssistantEvent> {
  const ai = geminiClient();
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const config = {
    systemInstruction: system,
    ...(tools.length
      ? {
          tools: [
            {
              functionDeclarations: tools.map((t) => ({
                name: t.name,
                description: t.description,
                parametersJsonSchema: t.inputSchema,
              })),
            },
          ],
        }
      : {}),
  };

  const models = geminiModels();
  let i = 0;
  let stallRetried = false;

  while (i < models.length) {
    // 첫 글자 감시 타이머와 전체 상한을 하나의 컨트롤러로 묶는다
    const ctl = new AbortController();
    const overall = setTimeout(() => ctl.abort(), STREAM_TIMEOUT_MS);
    let firstToken: ReturnType<typeof setTimeout> | null = setTimeout(
      () => ctl.abort(),
      FIRST_TOKEN_MS,
    );
    const gotFirstToken = () => {
      if (firstToken) {
        clearTimeout(firstToken);
        firstToken = null;
      }
    };

    let started = false;
    try {
      const response = await ai.models.generateContentStream({
        model: models[i],
        contents,
        config: { ...config, abortSignal: ctl.signal },
      });

      for await (const chunk of response) {
        const text = chunk.text;
        if (text) {
          gotFirstToken();
          started = true;
          yield { t: "text", v: text };
        }
        for (const call of chunk.functionCalls ?? []) {
          if (call.name) {
            gotFirstToken();
            started = true;
            yield { t: "tool", name: call.name, input: (call.args ?? {}) as Record<string, unknown> };
          }
        }
      }
      return;
    } catch (e) {
      // 이미 답이 나가기 시작했으면 되돌릴 수 없다 (중간부터 다시 쓸 수 없으므로)
      if (started) throw e;

      if (isQuotaError(e)) {
        markExhausted(models[i]); // 마지막 모델이어도 기억해 둔다
        if (i < models.length - 1) {
          console.warn(`[llm] ${models[i]} 할당량 소진 → ${models[i + 1]}로 전환`);
          i++;
          continue;
        }
      }
      if (isAborted(e) && !stallRetried) {
        console.warn(`[llm] ${models[i]} 응답이 멈춤 — 같은 모델로 한 번 더 시도`);
        stallRetried = true;
        continue;
      }
      throw e;
    } finally {
      clearTimeout(overall);
      gotFirstToken();
    }
  }
}

// ── 3. 구조화 출력 (JSON 스키마로 강제) ───────────────────────

export interface GenerateObjectArgs {
  system: string;
  prompt: string;
  schema: JsonSchema;
  images?: ImageInput[];
  /** 재시도까지 포함한 전체 제한 시간(ms). 넘기면 호출자가 폴백으로 넘어간다. */
  timeoutMs?: number;
  /** 한 번의 시도에 허용할 시간(ms). 이보다 오래 멈춰 있으면 끊고 다시 건다. */
  attemptMs?: number;
}

/** 과부하·레이트리밋처럼 잠깐 기다리면 풀리는 오류인지 */
function isTransient(e: unknown): boolean {
  const msg = errText(e);
  return /\b(429|500|502|503|504)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded|high demand|rate.?limit|ECONNRESET|ETIMEDOUT/i.test(
    msg,
  );
}

/** 우리가 건 제한 시간에 걸려 끊긴 경우 (응답이 아예 안 오고 멈춰 있었다는 뜻) */
function isAborted(e: unknown): boolean {
  if (e instanceof Error && e.name === "AbortError") return true;
  return /abort|TimeoutError/i.test(errText(e));
}

/**
 * 한 번의 시도에 허용할 시간.
 *
 * 정상일 때 6~17초면 끝나는 호출이 가끔 아무 응답 없이 멈춰 있다.
 * 그럴 땐 계속 기다리는 것보다 끊고 새로 거는 편이 훨씬 빨리 끝난다.
 */
const ATTEMPT_MS = 20_000;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 스키마에 맞는 JSON 객체를 받아온다.
 * Gemini는 responseJsonSchema, Anthropic은 tool_choice 강제를 쓴다 — 둘 다 같은 스키마.
 *
 * 무료 티어는 503(과부하)이 잦아서, 일시적 오류만 짧게 재시도한다.
 */
export async function generateObject<T>({
  system,
  prompt,
  schema,
  images = [],
  timeoutMs = 15_000,
  attemptMs = ATTEMPT_MS,
}: GenerateObjectArgs): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  const call = (signal: AbortSignal) =>
    activeProvider() === "anthropic"
      ? objectAnthropic<T>({ system, prompt, schema, images, signal })
      : objectGemini<T>({ system, prompt, schema, images, signal });

  const delays = [600, 1500];
  for (let attempt = 0; ; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error("응답이 제한 시간 안에 오지 않았어요.");

    // 전체 예산을 한 번에 쓰지 않고 잘라 쓴다 — 멈춘 시도를 끊고 다시 걸기 위해
    const slice = Math.min(attemptMs, remaining);

    try {
      return await call(AbortSignal.timeout(slice));
    } catch (e) {
      // 멈춰서 끊긴 경우도, 일시적 오류도 다시 걸어볼 가치가 있다
      const worthRetry = isAborted(e) || isTransient(e);
      const budgetLeft = deadline - Date.now();
      if (!worthRetry || attempt >= delays.length || budgetLeft < delays[attempt] + 4000) {
        throw e;
      }
      console.warn(
        `[llm] 시도 ${attempt + 1} 실패(${isAborted(e) ? "멈춤" : "일시오류"}) — ${budgetLeft}ms 남음, 재시도`,
      );
      await wait(delays[attempt]);
    }
  }
}

type ObjectCallArgs = GenerateObjectArgs & { images: ImageInput[]; signal: AbortSignal };

async function objectAnthropic<T>({ system, prompt, schema, images, signal }: ObjectCallArgs): Promise<T> {
  const content: Anthropic.ContentBlockParam[] = [
    ...images.map(
      (img): Anthropic.ContentBlockParam => ({
        type: "image",
        source: {
          type: "base64",
          media_type: img.mimeType as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
          data: img.data,
        },
      }),
    ),
    { type: "text", text: prompt },
  ];

  const res = await anthropicClient().messages.create(
    {
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      system,
      messages: [{ role: "user", content }],
      tools: [
        {
          name: "respond",
          description: "분석 결과를 구조화된 형태로 돌려준다.",
          input_schema: schema as Anthropic.Tool["input_schema"],
        },
      ],
      tool_choice: { type: "tool", name: "respond" },
    },
    { signal },
  );

  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("구조화 응답을 받지 못했어요.");
  return block.input as T;
}

async function objectGemini<T>({ system, prompt, schema, images, signal }: ObjectCallArgs): Promise<T> {
  const parts = [
    ...images.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.data } })),
    { text: prompt },
  ];

  const models = geminiModels();
  let res: Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>> | null = null;

  for (let i = 0; i < models.length; i++) {
    try {
      res = await geminiClient().models.generateContent({
        model: models[i],
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: system,
          responseMimeType: "application/json",
          responseJsonSchema: schema,
          abortSignal: signal,
        },
      });
      break;
    } catch (e) {
      if (!isQuotaError(e)) throw e;
      markExhausted(models[i]); // 마지막 모델이어도 기억해 둔다
      if (i === models.length - 1) throw e;
      console.warn(`[llm] ${models[i]} 할당량 소진 → ${models[i + 1]}로 전환`);
    }
  }
  if (!res) throw new Error("응답을 받지 못했어요.");

  const text = res.text;
  if (!text) throw new Error("구조화 응답이 비어 있어요.");
  try {
    return JSON.parse(text) as T;
  } catch {
    // 드물게 코드펜스로 감싸서 오는 경우 방어
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]) as T;
    throw new Error("구조화 응답을 JSON으로 읽지 못했어요.");
  }
}
