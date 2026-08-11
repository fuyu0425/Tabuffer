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
});
