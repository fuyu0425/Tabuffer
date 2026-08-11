import type { TabInfo } from "./tab";

export type TabSort = "lastAccessed" | "browser" | "domain";

export function sortTabs(tabs: TabInfo[], sort: TabSort, reversed = false): TabInfo[] {
  return [...tabs].sort((a, b) => {
    const order = sort === "lastAccessed"
      ? b.lastAccessed - a.lastAccessed || browserOrder(a, b)
      : sort === "domain"
        ? a.domain.localeCompare(b.domain) || browserOrder(a, b)
        : browserOrder(a, b);
    return reversed ? -order : order;
  });
}

function browserOrder(a: TabInfo, b: TabInfo): number {
  return a.windowId - b.windowId || a.index - b.index;
}
