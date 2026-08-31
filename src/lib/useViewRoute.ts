"use client";

// 화면 전환을 브라우저 히스토리에 남긴다.
//
// 이전에는 view가 state로만 있어서 URL이 그대로였다. 히스토리에 아무것도
// 쌓이지 않으니 뒤로가기를 누르면 화면이 돌아가는 게 아니라 앱을 나가버렸다.
// 모바일에서는 뒤로가기가 기본 이동 수단이라 특히 치명적이다.
//
// history는 React 바깥의 상태라, effect에서 setState로 따라가지 않고
// useSyncExternalStore로 직접 구독한다.
import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { View } from "./nav";

const VIEWS: View[] = ["home", "chat", "scanner", "simulator", "forecast", "benefits"];
/** pushState/replaceState는 popstate를 쏘지 않으므로 직접 알린다 */
const ROUTE_EVENT = "saebom:route";

export interface RouteState {
  view: View;
  panel: boolean;
}

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(ROUTE_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(ROUTE_EVENT, onChange);
  };
}

const getSearch = () => window.location.search;
const getServerSearch = () => "";

function parse(search: string): RouteState {
  const q = new URLSearchParams(search);
  const tab = q.get("tab");
  return {
    view: VIEWS.includes(tab as View) ? (tab as View) : "home",
    panel: q.get("panel") === "1",
  };
}

/** 다른 쿼리(?v=3 같은 것)는 건드리지 않고 tab/panel만 갱신한 URL */
function buildUrl({ view, panel }: RouteState): string {
  const q = new URLSearchParams(window.location.search);
  if (view === "home") q.delete("tab");
  else q.set("tab", view);
  if (panel) q.set("panel", "1");
  else q.delete("panel");
  const s = q.toString();
  return `${window.location.pathname}${s ? `?${s}` : ""}`;
}

export function useViewRoute() {
  const search = useSyncExternalStore(subscribe, getSearch, getServerSearch);
  const route = useMemo(() => parse(search), [search]);

  const apply = useCallback((next: Partial<RouteState>, mode: "push" | "replace") => {
    const merged = { ...parse(window.location.search), ...next };
    const url = buildUrl(merged);
    if (mode === "push") window.history.pushState(merged, "", url);
    else window.history.replaceState(merged, "", url);
    window.dispatchEvent(new Event(ROUTE_EVENT));
  }, []);

  /** 히스토리에 한 칸 쌓으며 이동 — 뒤로가기로 돌아올 수 있다 */
  const push = useCallback((next: Partial<RouteState>) => apply(next, "push"), [apply]);

  /** 사용자가 누른 이동이 아닐 때 (화면 폭 변화 등) — 히스토리를 더럽히지 않는다 */
  const replace = useCallback((next: Partial<RouteState>) => apply(next, "replace"), [apply]);

  /** 패널 닫기 — 열 때 쌓은 칸을 되돌려 히스토리에 빈 칸이 남지 않게 한다 */
  const closePanel = useCallback(() => {
    if (parse(window.location.search).panel) window.history.back();
    else apply({ panel: false }, "replace");
  }, [apply]);

  return { view: route.view, panelOpen: route.panel, push, replace, closePanel };
}
