import type { BrowserAdapter } from "../browser/adapter";
import { filterTabs } from "../core/filters";
import { sortTabs } from "../core/sorting";
import { createAppState, markTab, reconcileTabs, unmarkTab, type AppState, type ViewMode } from "../core/state";
import type { TabInfo } from "../core/tab";
import {
  buildDomainRows,
  buildTabForest,
  collectSubtreeIds,
  flattenTreeRows,
  type TreeNode,
} from "../core/views";
import { createInputState, handleKey, type Command, type InputState } from "../input/command";
import { Renderer, type VisibleRow } from "./renderer";

export class Controller {
  private state: AppState = createAppState();
  private input: InputState = createInputState();
  private rows: VisibleRow[] = [];
  private cursorRowId: string | null = null;
  private managerTabId: number | null = null;
  private refreshVersion = 0;
  private refreshTimer: ReturnType<typeof setTimeout> | undefined;
  private unsubscribe: (() => void) | undefined;

  constructor(
    private readonly adapter: BrowserAdapter,
    private readonly renderer: Renderer,
  ) {}

  async start(): Promise<void> {
    window.addEventListener("keydown", this.onKeyDown);
    this.renderer.searchInput.addEventListener("input", this.onSearchInput);
    document.getElementById("rows")?.addEventListener("click", this.onRowClick);
    this.unsubscribe = this.adapter.onTabsChanged(this.scheduleRefresh);
    window.addEventListener("pagehide", this.stop, { once: true });
    await this.refresh();
  }

  private readonly stop = (): void => {
    window.removeEventListener("keydown", this.onKeyDown);
    this.renderer.searchInput.removeEventListener("input", this.onSearchInput);
    this.unsubscribe?.();
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const result = handleKey(this.input, event.key, this.state.view);
    this.input = result.state;

    if (this.input.mode === "search" && !result.command) return;
    if (!result.command && result.state.pending === "") return;

    event.preventDefault();
    if (result.command) void this.run(result.command).catch(console.error);
    else this.render();
  };

  private readonly onSearchInput = (): void => {
    this.state = { ...this.state, filter: this.renderer.searchInput.value };
    this.updateRows();
  };

  private readonly onRowClick = (event: Event): void => {
    const row = (event.target as Element).closest<HTMLElement>(".row");
    if (!row?.dataset.rowId) return;
    this.select(row.dataset.rowId);
    this.render();
  };

