import type { AppState } from "../core/state";
import type { InputState } from "../input/command";

export function statusText(state: AppState, input: InputState, visibleRows: number): string {
  const mode = input.mode === "search" ? "SEARCH" : "NORMAL";
  const view = state.view === "flat" ? `${state.view} · ${state.flatSort}` : state.view;
  const filter = state.filter ? ` · /${state.filter}` : "";
  return `-- ${mode} --  ${view} · ${state.tabs.size} tabs · ${state.markedIds.size} marked${filter} · ${visibleRows} rows  · j/k move · m mark · D close · / search · q quit`;
}
