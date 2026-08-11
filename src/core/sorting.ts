import type { TabInfo } from "./tab";

export type TabSort = "lastAccessed" | "browser" | "domain";

export function sortTabs(tabs: TabInfo[], sort: TabSort): TabInfo[] {
  return [...tabs].sort((a, b) => {
    if (sort === "lastAccessed") return b.lastAccessed - a.lastAccessed || browserOrder(a, b);
    if (sort === "domain") return a.domain.localeCompare(b.domain) || browserOrder(a, b);
    return browserOrder(a, b);
  });
}

function browserOrder(a: TabInfo, b: TabInfo): number {
  return a.windowId - b.windowId || a.index - b.index;
}