  private readonly scheduleRefresh = (): void => {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => void this.refresh().catch(console.error), 80);
  };

  private async refresh(): Promise<void> {
    const version = ++this.refreshVersion;
    const [tabs, managerTabId] = await Promise.all([
      this.adapter.getTabs(),
      this.adapter.getManagerTabId(),
    ]);
    if (version !== this.refreshVersion) return;

    this.managerTabId = managerTabId;
    this.state = reconcileTabs(this.state, tabs);
    this.updateRows();
  }

  private async run(command: Command): Promise<void> {
    if (command === "next") return this.move(1);
    if (command === "previous") return this.move(-1);
    if (command === "first") return this.moveTo(0);
    if (command === "last") return this.moveTo(this.rows.length - 1);
    if (command === "mark") return this.markCurrent(true, true);
    if (command === "unmark") return this.markCurrent(false, true);
    if (command === "toggleMark") return this.toggleCurrent();
    if (command === "unmarkAll") {
      this.state = { ...this.state, markedIds: new Set() };
      return this.render();
    }
    if (command === "markGroup") return this.markGroup();
    if (command === "deleteMarked") return this.deleteMarked();
    if (command === "activate") return this.activateCurrent();
    if (command === "enterSearch") {
      this.render();
      this.renderer.searchInput.focus();
      this.renderer.searchInput.select();
      return;
    }
    if (command === "leaveSearch") {
      this.renderer.searchInput.blur();
      return this.render();
    }
    if (command === "refresh") return this.refresh();
    if (command === "flatView") return this.changeView("flat");
    if (command === "domainView") return this.changeView("domain");
    if (command === "treeView") return this.changeView("tree");
    if (command === "sortAccessed") return this.changeSort("lastAccessed");
    if (command === "sortBrowser") return this.changeSort("browser");
    if (command === "sortDomain") return this.changeSort("domain");
    if (command === "left") return this.left();
    if (command === "right") return this.right();
    if (command === "quit" && this.managerTabId !== null) {
      await this.adapter.closeTabs([this.managerTabId]);
    }
  }

  private updateRows(preferredRowId = this.cursorRowId): void {
    const tabs = filterTabs([...this.state.tabs.values()], this.state.filter);

    if (this.state.view === "flat") {
      this.rows = sortTabs(tabs, this.state.flatSort).map((tab) => ({ kind: "tab", rowId: `tab:${tab.id}`, tab }));
    } else if (this.state.view === "domain") {
      this.rows = buildDomainRows(tabs, this.state.collapsedDomains);
    } else {
      this.rows = flattenTreeRows(buildTabForest(tabs), this.state.collapsedTreeIds);
    }

    const fallback = this.state.cursorId === null ? null : `tab:${this.state.cursorId}`;
    const rowId = [preferredRowId, fallback].find((id) => id && this.rows.some((row) => row.rowId === id));
    this.select(rowId ?? this.rows[0]?.rowId ?? null);
    this.render();
  }

  private render(): void {
    this.renderer.render({
      state: this.state,
      rows: this.rows,
      cursorRowId: this.cursorRowId,
      input: this.input,
      isProtected: (id) => this.isProtected(id),
    });
  }

  private currentRow(): VisibleRow | undefined {
    return this.rows.find((row) => row.rowId === this.cursorRowId);
  }

  private currentTab(): TabInfo | undefined {
    const row = this.currentRow();
    return row?.kind === "tab" ? row.tab : undefined;
  }

  private select(rowId: string | null): void {
    this.cursorRowId = rowId;
    const tab = this.currentTab();
    if (tab) this.state = { ...this.state, cursorId: tab.id };
  }

  private move(delta: number): void {
    const current = this.rows.findIndex((row) => row.rowId === this.cursorRowId);
    this.moveTo(Math.max(0, Math.min(this.rows.length - 1, current + delta)));
  }

  private moveTo(index: number): void {
    if (!this.rows[index]) return;
    this.select(this.rows[index].rowId);
    this.render();
  }

  private markCurrent(mark: boolean, advance: boolean): void {
    const tab = this.currentTab();
    if (tab && !this.isProtected(tab.id)) {
      this.state = mark ? markTab(this.state, tab.id) : unmarkTab(this.state, tab.id);
    }
    if (advance) this.move(1);
    else this.render();
  }

  private toggleCurrent(): void {
    const tab = this.currentTab();
    if (!tab || this.isProtected(tab.id)) return this.render();
    this.state = this.state.markedIds.has(tab.id)
      ? unmarkTab(this.state, tab.id)
      : markTab(this.state, tab.id);
    this.render();
  }

  private markGroup(): void {
    const row = this.currentRow();
    if (!row || this.state.view === "flat") return;

    let ids: number[] = [];
    if (this.state.view === "domain") {
      const domain = row.kind === "domain" ? row.domain : row.tab.domain;
      ids = [...this.state.tabs.values()].filter((tab) => tab.domain === domain).map((tab) => tab.id);
    } else if (row.kind === "tab") {
      const node = findTreeNode(buildTabForest(this.state.tabs.values()), row.tab.id);
      if (node) ids = collectSubtreeIds(node);
    }

    for (const id of ids) if (!this.isProtected(id)) this.state = markTab(this.state, id);
    this.render();
  }

  private async deleteMarked(): Promise<void> {
    const ids = [...this.state.markedIds].filter((id) => !this.isProtected(id));
    if (!ids.length) return;
    await this.adapter.closeTabs(ids);
    this.state = { ...this.state, markedIds: new Set() };
    await this.refresh();
  }

  private async activateCurrent(): Promise<void> {
    const tab = this.currentTab();
    if (tab) await this.adapter.activateTab(tab.id);
  }

  private changeView(view: ViewMode): void {
    this.state = { ...this.state, view };
    this.updateRows();
  }

  private changeSort(flatSort: AppState["flatSort"]): void {
    if (this.state.view !== "flat") return;
    this.state = { ...this.state, flatSort };
    this.updateRows();
  }

  private left(): void {
    if (this.state.view === "domain") return this.collapseDomain();
    if (this.state.view !== "tree") return;
    const row = this.currentRow();
    if (!row || row.kind !== "tab" || !("hasChildren" in row)) return;

    if (row.hasChildren && !row.collapsed) {
      const collapsedTreeIds = new Set(this.state.collapsedTreeIds).add(row.tab.id);
      this.state = { ...this.state, collapsedTreeIds };
      this.updateRows(row.rowId);
      return;
    }

    const visibleTabs = filterTabs([...this.state.tabs.values()], this.state.filter);
    const parent = findTreeParent(buildTabForest(visibleTabs), row.tab.id);
    if (parent && this.rows.some((candidate) => candidate.rowId === `tab:${parent.tab.id}`)) {
      this.select(`tab:${parent.tab.id}`);
      this.render();
    }
  }

  private right(): void {
    if (this.state.view === "domain") return this.expandDomain();
    if (this.state.view !== "tree") return;
    const row = this.currentRow();
    if (!row || row.kind !== "tab" || !("hasChildren" in row) || !row.hasChildren) return;

    if (row.collapsed) {
      const collapsedTreeIds = new Set(this.state.collapsedTreeIds);
      collapsedTreeIds.delete(row.tab.id);
      this.state = { ...this.state, collapsedTreeIds };
      this.updateRows(row.rowId);
      return;
    }

    const index = this.rows.findIndex((candidate) => candidate.rowId === row.rowId);
    const child = this.rows[index + 1];
    if (child?.kind === "tab" && "depth" in child && child.depth === row.depth + 1) {
      this.select(child.rowId);
      this.render();
    }
  }

  private collapseDomain(): void {
    const row = this.currentRow();
    if (!row) return;
    const domain = row.kind === "domain" ? row.domain : row.tab.domain;
    const collapsedDomains = new Set(this.state.collapsedDomains).add(domain);
    this.state = { ...this.state, collapsedDomains };
    this.updateRows(`domain:${domain}`);
  }

  private expandDomain(): void {
    const row = this.currentRow();
    if (!row) return;
    const domain = row.kind === "domain" ? row.domain : row.tab.domain;
    const collapsedDomains = new Set(this.state.collapsedDomains);
    collapsedDomains.delete(domain);
    this.state = { ...this.state, collapsedDomains };
    this.updateRows(row.rowId);
  }

  private isProtected(id: number): boolean {
    const tab = this.state.tabs.get(id);
    return !tab || tab.pinned || id === this.managerTabId || this.adapter.isManagerUrl(tab.url);
  }
}

function findTreeNode(nodes: TreeNode[], id: number): TreeNode | undefined {
  for (const node of nodes) {
    if (node.tab.id === id) return node;
    const child = findTreeNode(node.children, id);
    if (child) return child;
  }
  return undefined;
}

function findTreeParent(nodes: TreeNode[], id: number, parent?: TreeNode): TreeNode | undefined {
  for (const node of nodes) {
    if (node.tab.id === id) return parent;
    const found = findTreeParent(node.children, id, node);
    if (found) return found;
  }
  return undefined;
}
