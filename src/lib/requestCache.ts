"use client";

// 같은 입력에 대한 AI 요청을 한 번만 보낸다.
//
// 홈 ↔ 채팅을 오갈 때마다 브리핑을 다시 만들면 무료 티어 할당량이 금방 바닥난다.
// 프로필이 그대로면 이전 응답을 그대로 쓰고, 바뀌면 새로 요청한다.

const inflight = new Map<string, Promise<unknown>>();

/**
 * key가 같으면 이미 보낸(또는 보내는 중인) 요청의 결과를 공유한다.
 * 실패한 요청은 캐시에서 지워, 다음 시도 때 다시 보낸다.
 */
export function cachedPost<T>(key: string, url: string, body: unknown): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
    .then((r) => r.json())
    .catch((e) => {
      inflight.delete(key);
      throw e;
    });

  inflight.set(key, promise);
  return promise as Promise<T>;
}

/** 사용자가 명시적으로 다시 요청할 때 (예: 새로고침 버튼) */
export function invalidate(key: string) {
  inflight.delete(key);
}
