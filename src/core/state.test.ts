import { describe, expect, it } from "vitest";

import {
  createAppState,
  markTab,
  reconcileTabs,
  unmarkTab,
} from "./state";
import type { TabInfo } from "./tab";

const tabs: TabInfo[] = [
  {
    id: 2,
    windowId: 1,
    index: 1,
    url: "https://example.test/two",
    domain: "example.test",
    title: "Two",
    lastAccessed: 2,
    active: false,
    pinned: false,
  },
  {
    id: 1,
    windowId: 1,
    index: 0,
    url: "https://example.test/one",
    domain: "example.test",
    title: "One",
    lastAccessed: 1,
    active: false,
    pinned: true,
  },
];

describe("app state", () => {
  it("preserves marks for retained tabs and removes marks for tabs absent after refresh", () => {
    const markableTabs = tabs.map((tab) => ({ ...tab, pinned: false }));
    const state = markTab(markTab(createAppState(markableTabs), 2), 1);
    const refreshed = reconcileTabs(state, [
      { ...markableTabs[0], title: "Updated two" },
      {
        id: 3,
        windowId: 2,
        index: 0,
        url: "https://new.test/three",
        domain: "new.test",
        title: "Three",
        lastAccessed: 3,
        active: true,
        pinned: false,
      },
    ]);

    expect([...refreshed.markedIds]).toEqual([2]);
    expect(refreshed.tabs.get(2)?.title).toBe("Updated two");
    expect(refreshed.tabs.has(1)).toBe(false);
  });

  it("does not mark pinned tabs and can unmark a marked tab", () => {
    const marked = markTab(createAppState(tabs), 2);

    expect([...markTab(marked, 1).markedIds]).toEqual([2]);
    expect([...unmarkTab(marked, 2).markedIds]).toEqual([]);
  });

  it("removes a mark when a refreshed tab becomes pinned", () => {
    const marked = markTab(createAppState(tabs), 2);
    const refreshed = reconcileTabs(marked, [{ ...tabs[0], pinned: true }, tabs[1]]);

    expect([...refreshed.markedIds]).toEqual([]);
  });

  it("moves a disappeared cursor to the first supplied visible tab", () => {
    const state = { ...createAppState(tabs), cursorId: 2 };
    const refreshed = reconcileTabs(state, [tabs[1], { ...tabs[0], id: 3, index: 2 }], [3]);

    expect(refreshed.cursorId).toBe(3);
  });

  it("moves a retained but hidden cursor to the first supplied visible tab", () => {
    const state = { ...createAppState(tabs), cursorId: 2 };
    const refreshed = reconcileTabs(state, tabs, [1]);

    expect(refreshed.cursorId).toBe(1);
  });
});
