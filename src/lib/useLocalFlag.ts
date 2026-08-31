"use client";

// 이 브라우저에만 기억하는 on/off 값 (예: 채팅 패널을 접어뒀는지).
//
// localStorage도 React 바깥의 상태라 useSyncExternalStore로 구독한다.
// 서버 렌더에서는 항상 기본값을 쓰므로 하이드레이션이 어긋나지 않는다.
import { useCallback, useSyncExternalStore } from "react";

const FLAG_EVENT = "saebom:flag";

function subscribe(onChange: () => void) {
  window.addEventListener(FLAG_EVENT, onChange);
  window.addEventListener("storage", onChange); // 다른 탭에서 바꿨을 때
  return () => {
    window.removeEventListener(FLAG_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useLocalFlag(key: string, fallback: boolean) {
  const read = useCallback(() => {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : v === "1";
    } catch {
      return fallback; // 시크릿 모드 등 접근 불가
    }
  }, [key, fallback]);

  const value = useSyncExternalStore(subscribe, read, () => fallback);

  const write = useCallback(
    (next: boolean) => {
      try {
        localStorage.setItem(key, next ? "1" : "0");
      } catch {
        /* 저장 못 해도 이번 세션 동안은 동작한다 */
      }
      window.dispatchEvent(new Event(FLAG_EVENT));
    },
    [key],
  );

  return [value, write] as const;
}
