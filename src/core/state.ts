import type { TabSort } from "./sorting";
import type { TabInfo } from "./tab";

export type ViewMode = "flat" | "domain" | "tree";

export interface AppState {
  tabs: Map<number, TabInfo>;
  markedIds: Set<number>;
  cursorId: number | null;
  view: ViewMode;
  filter: string;
  flatSort: TabSort;
  collapsedDomains: Set<string>;
  collapsedTreeIds: Set<number>;
}

export function createAppState(tabs: TabInfo[] = []): AppState {
  const tabMap = toTabMap(tabs);

  return {
    tabs: tabMap,
    markedIds: new Set(),
    cursorId: firstTabId(tabMap),
    view: "flat",
    filter: "",
    flatSort: "lastAccessed",
    collapsedDomains: new Set(),
    collapsedTreeIds: new Set(),
  };
}

export function reconcileTabs(
  state: AppState,
  tabs: TabInfo[],
  visibleTabIds?: Iterable<number>,
): AppState {
  const tabMap = toTabMap(tabs);
  const visibleIds = visibleTabIds ? new Set(visibleTabIds) : undefined;
  const markedIds = new Set(
    [...state.markedIds].filter((id) => {
      const tab = tabMap.get(id);
      return tab !== undefined && !tab.pinned;
    }),
  );

  return {
    ...state,
    tabs: tabMap,
    markedIds,
    cursorId: state.cursorId !== null && tabMap.has(state.cursorId) && (!visibleIds || visibleIds.has(state.cursorId))
      ? state.cursorId
      : firstTabId(tabMap, visibleIds),
  };
}

export function markTab(state: AppState, id: number): AppState {
  const tab = state.tabs.get(id);
  if (!tab || tab.pinned || state.markedIds.has(id)) return state;

  return { ...state, markedIds: new Set(state.markedIds).add(id) };
}

export function unmarkTab(state: AppState, id: number): AppState {
  if (!state.markedIds.has(id)) return state;

  const markedIds = new Set(state.markedIds);
  markedIds.delete(id);
  return { ...state, markedIds };
}

function toTabMap(tabs: TabInfo[]): Map<number, TabInfo> {
  return new Map(tabs.map((tab) => [tab.id, tab]));
}

function firstTabId(tabs: Map<number, TabInfo>, visibleTabIds?: ReadonlySet<number>): number | null {
  if (visibleTabIds) {
    for (const id of visibleTabIds) {
      if (tabs.has(id)) return id;
    }
    return null;
  }

  const first = [...tabs.values()].sort(browserOrder)[0];
  return first?.id ?? null;
}

function browserOrder(a: TabInfo, b: TabInfo): number {
  return a.windowId - b.windowId || a.index - b.index;
}
