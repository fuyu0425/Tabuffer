import { describe, expect, it } from "vitest";

import {
  buildDomainRows,
  buildTabForest,
  collectSubtreeIds,
  flattenTreeRows,
} from "./views";
import type { TabInfo } from "./tab";

const tab = (
  id: number,
  windowId: number,
  index: number,
  domain = "example.test",
  openerTabId?: number,
): TabInfo => ({
  id,
  windowId,
  index,
  url: `https://${domain}/${id}`,
  domain,
  title: `Tab ${id}`,
  lastAccessed: id,
  active: false,
  pinned: false,
  openerTabId,
});

describe("row projections", () => {
  it("groups domains by first browser occurrence and omits collapsed domain tabs", () => {
    const rows = buildDomainRows(
      [tab(3, 2, 0, "beta.test"), tab(2, 1, 1, "alpha.test"), tab(1, 1, 0, "beta.test")],
      new Set(["beta.test"]),
    );

    expect(rows.map((row) => row.kind === "domain" ? `${row.domain}:${row.collapsed}` : row.tab.id)).toEqual([
      "beta.test:true",
      "alpha.test:false",
      2,
    ]);
  });

  it("uses the first available favicon in browser order for a domain header", () => {
    const first = tab(1, 1, 0);
    const second = { ...tab(2, 1, 1), favIconUrl: "https://example.test/icon.png" };
    const third = { ...tab(3, 1, 2), favIconUrl: "https://example.test/later.png" };

    expect(buildDomainRows([third, second, first])[0]).toMatchObject({
      kind: "domain",
      favIconUrl: "https://example.test/icon.png",
    });
  });

  it.each([
    ["browser", ["alpha.test", 1, 3, "zeta.test", 2]],
    ["lastAccessed", ["zeta.test", 2, "alpha.test", 3, 1]],
    ["domain", ["alpha.test", 1, 3, "zeta.test", 2]],
  ] as const)("orders Domain groups and children by %s", (sort, expected) => {
    const tabs = [
      { ...tab(1, 1, 0, "alpha.test"), lastAccessed: 10 },
      { ...tab(2, 1, 1, "zeta.test"), lastAccessed: 100 },
      { ...tab(3, 1, 2, "alpha.test"), lastAccessed: 50 },
    ];

    const rows = buildDomainRows(tabs, new Set(), sort);

    expect(rows.map((row) => row.kind === "domain" ? row.domain : row.tab.id)).toEqual(expected);
  });

  it("keeps a Domain header favicon browser-ordered when rows use another sort", () => {
    const browserFirst = { ...tab(1, 1, 0), lastAccessed: 10, favIconUrl: "browser-first.png" };
    const newest = { ...tab(2, 1, 1), lastAccessed: 100, favIconUrl: "newest.png" };

    expect(buildDomainRows([browserFirst, newest], new Set(), "lastAccessed")[0]).toMatchObject({
      kind: "domain",
      favIconUrl: "browser-first.png",
    });
  });

  it("reverses Domain group and child ordering", () => {
    const rows = buildDomainRows([
      tab(1, 1, 0, "alpha.test"),
      tab(2, 1, 1, "zeta.test"),
      tab(3, 1, 2, "alpha.test"),
    ], new Set(), "domain", true);

    expect(rows.map((row) => row.kind === "domain" ? row.domain : row.tab.id)).toEqual([
      "zeta.test", 2, "alpha.test", 3, 1,
    ]);
  });
});

describe("tab forest", () => {
  it("promotes tabs with missing openers to roots", () => {
    const forest = buildTabForest([tab(2, 1, 1, "example.test", 99), tab(1, 1, 0)]);

    expect(forest.map((node) => node.tab.id)).toEqual([1, 2]);
  });

  it("promotes every member of a malformed opener cycle to a root", () => {
    const forest = buildTabForest([
      tab(1, 1, 0, "example.test", 2),
      tab(2, 1, 1, "example.test", 3),
      tab(3, 1, 2, "example.test", 1),
    ]);

    expect(forest.map((node) => node.tab.id)).toEqual([1, 2, 3]);
    expect(forest.every((node) => node.children.length === 0)).toBe(true);
  });

  it("flattens visible tree rows while keeping collapsed parents visible", () => {
    const forest = buildTabForest([
      tab(1, 1, 0),
      tab(2, 1, 1, "example.test", 1),
      tab(3, 1, 2, "example.test", 2),
      tab(4, 1, 3),
    ]);

    expect(flattenTreeRows(forest, new Set([2])).map((row) => [row.tab.id, row.depth, row.collapsed])).toEqual([
      [1, 0, false],
      [2, 1, true],
      [4, 0, false],
    ]);
  });

  it("collects a tree node and all of its descendants in visible order", () => {
    const [root] = buildTabForest([
      tab(1, 1, 0),
      tab(2, 1, 1, "example.test", 1),
      tab(3, 1, 2, "example.test", 1),
      tab(4, 1, 3, "example.test", 2),
    ]);

    expect(collectSubtreeIds(root)).toEqual([1, 2, 4, 3]);
  });

  it("sorts roots and every child list without changing tree parents", () => {
    const forest = buildTabForest([
      { ...tab(1, 1, 0, "zeta.test"), lastAccessed: 10 },
      { ...tab(2, 1, 1, "beta.test", 1), lastAccessed: 20 },
      { ...tab(3, 1, 2, "alpha.test", 1), lastAccessed: 30 },
      { ...tab(4, 1, 3, "alpha.test"), lastAccessed: 100 },
      { ...tab(5, 1, 4, "zeta.test", 2), lastAccessed: 40 },
    ], "domain");

    expect(forest.map((node) => node.tab.id)).toEqual([4, 1]);
    expect(forest[1].children.map((node) => node.tab.id)).toEqual([3, 2]);
    expect(forest[1].children[1].children.map((node) => node.tab.id)).toEqual([5]);
  });

  it("reverses every Tree sibling set without changing parents", () => {
    const forest = buildTabForest([
      tab(1, 1, 0, "zeta.test"),
      tab(2, 1, 1, "beta.test", 1),
      tab(3, 1, 2, "alpha.test", 1),
      tab(4, 1, 3, "alpha.test"),
    ], "domain", true);

    expect(forest.map((node) => node.tab.id)).toEqual([1, 4]);
    expect(forest[0].children.map((node) => node.tab.id)).toEqual([2, 3]);
  });
});
