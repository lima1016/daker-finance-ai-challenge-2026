// 화면(뷰)과 좌측 내비게이션의 단일 출처.
//
// 사이드바·모바일 탭바·홈의 도구 카드가 모두 여기를 본다.
// 항목을 늘리면 세 곳에 동시에 반영된다.

import type { IconName } from "@/components/Icon";
import type { BriefingAction } from "./briefing";

/** 화면이 이동할 수 있는 대상. 브리핑이 고르는 것(BriefingAction)보다 넓다 */
export type NavAction = BriefingAction | "benefits";

export type View = "home" | "chat" | "scanner" | "simulator" | "forecast" | "benefits";

export interface NavItem {
  key: string;
  /** 사이드바용 전체 이름 */
  label: string;
  /** 모바일 탭바용 짧은 이름 */
  short: string;
  icon: IconName;
  view: View;
  /** view === "chat" 일 때 대신 보낼 질문 */
  ask?: string;
  /** 모바일 하단 탭바에 노출할지 */
  mobile?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "홈", short: "홈", icon: "home", view: "home", mobile: true },
  {
    key: "forecast",
    label: "현금흐름 예측",
    short: "현금흐름",
    icon: "forecast",
    view: "forecast",
    mobile: true,
  },
  {
    key: "simulator",
    label: "목돈 배분 시뮬레이터",
    short: "목돈 배분",
    icon: "allocate",
    view: "simulator",
  },
  { key: "scanner", label: "위험 스캐너", short: "위험 스캔", icon: "shield", view: "scanner", mobile: true },
  {
    key: "benefits",
    label: "지원제도 찾기",
    short: "지원제도",
    icon: "gift",
    view: "benefits",
    mobile: true,
  },
  { key: "chat", label: "새봄에게 물어보기", short: "새봄", icon: "chat", view: "chat", mobile: true },
];
