import { expect, it, vi } from "vitest";

import type { BrowserAdapter } from "../browser/adapter";
import { createAppState, markTab, type AppState } from "../core/state";
import type { TabInfo } from "../core/tab";
import type { Command } from "../input/command";
import { Controller } from "./controller";
import type { Renderer, VisibleRow } from "./renderer";

const tab = (id: number): TabInfo => ({
  id,
  windowId: 1,
  index: id - 1,
  url: `https://example.test/${id}`,
  domain: "example.test",
  title: `Tab ${id}`,
  lastAccessed: id,
  active: false,
  pinned: false,
});

it("preserves a mark added while closing an earlier snapshot", async () => {
  const tabs = [tab(1), tab(2), tab(3)];
  let finishClose!: () => void;
  const closing = new Promise<void>((resolve) => { finishClose = resolve; });
  const adapter: BrowserAdapter = {
    getTabs: vi.fn(async () => tabs.slice(1)),
    getManagerTabId: vi.fn(async () => null),
    isManagerUrl: vi.fn(() => false),
    activateTab: vi.fn(async () => {}),
    closeTabs: vi.fn(() => closing),
    openOrFocusManager: vi.fn(async () => {}),
    onTabsChanged: vi.fn(() => () => {}),
  };
  const renderer = { render: vi.fn() } as unknown as Renderer;
  const controller = new Controller(adapter, renderer) as unknown as {
    state: AppState;
    rows: VisibleRow[];
    cursorRowId: string | null;
    run(command: Command): Promise<void>;
  };
  controller.state = markTab(createAppState(tabs), 1);
  controller.rows = tabs.map((current) => ({ kind: "tab", rowId: `tab:${current.id}`, tab: current }));
  controller.cursorRowId = "tab:1";

  const deleting = controller.run("deleteMarked");
  await controller.run("next");
  await controller.run("mark");
  expect([...controller.state.markedIds]).toEqual([1, 2]);

  finishClose();
  await deleting;

  expect(adapter.closeTabs).toHaveBeenCalledWith([1]);
  expect([...controller.state.markedIds]).toEqual([2]);
});
