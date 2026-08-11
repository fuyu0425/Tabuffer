import type { AppState } from "../core/state";
import type { DomainProjectionRow, TreeTabRow } from "../core/views";
import type { InputState } from "../input/command";
import { statusText } from "./statusline";

export type VisibleRow = DomainProjectionRow | TreeTabRow;

export interface RenderModel {
  state: AppState;
  rows: VisibleRow[];
  cursorRowId: string | null;
  input: InputState;
  isProtected(id: number): boolean;
}

export class Renderer {
  constructor(
    private readonly rowsElement: HTMLElement,
    private readonly summaryElement: HTMLElement,
    private readonly statusElement: HTMLElement,
    readonly searchInput: HTMLInputElement,
  ) {}

  render(model: RenderModel): void {
    const { state, rows, cursorRowId, input } = model;
    this.summaryElement.textContent = `${state.tabs.size} tabs / ${state.markedIds.size + state.deletionMarkedIds.size} marked`;
    this.statusElement.textContent = statusText(state, input, rows.length);
    document.body.dataset.mode = input.mode;
    document.body.dataset.theme = state.theme;
    document.body.dataset.pending = input.pending;
    this.rowsElement.replaceChildren(...rows.map((row) => this.renderRow(row, model)));

    requestAnimationFrame(() => {
      this.rowsElement.querySelector<HTMLElement>(".row.cursor")?.scrollIntoView({ block: "nearest" });
    });
  }

  private renderRow(row: VisibleRow, model: RenderModel): HTMLElement {
    const element = document.createElement("div");
    element.className = `row ${row.kind}`;
    element.dataset.rowId = row.rowId;
    element.role = "option";
    element.ariaSelected = String(row.rowId === model.cursorRowId);
    if (row.rowId === model.cursorRowId) element.classList.add("cursor");

    if (row.kind === "domain") {
      element.append(
        cell("cursor-column", row.rowId === model.cursorRowId ? ">" : " "),
        cell("fold-column", row.collapsed ? "▶" : "▼"),
        domainCell("domain-title", row.domain || "(internal pages)", row.favIconUrl),
        cell("domain-count", String(row.tabCount)),
      );
      return element;
    }

    const protectedTab = model.isProtected(row.tab.id);
    const deletionMarked = model.state.deletionMarkedIds.has(row.tab.id);
    element.classList.toggle("marked", model.state.markedIds.has(row.tab.id) || deletionMarked);
    element.classList.toggle("protected", protectedTab);
    element.classList.toggle("active", row.tab.active);
    const tree = "depth" in row;
    const treePrefix = tree
      ? `${"  ".repeat(row.depth)}${row.hasChildren ? (row.collapsed ? "▶ " : "▼ ") : "  "}`
      : "";

    element.append(
      cell("cursor-column", row.rowId === model.cursorRowId ? ">" : " "),
      cell("mark-column", deletionMarked ? "d" : model.state.markedIds.has(row.tab.id) ? "m" : row.tab.pinned ? "P" : protectedTab ? "!" : " "),
      cell("age-column", relativeAge(row.tab.lastAccessed)),
      tree ? cell("tab-domain", "") : domainCell("tab-domain", row.tab.domain || "—", row.tab.favIconUrl),
      cell("tab-title", tree ? `${treePrefix}${row.tab.title || row.tab.url}` : row.tab.title || row.tab.url),
    );
    return element;
  }
}

function cell(className: string, text: string): HTMLElement {
  const element = document.createElement("span");
  element.className = className;
  element.textContent = text;
  return element;
}

function domainCell(className: string, text: string, favIconUrl?: string): HTMLElement {
  const element = cell(className, text);
  if (!favIconUrl) return element;

  const icon = document.createElement("img");
  icon.className = "domain-icon";
  icon.src = favIconUrl;
  icon.alt = "";
  element.prepend(icon);
  return element;
}

function relativeAge(timestamp: number): string {
  if (!timestamp) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d` : `${Math.floor(days / 7)}w`;
}
