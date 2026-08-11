import { beforeEach, describe, expect, it, vi } from "vitest";

const managerUrl = "moz-extension://tabuffer/tabuffer.html";
const events = vi.hoisted(() => ({
  created: { addListener: vi.fn(), removeListener: vi.fn() },
  removed: { addListener: vi.fn(), removeListener: vi.fn() },
  updated: { addListener: vi.fn(), removeListener: vi.fn() },
  activated: { addListener: vi.fn(), removeListener: vi.fn() },
  moved: { addListener: vi.fn(), removeListener: vi.fn() },
  attached: { addListener: vi.fn(), removeListener: vi.fn() },
  detached: { addListener: vi.fn(), removeListener: vi.fn() },
}));
const fakeBrowser = vi.hoisted(() => ({
  runtime: { getURL: vi.fn(() => "moz-extension://tabuffer/tabuffer.html") },
  tabs: {
    query: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    getCurrent: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    onCreated: events.created,
    onRemoved: events.removed,
    onUpdated: events.updated,
    onActivated: events.activated,
    onMoved: events.moved,
    onAttached: events.attached,
    onDetached: events.detached,
  },
  windows: { update: vi.fn() },
}));

vi.mock("wxt/browser", () => ({ browser: fakeBrowser }));

import { webExtensionAdapter } from "./webextension";

beforeEach(() => {
  vi.clearAllMocks();
  fakeBrowser.tabs.query.mockReset();
  fakeBrowser.tabs.create.mockReset();
  fakeBrowser.tabs.get.mockReset();
  fakeBrowser.tabs.getCurrent.mockReset();
});

describe("manager discovery", () => {
  it("focuses a manager whose creation is still represented by pendingUrl", async () => {
    const tabs: Array<Record<string, unknown>> = [];
    fakeBrowser.tabs.query.mockImplementation(async () => tabs);
    fakeBrowser.tabs.create.mockImplementation(async () => {
      const manager = { id: 42, windowId: 7, url: "", pendingUrl: managerUrl };
      tabs.push(manager);
      return manager;
    });
    fakeBrowser.tabs.get.mockResolvedValue({ id: 42, windowId: 7 });

    await webExtensionAdapter.openOrFocusManager();
    await webExtensionAdapter.openOrFocusManager();

    expect(fakeBrowser.tabs.create).toHaveBeenCalledTimes(1);
    expect(fakeBrowser.windows.update).toHaveBeenCalledWith(7, { focused: true });
    expect(fakeBrowser.tabs.update).toHaveBeenCalledWith(42, { active: true });
  });

  it("finds the manager ID from pendingUrl when getCurrent is unavailable", async () => {
    fakeBrowser.tabs.getCurrent.mockResolvedValue(undefined);
    fakeBrowser.tabs.query.mockResolvedValue([
      { id: 42, url: "", pendingUrl: managerUrl },
    ]);

    await expect(webExtensionAdapter.getManagerTabId()).resolves.toBe(42);
  });
});

describe("tab refresh events", () => {
  it("subscribes to cross-window attach and detach events and removes every listener", () => {
    const listener = vi.fn();
    const unsubscribe = webExtensionAdapter.onTabsChanged(listener);

    const attachedListener = events.attached.addListener.mock.calls[0]?.[0];
    const detachedListener = events.detached.addListener.mock.calls[0]?.[0];
    expect(attachedListener).toBeTypeOf("function");
    expect(detachedListener).toBeTypeOf("function");

    attachedListener();
    detachedListener();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    for (const event of Object.values(events)) {
      expect(event.removeListener).toHaveBeenCalledWith(event.addListener.mock.calls[0][0]);
    }
  });
});
