import type { BrowserAdapter } from "../browser/adapter";
import { filterTabs } from "../core/filters";
import { sortTabs, type TabSort } from "../core/sorting";
import { createAppState, markTab, markTabForDeletion, reconcileTabs, unmarkTab, type AppState, type ThemeMode, type ViewMode } from "../core/state";
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
    private readonly storage?: Pick<Storage, "getItem" | "setItem">,
  ) {
    this.state = { ...this.state, ...readPreferences(storage) };
  }

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
    const key = event.shiftKey && (event.key === "ArrowDown" || event.key === "ArrowUp")
      ? `Shift+${event.key}`
      : event.key;
    const result = handleKey(this.input, key, this.state.view);
    this.input = result.state;

    if (this.input.mode === "search" && !result.command) return;
    if (this.input.mode === "help" && !result.command) {
      event.preventDefault();
      return;
    }
    if (this.input.mode === "confirmDelete" && !result.command) {
      event.preventDefault();
      return;
    }
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
    if (command === "nextPage") return this.movePage(1, "start");
    if (command === "previousPage") return this.movePage(-1, "end");
    if (command === "nextDomain") return this.moveDomain(1);
    if (command === "previousDomain") return this.moveDomain(-1);
    if (command === "recenter") return this.recenter();
    if (command === "first") return this.moveTo(0);
    if (command === "last") return this.moveTo(this.rows.length - 1);
    if (command === "mark") return this.markCurrent(true, true);
    if (command === "markDelete") return this.markCurrentForDeletion();
    if (command === "unmark") {
      if (this.currentRow()?.kind === "domain") return this.unmarkDomain();
      return this.markCurrent(false, true);
    }
    if (command === "toggleMark") return this.toggleCurrent();
    if (command === "unmarkAll") {
      this.state = { ...this.state, markedIds: new Set(), deletionMarkedIds: new Set() };
      return this.render();
    }
    if (command === "markGroup") return this.markGroup();
    if (command === "deleteMarked") {
      if (this.currentRow()?.kind === "domain") return this.markDomainForDeletion();
      return this.deleteMarked();
    }
    if (command === "requestDeleteConfirmation") {
      if (this.state.deletionMarkedIds.size) this.input = { mode: "confirmDelete", pending: "" };
      return this.render();
    }
    if (command === "executeDeletes") {
      this.input = createInputState();
      await this.deleteMarked(true);
      return this.recenter();
    }
    if (command === "cancelDeleteConfirmation") {
      this.input = createInputState();
      return this.render();
    }
    if (command === "activate") return this.activateCurrent();
    if (command === "enterSearch") {
      this.state = { ...this.state, filter: "" };
      this.renderer.searchInput.value = "";
      this.render();
      this.renderer.searchInput.focus();
      return;
    }
    if (command === "acceptSearch") {
      const filter = this.state.filter.trim();
      this.state = {
        ...this.state,
        filterStack: filter ? [...this.state.filterStack, filter] : this.state.filterStack,
        filter: "",
      };
      this.renderer.searchInput.value = "";
      this.renderer.searchInput.blur();
      return this.updateRows();
    }
    if (command === "cancelSearch") {
      this.state = { ...this.state, filter: "" };
      this.renderer.searchInput.value = "";
      this.renderer.searchInput.blur();
      return this.updateRows();
    }
    if (command === "popFilter") {
      this.state = { ...this.state, filterStack: this.state.filterStack.slice(0, -1) };
      return this.updateRows();
    }
    if (command === "enterHelp" || command === "leaveHelp") return this.render();
    if (command === "refresh") return this.refresh();
    if (command === "flatView") return this.changeView("flat");
    if (command === "domainView") return this.changeView("domain");
    if (command === "treeView") return this.changeView("tree");
    if (command === "cycleTheme") return this.cycleTheme();
    if (command === "sortAccessed") return this.changeSort("lastAccessed");
    if (command === "sortBrowser") return this.changeSort("browser");
    if (command === "sortDomain") return this.changeSort("domain");
    if (command === "toggleSortDirection") return this.toggleSortDirection();
    if (command === "left") return this.left();
    if (command === "right") return this.right();
    if (command === "quit" && this.managerTabId !== null) {
      await this.adapter.closeTabs([this.managerTabId]);
    }
  }

  private updateRows(preferredRowId = this.cursorRowId): void {
    const tabs = this.filteredTabs();

    if (this.state.view === "flat") {
      this.rows = sortTabs(tabs, this.state.sort, this.state.sortReversed).map((tab) => ({ kind: "tab", rowId: `tab:${tab.id}`, tab }));
    } else if (this.state.view === "domain") {
      this.rows = buildDomainRows(tabs, this.state.collapsedDomains, this.state.sort, this.state.sortReversed);
    } else {
      this.rows = flattenTreeRows(buildTabForest(tabs, this.state.sort, this.state.sortReversed), this.state.collapsedTreeIds);
    }

    const fallback = this.state.cursorId === null ? null : `tab:${this.state.cursorId}`;
    const rowId = [preferredRowId, fallback].find((id) => id && this.rows.some((row) => row.rowId === id));
    this.select(rowId ?? this.rows[0]?.rowId ?? null);
    this.render();
  }

  private render(cursorScrollBlock: ScrollLogicalPosition = "nearest"): void {
    this.renderer.render({
      state: this.state,
      rows: this.rows,
      cursorRowId: this.cursorRowId,
      input: this.input,
      cursorScrollBlock,
      isProtected: (id) => this.isProtected(id),
    });
  }

  private recenter(): void {
    this.render("center");
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

  private movePage(direction: -1 | 1, block: ScrollLogicalPosition): void {
    const current = this.rows.findIndex((row) => row.rowId === this.cursorRowId);
    this.moveTo(
      Math.max(0, Math.min(this.rows.length - 1, current + direction * this.pageLength())),
      block,
    );
  }

  private moveDomain(direction: -1 | 1): void {
    const current = this.rows.findIndex((row) => row.rowId === this.cursorRowId);
    const rows = direction === 1
      ? this.rows.slice(current + 1)
      : [...this.rows.slice(0, current)].reverse();
    const domain = rows.find((row) => row.kind === "domain");
    if (domain) this.moveTo(this.rows.indexOf(domain));
  }

  private moveTo(index: number, block: ScrollLogicalPosition = "nearest"): void {
    if (!this.rows[index]) return;
    this.select(this.rows[index].rowId);
    this.render(block);
  }

  private pageLength(): number {
    if (typeof window === "undefined" || typeof document === "undefined") return 10;
    const row = document.querySelector<HTMLElement>(".row")?.getBoundingClientRect();
    if (!row?.height) return 10;
    const top = document.querySelector<HTMLElement>("header")?.getBoundingClientRect().bottom ?? 0;
    const bottom = document.querySelector<HTMLElement>("footer")?.getBoundingClientRect().top
      ?? window.innerHeight;
    return Math.max(1, Math.floor((bottom - top) / row.height) - 2);
  }

  private markCurrent(mark: boolean, advance: boolean): void {
    const tab = this.currentTab();
    if (tab) {
      if (mark && !this.isProtected(tab.id)) this.state = markTab(this.state, tab.id);
      if (!mark) this.state = unmarkTab(this.state, tab.id);
    }
    if (advance) this.move(1);
    else this.render();
  }

  private markCurrentForDeletion(): void {
    if (this.currentRow()?.kind === "domain") return this.markDomainForDeletion();
    for (const id of this.deletionTargetIds()) {
      if (!this.isDeletionProtected(id)) this.state = markTabForDeletion(this.state, id);
    }
    this.move(1);
  }

  private markDomainForDeletion(): void {
    for (const id of this.deletionTargetIds()) {
      if (!this.isDeletionProtected(id)) this.state = markTabForDeletion(this.state, id);
    }

    this.moveToOtherDomain();
  }

  private unmarkDomain(): void {
    for (const id of this.deletionTargetIds()) this.state = unmarkTab(this.state, id);
    this.moveToOtherDomain();
  }

  private moveToOtherDomain(): void {
    const current = this.rows.findIndex((row) => row.rowId === this.cursorRowId);
    const next = this.rows.slice(current + 1).find((row) => row.kind === "domain")
      ?? [...this.rows.slice(0, current)].reverse().find((row) => row.kind === "domain");
    this.select(next?.rowId ?? this.cursorRowId);
    this.render();
  }

  private deletionTargetIds(): number[] {
    const row = this.currentRow();
    if (!row) return [];

    if (row.kind === "domain") {
      return this.filteredTabs()
        .filter((tab) => tab.domain === row.domain)
        .map((tab) => tab.id);
    }

    if (this.state.view === "tree" && "hasChildren" in row && row.hasChildren) {
      const node = findTreeNode(buildTabForest(this.filteredTabs(), this.state.sort, this.state.sortReversed), row.tab.id);
      if (node) return collectSubtreeIds(node);
    }

    return [row.tab.id];
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
      const node = findTreeNode(buildTabForest(this.state.tabs.values(), this.state.sort, this.state.sortReversed), row.tab.id);
      if (node) ids = collectSubtreeIds(node);
    }

    for (const id of ids) if (!this.isProtected(id)) this.state = markTab(this.state, id);
    this.render();
  }

  private async deleteMarked(deletionsOnly = false): Promise<void> {
    const [tabs, managerTabId] = await Promise.all([
      this.adapter.getTabs(),
      this.adapter.getManagerTabId(),
    ]);
    const liveTabs = new Map(tabs.map((tab) => [tab.id, tab]));
    const sourceIds = deletionsOnly ? this.state.deletionMarkedIds : this.state.markedIds;
    const ids = [...sourceIds].filter((id) => {
      const tab = liveTabs.get(id);
      return tab
        && (deletionsOnly || !tab.pinned)
        && id !== managerTabId
        && !this.adapter.isManagerUrl(tab.url);
    });
    if (!ids.length) {
      await this.refresh();
      return;
    }
    await this.adapter.closeTabs(ids);
    const remainingIds = new Set(deletionsOnly ? this.state.deletionMarkedIds : this.state.markedIds);
    for (const id of ids) remainingIds.delete(id);
    this.state = deletionsOnly
      ? { ...this.state, deletionMarkedIds: remainingIds }
      : { ...this.state, markedIds: remainingIds };
    await this.refresh();
  }

  private async activateCurrent(): Promise<void> {
    const tab = this.currentTab();
    if (tab) await this.adapter.activateTab(tab.id);
  }

  private changeView(view: ViewMode): void {
    this.state = { ...this.state, view };
    this.savePreferences();
    this.updateRows();
  }

  private changeSort(sort: AppState["sort"]): void {
    this.state = { ...this.state, sort };
    this.savePreferences();
    this.updateRows();
  }

  private toggleSortDirection(): void {
    this.state = { ...this.state, sortReversed: !this.state.sortReversed };
    this.savePreferences();
    this.updateRows();
  }

  private cycleTheme(): void {
    const themes: ThemeMode[] = ["auto", "light", "dark"];
    this.state = {
      ...this.state,
      theme: themes[(themes.indexOf(this.state.theme) + 1) % themes.length],
    };
    this.savePreferences();
    this.render();
  }

  private savePreferences(): void {
    try {
      this.storage?.setItem(
        "tabuffer.preferences",
        JSON.stringify({
          view: this.state.view,
          sort: this.state.sort,
          sortReversed: this.state.sortReversed,
          theme: this.state.theme,
        }),
      );
    } catch {
      // Preferences are optional when storage is unavailable.
    }
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

    const visibleTabs = this.filteredTabs();
    const parent = findTreeParent(buildTabForest(visibleTabs, this.state.sort, this.state.sortReversed), row.tab.id);
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

  private isDeletionProtected(id: number): boolean {
    const tab = this.state.tabs.get(id);
    return !tab || id === this.managerTabId || this.adapter.isManagerUrl(tab.url);
  }

  private filteredTabs(): TabInfo[] {
    return [...this.state.filterStack, this.state.filter]
      .filter(Boolean)
      .reduce((tabs, filter) => filterTabs(tabs, filter), [...this.state.tabs.values()]);
  }
}

function readPreferences(
  storage?: Pick<Storage, "getItem">,
): Partial<Pick<AppState, "view" | "sort" | "sortReversed" | "theme">> {
  try {
    const value = JSON.parse(storage?.getItem("tabuffer.preferences") ?? "null") as {
      view?: unknown;
      sort?: unknown;
      flatSort?: unknown;
      sortReversed?: unknown;
      theme?: unknown;
    } | null;
    if (!value) return {};
    const preferences: Partial<Pick<AppState, "view" | "sort" | "sortReversed" | "theme">> = {};
    if (["flat", "domain", "tree"].includes(value.view as ViewMode)) {
      preferences.view = value.view as ViewMode;
    }
    const sort = value.sort ?? value.flatSort;
    if (["lastAccessed", "browser", "domain"].includes(sort as TabSort)) {
      preferences.sort = sort as TabSort;
    }
    if (typeof value.sortReversed === "boolean") {
      preferences.sortReversed = value.sortReversed;
    }
    if (["auto", "light", "dark"].includes(value.theme as ThemeMode)) {
      preferences.theme = value.theme as ThemeMode;
    }
    return preferences;
  } catch {
    return {};
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
