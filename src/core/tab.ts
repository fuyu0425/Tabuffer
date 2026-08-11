export interface BrowserTab {
  id: number;
  windowId: number;
  index: number;
  url?: string;
  title?: string;
  lastAccessed?: number;
  active?: boolean;
  pinned?: boolean;
  openerTabId?: number;
}

export interface TabInfo {
  id: number;
  windowId: number;
  index: number;
  url: string;
  title: string;
  domain: string;
  lastAccessed: number;
  active: boolean;
  pinned: boolean;
  openerTabId?: number;
}

export function normalizeTab(tab: BrowserTab): TabInfo {
  const url = normalizeUrl(tab.url ?? "");

  return {
    id: tab.id,
    windowId: tab.windowId,
    index: tab.index,
    url,
    title: tab.title ?? "",
    domain: domainFromUrl(url),
    lastAccessed: tab.lastAccessed ?? 0,
    active: tab.active ?? false,
    pinned: tab.pinned ?? false,
    openerTabId: tab.openerTabId,
  };
}

export function normalizeUrl(url: string): string {
  try {
    return new URL(url).href;
  } catch {
    return url;
  }
}

export function domainFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.hostname.toLowerCase()
      : "";
  } catch {
    return "";
  }
}
