import { describe, expect, it } from "vitest";

import { sortTabs } from "./sorting";
import type { TabInfo } from "./tab";

const tabs: TabInfo[] = [
  { id: 1, windowId: 2, index: 1, url: "https://zeta.test", domain: "zeta.test", title: "Z", lastAccessed: 20, active: false, pinned: false },
  { id: 2, windowId: 1, index: 2, url: "https://alpha.test", domain: "alpha.test", title: "A", lastAccessed: 30, active: false, pinned: false },
  { id: 3, windowId: 1, index: 0, url: "https://beta.test", domain: "beta.test", title: "B", lastAccessed: 20, active: false, pinned: false },
];

describe("sortTabs", () => {
  it("orders most recently accessed tabs first", () => {
    expect(sortTabs(tabs, "lastAccessed").map((tab) => tab.id)).toEqual([2, 3, 1]);
  });

  it("orders tabs by their browser window and index", () => {
    expect(sortTabs(tabs, "browser").map((tab) => tab.id)).toEqual([3, 2, 1]);
  });

  it("orders tabs by domain", () => {
    expect(sortTabs(tabs, "domain").map((tab) => tab.id)).toEqual([2, 3, 1]);
  });

  it.each([
    ["lastAccessed", [1, 3, 2]],
    ["browser", [1, 2, 3]],
    ["domain", [1, 3, 2]],
  ] as const)("reverses the complete %s comparator", (sort, expected) => {
    expect(sortTabs(tabs, sort, true).map((tab) => tab.id)).toEqual(expected);
  });
});
