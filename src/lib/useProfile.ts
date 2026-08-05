"use client";

import { useEffect, useState } from "react";
import { DEFAULT_PROFILE, type ProfileStore } from "./profile";

const KEY = "saebom.profile.v1";

/** 프로필을 localStorage에 저장/복원하는 훅 (익명, 로그인 없음) */
export function useProfile() {
  const [data, setData] = useState<ProfileStore>(DEFAULT_PROFILE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setData({ ...DEFAULT_PROFILE, ...JSON.parse(raw) });
    } catch {
      // 무시
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      // 무시
    }
  }, [data, loaded]);

  return { data, setData, loaded };
}
