// 모델이 답변 본문에 흘린 '도구 호출 흉내'를 걸러낸다.
//
// 관찰된 실제 유출 (gemini-3.x, 간헐적):
//   * * *
//   (도구 호출)
//   `show_timeline`
//   title: "자립지원제도 준비 순서"
//   steps:
//     - when: "1개월 (지금 바로)"
//       desc: "..."
//   * * * Let's call the tool.
// 이걸 다 뱉은 뒤에 진짜 도구를 호출한다. 프롬프트로 줄일 수는 있어도 완전히
// 막지는 못해서, 화면에 나가기 직전에 한 번 더 거른다.

/**
 * 줄의 '앞부분'만 보고도 유출이라고 단정할 수 있는 무늬들.
 *
 * 앞부분으로 판정하는 게 중요하다. title: "자립지원제도 준비 순서" 처럼
 * 따옴표 안에 한글이 들어오는 줄이 있어서, 한글을 봤다는 이유로 본문 취급하면
 * 이런 줄을 통째로 놓친다.
 */
const LEAK_PREFIX = [
  // 도구 인자를 YAML처럼 적은 줄. 키가 전부 영문이라 한국어 본문과 겹치지 않는다
  /^(-\s*)?(type|title|steps|when|desc|label|labels|amount|level|score|text|spans|reasons|actions|insight|advice|nextStep|series|axes|points|total|items|why|source|hint|done)\s*:/,
  // 도구 이름을 그대로 적은 줄
  /^[`'"([]?\s*(show_allocation|show_forecast|show_readiness|show_timeline|show_risk)/i,
  // '(도구 호출)' 같은 표식
  /^[(（]?\s*(도구\s*호출|툴\s*호출|tool[_\s]?call|function[_\s]?call)/i,
  // "Let's call the tool." 처럼 도구를 부르겠다는 영어 문장
  /\b(call|calling|invoke|use)\s+the\s+(tool|function)\b/i,
];

/**
 * 무엇을 지웠는지 서버 로그에 남긴다.
 *
 * 조용히 지우면 필터가 본문까지 먹고 있어도 알 수 없다. 프롬프트를 고쳤을 때
 * 유출이 실제로 줄었는지도 이 로그로만 확인할 수 있다.
 */
function drop(raw: string) {
  console.warn("[leak] 도구 호출 유출 제거:", JSON.stringify(raw.trim().slice(0, 120)));
}

/** '* * *' 같은 구분선 — 유출 블록의 경계로만 쓰이고 본문에는 필요 없다 */
const RULE_LINE = /^[\s*_-]{3,}$/;

/** 여기까지 온 글자만으로 유출이라고 단정할 수 있는가 */
function looksLikeLeak(partial: string): boolean {
  const t = partial.trimStart();
  return LEAK_PREFIX.some((re) => re.test(t));
}

/** 다 받은 한 줄을 버릴지 */
function isLeak(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false; // 빈 줄은 문단 구분이다
  return looksLikeLeak(t) || RULE_LINE.test(t);
}

/**
 * 아직 줄바꿈이 오지 않은 이 줄이 유출로 자랄 수 있는가.
 *
 * 줄이 다 올 때까지 무조건 기다리면 글이 문단 단위로 뚝뚝 끊겨 나타난다 —
 * 스트리밍이 죽는다. 그래서 '아직 유출일 수 있는' 동안만 붙잡았다가,
 * 본문으로 판명되면 즉시 흘려보낸다.
 */
function couldBeLeak(partial: string): boolean {
  const t = partial.trimStart();
  if (!t) return true;
  if (t.length > 60) return false; // 유출 줄은 짧다. 길어졌으면 본문이다
  if (/^[(（]?\s*(도|툴)/.test(t)) return true; // '(도구 호출)' 로 자라는 중일 수 있다
  return /^[\s`(*\-\w:"'.,[\]{}]*$/.test(t); // 한글 없이 기계 문법 문자뿐
}

/** 한 줄을 어떻게 처리 중인가 */
type LineState =
  | "undecided" // 아직 판단 못 함 — 붙잡아 두는 중
  | "emitting" // 본문으로 판명 — 오는 대로 내보낸다
  | "dropping"; // 유출로 판명 — 줄이 끝날 때까지 버린다

/**
 * 텍스트 스트림에서 유출된 줄을 지운다.
 *
 * 줄 단위로 판단하므로 줄바꿈이 올 때까지 결론이 안 나는 줄이 있다.
 * feed()는 확정된 부분만 돌려주고, 남은 꼬리는 flush()로 비운다.
 */
export function createLeakFilter() {
  let line = ""; // 줄바꿈을 아직 못 만난 마지막 줄
  let state: LineState = "undecided";

  return {
    feed(chunk: string): string {
      let out = "";

      for (const ch of chunk) {
        if (ch === "\n") {
          if (state === "emitting") out += "\n";
          else if (state === "undecided" && !isLeak(line)) out += line + "\n";
          else if (line.trim()) drop(line);
          line = "";
          state = "undecided";
          continue;
        }

        // 버릴 줄도 끝까지 모은다 — 무엇을 버렸는지 로그로 남기기 위해
        line += ch;
        if (state === "dropping") continue;

        if (state === "emitting") {
          out += ch;
        } else if (looksLikeLeak(line)) {
          state = "dropping";
        } else if (!couldBeLeak(line)) {
          out += line; // 본문으로 판명 — 붙잡아 둔 앞부분까지 한꺼번에 내보낸다
          state = "emitting";
        }
      }

      return out;
    },

    /** 스트림이 끝났다 — 붙잡고 있던 마지막 줄을 정리한다 */
    flush(): string {
      if (state !== "emitting" && line.trim() && isLeak(line)) drop(line);
      const rest = state === "undecided" && !isLeak(line) ? line : "";
      line = "";
      state = "undecided";
      return rest;
    },
  };
}
