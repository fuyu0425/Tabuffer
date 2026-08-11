import type { TabSort } from "./sorting";
import type { TabInfo } from "./tab";

export type ViewMode = "flat" | "domain" | "tree";

export interface AppState {
  tabs: Map<number, TabInfo>;
  markedIds: Set<number>;
  deletionMarkedIds: Set<number>;
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
    deletionMarkedIds: new Set(),
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
): AppState {
  const tabMap = toTabMap(tabs);
  const markedIds = new Set(
    [...state.markedIds].filter((id) => {
      const tab = tabMap.get(id);
      return tab !== undefined && !tab.pinned;
    }),
  );
  const deletionMarkedIds = new Set(
    [...state.deletionMarkedIds].filter((id) => {
      const tab = tabMap.get(id);
      return tab !== undefined && !tab.pinned;
    }),
  );

  return {
    ...state,
    tabs: tabMap,
    markedIds,
    deletionMarkedIds,
    cursorId: state.cursorId !== null && tabMap.has(state.cursorId)
      ? state.cursorId
      : firstTabId(tabMap),
  };
}

export function markTab(state: AppState, id: number): AppState {
  const tab = state.tabs.get(id);
  if (!tab || tab.pinned || state.markedIds.has(id)) return state;

  const deletionMarkedIds = new Set(state.deletionMarkedIds);
  deletionMarkedIds.delete(id);
  return { ...state, markedIds: new Set(state.markedIds).add(id), deletionMarkedIds };
}

export function markTabForDeletion(state: AppState, id: number): AppState {
  const tab = state.tabs.get(id);
  if (!tab || tab.pinned || state.deletionMarkedIds.has(id)) return state;

  const markedIds = new Set(state.markedIds);
  markedIds.delete(id);
  return {
    ...state,
    markedIds,
    deletionMarkedIds: new Set(state.deletionMarkedIds).add(id),
  };
}

export function unmarkTab(state: AppState, id: number): AppState {
  if (!state.markedIds.has(id) && !state.deletionMarkedIds.has(id)) return state;

  const markedIds = new Set(state.markedIds);
  const deletionMarkedIds = new Set(state.deletionMarkedIds);
  markedIds.delete(id);
  deletionMarkedIds.delete(id);
  return { ...state, markedIds, deletionMarkedIds };
}

function toTabMap(tabs: TabInfo[]): Map<number, TabInfo> {
  return new Map(tabs.map((tab) => [tab.id, tab]));
}

function firstTabId(tabs: Map<number, TabInfo>): number | null {
  const first = [...tabs.values()].sort(browserOrder)[0];
  return first?.id ?? null;
}

function browserOrder(a: TabInfo, b: TabInfo): number {
  return a.windowId - b.windowId || a.index - b.index;
}
