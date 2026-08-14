// 프로필 저장소 — localStorage를 감싼 구독 가능한 스토어 (React 없음)
//
// React 훅과 분리한 이유: 저장·복원 규칙은 화면과 무관한 로직이고,
// 이렇게 두면 브라우저 없이도 그대로 테스트할 수 있다.
import { DEFAULT_PROFILE, type ProfileStore } from "./profile";

export const STORAGE_KEY = "saebom.profile.v1";

let cache: string | null = null;
let primed = false;
const listeners = new Set<() => void>();

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null; // 시크릿 모드 등에서 접근 자체가 막히는 경우
  }
}

/**
 * 현재 저장된 원본 문자열.
 * 같은 내용이면 반드시 같은 값을 돌려줘야 한다 (useSyncExternalStore 요구사항).
 */
export function readRaw(): string | null {
  if (!primed) {
    try {
      cache = storage()?.getItem(STORAGE_KEY) ?? null;
    } catch {
      cache = null;
    }
    primed = true;
  }
  return cache;
}

/** 프로필을 저장하고 구독자에게 알린다. 내용이 같으면 아무것도 하지 않는다. */
export function writeRaw(next: ProfileStore): void {
  const serialized = JSON.stringify(next);
  if (primed && serialized === cache) return;

  cache = serialized;
  primed = true;
  try {
    storage()?.setItem(STORAGE_KEY, serialized);
  } catch {
    // 저장에 실패해도 화면 상태는 유지한다 (용량 초과 등)
  }
  listeners.forEach((notify) => notify());
}

export function subscribe(notify: () => void): () => void {
  listeners.add(notify);

  // 다른 탭에서 바뀐 경우도 따라간다
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    cache = e.newValue;
    primed = true;
    notify();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(notify);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

/** 깨진 값이 들어 있어도 앱이 멈추지 않게, 항상 온전한 프로필을 돌려준다 */
export function parse(raw: string | null): ProfileStore {
  if (!raw) return DEFAULT_PROFILE;
  try {
    const parsed = JSON.parse(raw) as Partial<ProfileStore> | null;
    if (!parsed || typeof parsed !== "object") return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch {
    return DEFAULT_PROFILE;
  }
}

/** 테스트 전용 — 모듈 수준 캐시를 비운다 */
export function __resetForTest(): void {
  cache = null;
  primed = false;
  listeners.clear();
}
