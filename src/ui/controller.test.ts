import { expect, it, vi } from "vitest";

import type { BrowserAdapter } from "../browser/adapter";
import { createAppState, markTab, type AppState } from "../core/state";
import type { TabInfo } from "../core/tab";
import type { Command } from "../input/command";
import { Controller } from "./controller";
import type { Renderer, VisibleRow } from "./renderer";

const tab = (id: number, overrides: Partial<TabInfo> = {}): TabInfo => ({
  id,
  windowId: 1,
  index: id - 1,
  url: `https://example.test/${id}`,
  domain: "example.test",
  title: `Tab ${id}`,
  lastAccessed: 100 - id,
  active: false,
  pinned: false,
  ...overrides,
});

type TestController = {
  state: AppState;
  input: import("../input/command").InputState;
  rows: VisibleRow[];
  cursorRowId: string | null;
  managerTabId: number | null;
  run(command: Command): Promise<void>;
  refresh(): Promise<void>;
  updateRows(preferredRowId?: string | null): void;
  onSearchInput(): void;
};

function setup(
  tabs: TabInfo[],
  managerTabId: number | null = null,
  storage?: Pick<Storage, "getItem" | "setItem">,
) {
  const adapter: BrowserAdapter = {
    getTabs: vi.fn(async () => tabs),
    getManagerTabId: vi.fn(async () => managerTabId),
    isManagerUrl: vi.fn((url) => url === "moz-extension://tabuffer/tabuffer.html"),
    activateTab: vi.fn(async () => {}),
    closeTabs: vi.fn(async () => {}),
    openOrFocusManager: vi.fn(async () => {}),
    onTabsChanged: vi.fn(() => () => {}),
  };
  const searchInput = { value: "", focus: vi.fn(), select: vi.fn(), blur: vi.fn() };
  const renderer = { render: vi.fn(), searchInput } as unknown as Renderer;
  const controller = new Controller(adapter, renderer, storage) as unknown as TestController;
  controller.state = {
    ...createAppState(tabs),
    view: controller.state.view,
    flatSort: controller.state.flatSort,
  };
  controller.managerTabId = managerTabId;
  controller.updateRows();
  return { adapter, controller, searchInput };
}

it("restores a valid saved view and Flat sort", () => {
  const storage = {
    getItem: vi.fn(() => JSON.stringify({ view: "tree", flatSort: "domain" })),
    setItem: vi.fn(),
  };

  const { controller } = setup([tab(1)], null, storage);

  expect(controller.state.view).toBe("tree");
  expect(controller.state.flatSort).toBe("domain");
});

it("saves view and Flat sort changes", async () => {
  const storage = { getItem: vi.fn(() => null), setItem: vi.fn() };
  const { controller } = setup([tab(1)], null, storage);

  await controller.run("domainView");
  await controller.run("flatView");
  await controller.run("sortBrowser");

  expect(storage.setItem).toHaveBeenLastCalledWith(
    "tabuffer.preferences",
    JSON.stringify({ view: "flat", flatSort: "browser" }),
  );
});

it("marks and unmarks the current tab while advancing the cursor", async () => {
  const { controller } = setup([tab(1), tab(2), tab(3)]);

  await controller.run("mark");
  expect([...controller.state.markedIds]).toEqual([1]);
  expect(controller.cursorRowId).toBe("tab:2");

  await controller.run("previous");
  await controller.run("unmark");
  expect([...controller.state.markedIds]).toEqual([]);
  expect(controller.cursorRowId).toBe("tab:2");
});

it("requires confirmation before executing deletion marks", async () => {
  const { adapter, controller } = setup([tab(1), tab(2), tab(3)]);

  await controller.run("markDelete");
  expect([...controller.state.deletionMarkedIds]).toEqual([1]);
  expect(controller.cursorRowId).toBe("tab:2");

  await controller.run("mark");
  await controller.run("requestDeleteConfirmation");
  expect(controller.input.mode).toBe("confirmDelete");
  expect(adapter.closeTabs).not.toHaveBeenCalled();

  await controller.run("executeDeletes");

  expect(adapter.closeTabs).toHaveBeenCalledWith([1]);
  expect(adapter.closeTabs).not.toHaveBeenCalledWith([2]);
});

it("does not mark pinned or manager tabs", async () => {
  const { controller } = setup([tab(1, { pinned: true }), tab(2), tab(3)], 2);

  await controller.run("mark");
  await controller.run("mark");

  expect([...controller.state.markedIds]).toEqual([]);
  expect(controller.cursorRowId).toBe("tab:3");
});

it("preserves global marks across view and filter projection changes", async () => {
  const { controller, searchInput } = setup([
    tab(1, { title: "Keep" }),
    tab(2, { title: "Hidden" }),
  ]);

  await controller.run("mark");
  await controller.run("domainView");
  searchInput.value = "Hidden";
  controller.onSearchInput();

  expect([...controller.state.markedIds]).toEqual([1]);
  expect(controller.state.view).toBe("domain");
  expect(controller.rows.map((row) => row.rowId)).toEqual(["domain:example.test", "tab:2"]);
});

