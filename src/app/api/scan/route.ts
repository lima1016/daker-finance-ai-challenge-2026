import { SYSTEM_PROMPT } from "@/lib/prompt";
import { generateObject, llmConfigError, friendlyError, type ImageInput } from "@/lib/llm";
import { buildGrounding } from "@/lib/grounding";
import { SCAN_SCHEMA } from "@/lib/schema";
import { normalizeCard, type ScanCard } from "@/lib/cards";

// 배포 플랫폼(Vercel Hobby)의 함수 실행 한도. 아래 예산은 전부 이 안에 들어와야 한다.
export const maxDuration = 60;

const SCAN_INSTRUCTION = `# 위험 스캐너 모드
사용자가 붙여넣은 문자·카톡·링크·계약서(텍스트 또는 스크린샷)를 검사합니다.

- 이미지를 받으면 먼저 화면의 글자를 **빠짐없이 그대로** 읽어 extracted에 옮겨 적으세요. 발신번호·링크·시각도 보이면 포함합니다.
- spans에는 위험한 문구를 원문에서 **글자 그대로** 발췌하세요. 요약하거나 바꿔 쓰면 화면에서 표시되지 않습니다. 한 조각은 5~40자 정도의 짧은 문장으로.
- score는 위험도 0~100. 사기 확실 90+, 의심 50~80, 안전해 보임 0~20.
- 사기 수법이나 계약의 독소조항(연대보증·명의대여·통장양도 등)을 청년 눈높이로 쉽게 설명하세요.
- actions에는 지금 할 수 있는 구체적 행동을. 필요하면 금감원 1332·경찰 112 신고를 안내하세요.
- 위험이 없어 보이면 level은 safe로, 다만 확신이 없으면 공식 창구 확인을 권하세요.`;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp", "image/gif"];

interface ScanResponse {
  level: "danger" | "warning" | "safe";
  score: number;
  title: string;
  extracted: string;
  spans: { text: string; level: "danger" | "warning"; why: string }[];
  reasons: string[];
  actions: string[];
  source: string;
}

export async function POST(req: Request) {
  const configError = llmConfigError();
  if (configError) return fail("⚠️ " + configError, 500);

  let text = "";
  let image: ImageInput | null = null;
  try {
    const body = await req.json();
    text = typeof body.text === "string" ? body.text.trim() : "";
    if (body.image?.data && typeof body.image.data === "string") {
      const mimeType = String(body.image.mimeType || "image/png");
      if (!ALLOWED_MIME.includes(mimeType)) {
        return fail("PNG·JPG·WEBP 이미지만 검사할 수 있어요.", 400);
      }
      // base64 길이 → 대략적인 원본 바이트 수
      if (body.image.data.length * 0.75 > MAX_IMAGE_BYTES) {
        return fail("이미지가 너무 커요. 4MB 이하로 줄여서 올려주세요.", 413);
      }
      image = { mimeType, data: body.image.data };
    }
    if (!text && !image) throw new Error("empty");
  } catch {
    return fail("검사할 내용이나 이미지를 올려주세요.", 400);
  }

  // 이미지만 있을 땐 아직 원문을 모르므로 일반적인 사기 근거로 검색
  const grounding = await buildGrounding(text || "문자 사기 통장대여 명의도용 스미싱", {
    matchCount: 3,
    minSimilarity: 0.35,
  });

  const system = [SYSTEM_PROMPT, SCAN_INSTRUCTION, grounding].filter(Boolean).join("\n\n");
  const prompt = image
    ? `이 스크린샷이 사기이거나 위험한지 검사해 주세요.${text ? `\n\n사용자 메모: ${text}` : ""}`
    : `다음 내용이 사기이거나 위험한지 검사해 주세요:\n\n"""\n${text}\n"""`;

  try {
    const result = await generateObject<ScanResponse>({
      system,
      prompt,
      schema: SCAN_SCHEMA,
      images: image ? [image] : [],
      // 사용자가 명시적으로 기다리는 화면이다. 스크린샷은 글자를 읽어낸 뒤
      // 판정까지 해야 해서 텍스트보다 오래 걸리므로, 한 번의 시도에도 더 여유를 준다.
      //
      // 예산 상한은 maxDuration(60초)이다. 앞단의 근거 검색과 뒷정리 시간을 남겨야 하므로
      // 이미지도 48초를 넘기지 않는다. (예전 75초는 한도를 넘겨 504로 잘렸다.)
      timeoutMs: image ? 48_000 : 30_000,
      attemptMs: image ? 30_000 : 14_000,
    });

    // 하이라이트를 칠할 원문: 직접 입력한 텍스트가 우선, 없으면 이미지에서 읽은 것
    const source = text || result.extracted || "";
    const card = normalizeCard({ ...result, type: "scan", text: source }) as ScanCard | null;
    if (!card) return fail("검사 결과를 읽지 못했어요. 다시 시도해 주세요.", 502);

    return Response.json({ card });
  } catch (e) {
    return fail(friendlyError(e), 502);
  }
}

function fail(error: string, status: number) {
  return Response.json({ error }, { status });
}
