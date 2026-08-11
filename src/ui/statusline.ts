import type { AppState } from "../core/state";
import type { InputState } from "../input/command";

export function statusText(state: AppState, input: InputState, visibleRows: number): string {
  if (input.mode === "confirmDelete") {
    const count = state.deletionMarkedIds.size;
    return `Really close ${count} ${count === 1 ? "tab" : "tabs"}? (y or n)`;
  }

  const mode = input.mode.toUpperCase();
  const sortLabels = {
    lastAccessed: "newest accessed",
    browser: "browser order",
    domain: "domain A→Z",
  } as const;
  const reversedSortLabels = {
    lastAccessed: "oldest accessed",
    browser: "reverse browser order",
    domain: "domain Z→A",
  } as const;
  const viewLabel = state.view === "flat"
    ? "Flat"
    : state.view === "domain" ? "Domain groups" : "Opener tree";
  const sort = (state.sortReversed ? reversedSortLabels : sortLabels)[state.sort];
  const view = `${viewLabel} · ${sort}`;
  const filters = state.filterStack.map((filter) => `/${filter}`);
  if (input.mode === "search") filters.push(`/${state.filter}_`);
  const filter = filters.length ? ` · ${filters.join(" ")}` : "";
  const marked = state.markedIds.size + state.deletionMarkedIds.size;
  const keys = input.mode === "help"
    ? "q/?/Esc close help"
    : "j/k move · s sort · d mark-delete · x execute · / push search · \\ pop search · ? help · q quit";
  return `-- ${mode} --  ${view} · theme:${state.theme} · ${state.tabs.size} tabs · ${marked} marked${filter} · ${visibleRows} rows  · ${keys}`;
}
