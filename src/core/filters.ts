import type { TabInfo } from "./tab";

export function filterTabs(tabs: TabInfo[], query: string): TabInfo[] {
  const needle = query.trim().toLowerCase();

  if (!needle) return tabs;

  return tabs.filter(({ title, url, domain }) =>
    [title, url, domain].some((value) => value.toLowerCase().includes(needle)),
  );
}
