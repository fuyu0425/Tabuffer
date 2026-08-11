import type { AppState } from "../core/state";
import type { InputState } from "../input/command";

export function statusText(state: AppState, input: InputState, visibleRows: number): string {
  const mode = input.mode === "search" ? "SEARCH" : "NORMAL";
  const view = state.view === "flat" ? `${state.view} · ${state.flatSort}` : state.view;
  const filter = state.filter ? ` · /${state.filter}` : "";
  const marked = state.markedIds.size + state.deletionMarkedIds.size;
  return `-- ${mode} --  ${view} · ${state.tabs.size} tabs · ${marked} marked${filter} · ${visibleRows} rows  · j/k move · d mark-delete · x execute · / search · q quit`;
}
