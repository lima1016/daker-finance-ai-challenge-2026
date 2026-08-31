"use client";

// 단색 선 아이콘 한 벌.
//
// 이모지는 OS마다 모양이 다르고 전부 풀컬러라, 화면에서 "여기가 중요하다"는
// 신호를 아이콘이 가로챈다. 색은 currentColor 하나만 따르게 한다.

export type IconName =
  | "home"
  | "forecast"
  | "allocate"
  | "shield"
  | "gift"
  | "chat"
  | "alert"
  | "sprout"
  | "wallet"
  | "scale"
  | "calendar"
  | "calc"
  | "sparkle"
  | "clip"
  | "lock"
  | "chevronRight"
  | "check";

const PATHS: Record<IconName, React.ReactNode> = {
  home: (
    <>
      <path d="M3 10.2 12 3l9 7.2" />
      <path d="M5.5 9v11h13V9" />
    </>
  ),
  forecast: (
    <>
      <path d="M3 6v14h18" />
      <path d="M6.5 10.5 10 14l3-2.5 4.5 4.5" />
      <path d="M17.5 12.5v3.5H14" />
    </>
  ),
  allocate: (
    <>
      <path d="M12 3a9 9 0 1 0 9 9h-9V3Z" />
      <path d="M14.5 2.6A9 9 0 0 1 21.4 9.5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.2 19 6v5.1c0 4.3-2.9 7.8-7 9.7-4.1-1.9-7-5.4-7-9.7V6l7-2.8Z" />
      <path d="m9.2 11.8 2 2 3.6-3.6" />
    </>
  ),
  gift: (
    <>
      <path d="M4 11h16v9H4z" />
      <path d="M2.8 7.5h18.4V11H2.8z" />
      <path d="M12 7.5V20" />
      <path d="M12 7.5S10.8 4 8.8 4a2 2 0 0 0 0 3.5H12Zm0 0s1.2-3.5 3.2-3.5a2 2 0 0 1 0 3.5H12Z" />
    </>
  ),
  chat: (
    <>
      <path d="M20.5 12.2c0 4-3.8 7.2-8.5 7.2a10 10 0 0 1-2.6-.3L4 21l1.4-3.6a6.8 6.8 0 0 1-2.4-5.2C3 8.2 6.8 5 11.5 5s9 3.2 9 7.2Z" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4.2 21 19.5H3L12 4.2Z" />
      <path d="M12 10v4" />
      <path d="M12 16.8h.01" />
    </>
  ),
  sprout: (
    <>
      <path d="M12 20v-7" />
      <path d="M12 13c0-3.3-2.4-6-5.5-6C6.5 10.6 8.9 13 12 13Z" />
      <path d="M12 13c0-2.8 2-5 4.7-5 0 2.8-2 5-4.7 5Z" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v2.5" />
      <path d="M4 7.5V17a2.5 2.5 0 0 0 2.5 2.5H19a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H4Z" />
      <path d="M16.5 13.8h.01" />
    </>
  ),
  scale: (
    <>
      <path d="M7 5v14" />
      <path d="m4 9 3-4 3 4" />
      <path d="M17 19V5" />
      <path d="m14 15 3 4 3-4" />
    </>
  ),
  calc: (
    <>
      <path d="M6 3.5h12v17H6z" />
      <path d="M9 7.5h6" />
      <path d="M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01" />
    </>
  ),
  sparkle: (
    <>
      <path d="m12 3 1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9L12 3Z" />
    </>
  ),
  clip: (
    <>
      <path d="M20 11.5 12 19.4a5 5 0 0 1-7-7l8.4-8.3a3.3 3.3 0 1 1 4.7 4.7l-8.3 8.3a1.7 1.7 0 0 1-2.4-2.4l7.7-7.6" />
    </>
  ),
  lock: (
    <>
      <path d="M5.5 10.5h13V20h-13z" />
      <path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7" />
    </>
  ),
  check: (
    <>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </>
  ),
  chevronRight: (
    <>
      <path d="m9 5 7 7-7 7" />
    </>
  ),
  calendar: (
    <>
      <path d="M4 6.5h16V20H4z" />
      <path d="M4 10.5h16" />
      <path d="M8.5 4v4" />
      <path d="M15.5 4v4" />
    </>
  ),
};

export function Icon({
  name,
  className = "h-4 w-4",
  strokeWidth = 1.7,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}
