import type { TabInfo } from "../core/tab";

export interface BrowserAdapter {
  getTabs(): Promise<TabInfo[]>;
  getManagerTabId(): Promise<number | null>;
  isManagerUrl(url: string): boolean;
  activateTab(tabId: number): Promise<void>;
  closeTabs(tabIds: number[]): Promise<void>;
  openOrFocusManager(): Promise<void>;
  onTabsChanged(listener: () => void): () => void;
}