it("marks an entire domain except protected tabs", async () => {
  const { controller } = setup([
    tab(1),
    tab(2, { pinned: true }),
    tab(3, { domain: "other.test", url: "https://other.test/" }),
  ]);
  await controller.run("domainView");

  await controller.run("markGroup");

  expect([...controller.state.markedIds]).toEqual([1]);
});

it("marks the current tree subtree and excludes its sibling", async () => {
  const { controller } = setup([
    tab(1),
    tab(2, { openerTabId: 1 }),
    tab(3, { openerTabId: 2 }),
    tab(4),
  ]);
  await controller.run("treeView");

  await controller.run("markGroup");

  expect([...controller.state.markedIds]).toEqual([1, 2, 3]);
});

it("collapses and expands a domain with h and l", async () => {
  const { controller } = setup([tab(1), tab(2)]);
  await controller.run("domainView");
  await controller.run("next");

  await controller.run("left");
  expect(controller.rows.map((row) => row.rowId)).toEqual(["domain:example.test"]);
  expect(controller.cursorRowId).toBe("domain:example.test");

  await controller.run("right");
  expect(controller.rows.map((row) => row.rowId)).toEqual([
    "domain:example.test",
    "tab:1",
    "tab:2",
  ]);
});

it("navigates, collapses, and expands a tree with h and l", async () => {
  const { controller } = setup([tab(1), tab(2, { openerTabId: 1 }), tab(3)]);
  await controller.run("treeView");

  await controller.run("right");
  expect(controller.cursorRowId).toBe("tab:2");
  await controller.run("left");
  expect(controller.cursorRowId).toBe("tab:1");
  await controller.run("left");
  expect(controller.rows.map((row) => row.rowId)).toEqual(["tab:1", "tab:3"]);
  await controller.run("right");
  expect(controller.rows.map((row) => row.rowId)).toEqual(["tab:1", "tab:2", "tab:3"]);
});

it("keeps the newest refresh when an older query resolves last", async () => {
  let resolveOld!: (tabs: TabInfo[]) => void;
  let resolveNew!: (tabs: TabInfo[]) => void;
  const oldTabs = new Promise<TabInfo[]>((resolve) => { resolveOld = resolve; });
  const newTabs = new Promise<TabInfo[]>((resolve) => { resolveNew = resolve; });
  const { adapter, controller } = setup([]);
  vi.mocked(adapter.getTabs).mockReturnValueOnce(oldTabs).mockReturnValueOnce(newTabs);

  const oldRefresh = controller.refresh();
  const newRefresh = controller.refresh();
  resolveNew([tab(2)]);
  await newRefresh;
  resolveOld([tab(1)]);
  await oldRefresh;

  expect([...controller.state.tabs.keys()]).toEqual([2]);
});

it("activates the selected tab and closes the manager on quit", async () => {
  const { adapter, controller } = setup([tab(1), tab(2)], 99);
  await controller.run("next");

  await controller.run("activate");
  await controller.run("quit");

  expect(adapter.activateTab).toHaveBeenCalledWith(2);
  expect(adapter.closeTabs).toHaveBeenCalledWith([99]);
});

it("rechecks live tab facts and excludes newly pinned and manager tabs before closing", async () => {
  const initial = [tab(1), tab(2), tab(3)];
  const live = [tab(1, { pinned: true }), tab(2), tab(3)];
  const { adapter, controller } = setup(initial);
  controller.state = markTab(markTab(markTab(createAppState(initial), 1), 2), 3);
  vi.mocked(adapter.getTabs).mockResolvedValue(live);
  vi.mocked(adapter.getManagerTabId).mockResolvedValue(2);

  await controller.run("deleteMarked");

  expect(adapter.closeTabs).toHaveBeenCalledWith([3]);
  expect(vi.mocked(adapter.getTabs).mock.invocationCallOrder[0]).toBeLessThan(
    vi.mocked(adapter.closeTabs).mock.invocationCallOrder[0],
  );
  expect(vi.mocked(adapter.getManagerTabId).mock.invocationCallOrder[0]).toBeLessThan(
    vi.mocked(adapter.closeTabs).mock.invocationCallOrder[0],
  );
});

it("preserves a mark added while closing an earlier snapshot", async () => {
  const tabs = [tab(1), tab(2), tab(3)];
  let finishClose!: () => void;
  const closing = new Promise<void>((resolve) => { finishClose = resolve; });
  const { adapter, controller } = setup(tabs);
  controller.state = markTab(createAppState(tabs), 1);
  vi.mocked(adapter.getTabs)
    .mockResolvedValueOnce(tabs)
    .mockResolvedValue(tabs.slice(1));
  vi.mocked(adapter.closeTabs).mockReturnValue(closing);

  const deleting = controller.run("deleteMarked");
  await vi.waitFor(() => expect(adapter.closeTabs).toHaveBeenCalledWith([1]));
  await controller.run("next");
  await controller.run("mark");
  expect([...controller.state.markedIds]).toEqual([1, 2]);

  finishClose();
  await deleting;

  expect([...controller.state.markedIds]).toEqual([2]);
});
