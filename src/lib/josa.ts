// 한글 조사 자동 선택.
//
// 앞말의 받침 유무에 따라 조사가 갈린다. 화면에 들어가는 이름(자립 준비도의 축,
// 지원제도 이름 등)은 데이터에서 오므로 문장에 조사를 하드코딩하면
// "지출 관리이에요"처럼 틀린 문장이 그대로 나간다.

/** 마지막 글자에 받침이 있는지 */
export function hasFinalConsonant(word: string): boolean {
  const last = word.trim().at(-1);
  if (!last) return false;
  const code = last.charCodeAt(0);
  // 한글 음절 영역이 아니면(숫자·영문 등) 받침 없는 것으로 본다
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

/** 받침에 맞는 조사를 고른다. josa("비상금", "이", "가") → "이" */
export function josa(word: string, withFinal: string, withoutFinal: string): string {
  return hasFinalConsonant(word) ? withFinal : withoutFinal;
}

/** "비상금이에요" / "지출 관리예요" */
export const ieyo = (word: string) => `${word}${josa(word, "이에요", "예요")}`;
