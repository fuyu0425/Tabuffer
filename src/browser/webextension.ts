import { browser } from "wxt/browser";

import { normalizeTab, type TabInfo } from "../core/tab";
import type { BrowserAdapter } from "./adapter";

const managerUrl = browser.runtime.getURL("/tabuffer.html");

export const webExtensionAdapter: BrowserAdapter = {
  async getTabs() {
    const result: TabInfo[] = [];

    for (const tab of await browser.tabs.query({})) {
      if (tab.id === undefined || tab.windowId === undefined) continue;
      result.push(normalizeTab({
        id: tab.id,
        windowId: tab.windowId,
        index: tab.index,
        url: tab.url,
        title: tab.title,
        lastAccessed: tab.lastAccessed,
        active: tab.active,
        pinned: tab.pinned,
        openerTabId: tab.openerTabId,
      }));
    }

    return result;
  },

  async getManagerTabId() {
    const current = await browser.tabs.getCurrent().catch(() => undefined);
    if (current?.id !== undefined) return current.id;

    const tabs = await browser.tabs.query({});
    return tabs.find((tab) => tab.id !== undefined && isManagerTab(tab))?.id ?? null;
  },

  isManagerUrl(url) {
    try {
      return new URL(url).href === new URL(managerUrl).href;
    } catch {
      return false;
    }
  },

  async activateTab(tabId) {
    const tab = await browser.tabs.get(tabId);
    if (tab.windowId !== undefined) await browser.windows.update(tab.windowId, { focused: true });
    await browser.tabs.update(tabId, { active: true });
  },

  async closeTabs(tabIds) {
    if (tabIds.length) await browser.tabs.remove(tabIds);
  },

  async openOrFocusManager() {
    const existing = (await browser.tabs.query({})).find((tab) =>
      tab.id !== undefined && isManagerTab(tab),
    );

    if (existing?.id !== undefined) {
      await this.activateTab(existing.id);
    } else {
      await browser.tabs.create({ url: managerUrl });
    }
  },

  onTabsChanged(listener) {
    const events = [
      browser.tabs.onCreated,
      browser.tabs.onRemoved,
      browser.tabs.onUpdated,
      browser.tabs.onActivated,
      browser.tabs.onMoved,
      browser.tabs.onAttached,
      browser.tabs.onDetached,
    ];
    const notify = () => listener();

    for (const event of events) event.addListener(notify);
    return () => {
      for (const event of events) event.removeListener(notify);
    };
  },
};

function isManagerTab(tab: { url?: string; pendingUrl?: string }): boolean {
  return [tab.url, tab.pendingUrl].some((url) => url !== undefined && webExtensionAdapter.isManagerUrl(url));
}
