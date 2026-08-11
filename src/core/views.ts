import type { TabInfo } from "./tab";
import { sortTabs, type TabSort } from "./sorting";

export interface TabRow {
  kind: "tab";
  rowId: string;
  tab: TabInfo;
}

export interface DomainRow {
  kind: "domain";
  rowId: string;
  domain: string;
  favIconUrl?: string;
  tabCount: number;
  collapsed: boolean;
}

export type DomainProjectionRow = DomainRow | TabRow;

export interface TreeNode {
  tab: TabInfo;
  children: TreeNode[];
}

export interface TreeTabRow extends TabRow {
  depth: number;
  hasChildren: boolean;
  collapsed: boolean;
}

export function buildDomainRows(
  tabs: Iterable<TabInfo>,
  collapsedDomains: ReadonlySet<string> = new Set(),
  sort: TabSort = "browser",
  reversed = false,
): DomainProjectionRow[] {
  const groups = new Map<string, TabInfo[]>();

  for (const tab of sortTabs([...tabs], sort, reversed)) {
    const group = groups.get(tab.domain);
    if (group) group.push(tab);
    else groups.set(tab.domain, [tab]);
  }

  return [...groups].flatMap(([domain, group]) => {
    const collapsed = collapsedDomains.has(domain);
    const header: DomainRow = {
      kind: "domain",
      rowId: `domain:${domain}`,
      domain,
      favIconUrl: sortTabs(group, "browser").find((tab) => tab.favIconUrl)?.favIconUrl,
      tabCount: group.length,
      collapsed,
    };

    return collapsed ? [header] : [header, ...group.map(tabRow)];
  });
}

export function buildTabForest(
  tabs: Iterable<TabInfo>,
  sort: TabSort = "browser",
  reversed = false,
): TreeNode[] {
  const ordered = sortTabs([...tabs], "browser");
  const nodes = new Map(ordered.map((tab) => [tab.id, { tab, children: [] as TreeNode[] }]));
  const parents = new Map<number, number>();

  for (const tab of ordered) {
    if (tab.openerTabId !== undefined && nodes.has(tab.openerTabId)) {
      parents.set(tab.id, tab.openerTabId);
    }
  }

  const cycleIds = findCycleIds(parents);
  const roots: TreeNode[] = [];

  for (const tab of ordered) {
    const node = nodes.get(tab.id)!;
    const parentId = parents.get(tab.id);
    if (parentId === undefined || cycleIds.has(tab.id)) {
      roots.push(node);
    } else {
      nodes.get(parentId)!.children.push(node);
    }
  }

  return sortTreeNodes(roots, sort, reversed);
}

export function flattenTreeRows(
  roots: Iterable<TreeNode>,
  collapsedTreeIds: ReadonlySet<number> = new Set(),
): TreeTabRow[] {
  const rows: TreeTabRow[] = [];
  const visited = new Set<number>();

  const visit = (node: TreeNode, depth: number): void => {
    if (visited.has(node.tab.id)) return;
    visited.add(node.tab.id);

    const collapsed = collapsedTreeIds.has(node.tab.id);
    rows.push({
      ...tabRow(node.tab),
      depth,
      hasChildren: node.children.length > 0,
      collapsed,
    });

    if (!collapsed) node.children.forEach((child) => visit(child, depth + 1));
  };

  for (const root of roots) visit(root, 0);
  return rows;
}

export function collectSubtreeIds(root: TreeNode): number[] {
  const ids: number[] = [];
  const visited = new Set<number>();

  const collect = (node: TreeNode): void => {
    if (visited.has(node.tab.id)) return;
    visited.add(node.tab.id);
    ids.push(node.tab.id);
    node.children.forEach(collect);
  };

  collect(root);
  return ids;
}

function tabRow(tab: TabInfo): TabRow {
  return { kind: "tab", rowId: `tab:${tab.id}`, tab };
}

function sortTreeNodes(nodes: TreeNode[], sort: TabSort, reversed: boolean): TreeNode[] {
  const byId = new Map(nodes.map((node) => [node.tab.id, node]));
  return sortTabs(nodes.map((node) => node.tab), sort, reversed).map((tab) => {
    const node = byId.get(tab.id)!;
    node.children = sortTreeNodes(node.children, sort, reversed);
    return node;
  });
}

function findCycleIds(parents: ReadonlyMap<number, number>): Set<number> {
  const cycleIds = new Set<number>();

  for (const start of parents.keys()) {
    const path: number[] = [];
    const positions = new Map<number, number>();
    let current: number | undefined = start;

    while (current !== undefined && !positions.has(current)) {
      positions.set(current, path.length);
      path.push(current);
      current = parents.get(current);
    }

    if (current !== undefined) {
      for (const id of path.slice(positions.get(current)!)) cycleIds.add(id);
    }
  }

  return cycleIds;
}
