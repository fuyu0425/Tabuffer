import { describe, expect, it } from "vitest";

import { filterTabs } from "./filters";
import type { TabInfo } from "./tab";

const tabs: TabInfo[] = [
  {
    id: 1,
    windowId: 1,
    index: 0,
    url: "https://docs.example.com/Guide",
    domain: "docs.example.com",
    title: "TypeScript Handbook",
    lastAccessed: 10,
    active: false,
    pinned: false,
  },
  {
    id: 2,
    windowId: 1,
    index: 1,
    url: "https://other.test/notes",
    domain: "other.test",
    title: "Notes",
    lastAccessed: 20,
    active: false,
    pinned: false,
  },
];

describe("filterTabs", () => {
  it.each([
    ["handbook", [1]],
    ["GUIDE", [1]],
    ["DOCS.EXAMPLE", [1]],
  ])("matches title, URL, and domain without case sensitivity", (query, ids) => {
    expect(filterTabs(tabs, query).map((tab) => tab.id)).toEqual(ids);
  });

  it("returns every tab for an empty query", () => {
    expect(filterTabs(tabs, "")).toEqual(tabs);
  });
});
