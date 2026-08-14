// 같은 입력에 대한 AI 결과를 서버에서 잠시 재사용한다.
//
// 첫 화면이 예시 데이터로 채워지면서, 방문자가 늘수록 똑같은 프로필로
// 같은 브리핑을 계속 만들게 된다. 무료 티어 할당량은 하루 수십 회뿐이라
// 심사 기간에 이게 바닥나면 폴백 화면만 남는다.

interface Entry {
  at: number;
  value: unknown;
}

const store = new Map<string, Entry>();
const MAX_ENTRIES = 200;

/** 입력을 캐시 키로 (JSON 직렬화 순서가 같으면 같은 키) */
export function cacheKey(...parts: unknown[]): string {
  return parts.map((p) => (typeof p === "string" ? p : JSON.stringify(p))).join("|");
}

/**
 * ttlMs 안에 같은 키로 만든 값이 있으면 그대로 돌려주고, 없으면 만들어서 저장한다.
 * 만드는 데 실패하면 캐시에 남기지 않는다 (다음 요청이 다시 시도하도록).
 */
export async function cached<T>(key: string, ttlMs: number, make: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;

  const value = await make();

  // 오래된 것부터 비워 메모리가 무한히 늘지 않게
  if (store.size >= MAX_ENTRIES) {
    const oldest = [...store.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) store.delete(oldest[0]);
  }
  store.set(key, { at: Date.now(), value });
  return value;
}
