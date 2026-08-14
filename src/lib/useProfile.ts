"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ProfileStore } from "./profile";
import { parse, readRaw, subscribe, writeRaw } from "./profileStore";

// localStorage는 React 바깥의 저장소다. effect에서 읽어 setState로 옮기면
// 첫 렌더에 빈 프로필이 잠깐 보였다가 바뀌므로, 스토어를 직접 구독한다.

const serverSnapshot = () => null;
const clientReady = () => true;
const serverReady = () => false;

/** 프로필을 localStorage에 저장/복원하는 훅 (익명, 로그인 없음) */
export function useProfile() {
  const raw = useSyncExternalStore(subscribe, readRaw, serverSnapshot);

  // raw가 그대로면 같은 객체를 돌려준다 — 이 identity에 의존하는 effect들이 있다
  const data = useMemo(() => parse(raw), [raw]);

  const setData = useCallback<Dispatch<SetStateAction<ProfileStore>>>((update) => {
    // 함수형 갱신은 저장된 최신 값을 기준으로 한다 (스토어가 진실의 원천)
    writeRaw(typeof update === "function" ? update(parse(readRaw())) : update);
  }, []);

  // 서버 렌더/하이드레이션 중에는 false, 브라우저에서 값을 읽은 뒤 true
  const loaded = useSyncExternalStore(subscribe, clientReady, serverReady);

  return { data, setData, loaded };
}
