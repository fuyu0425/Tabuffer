import type { AppState } from "../core/state";
import type { InputState } from "../input/command";

export function statusText(state: AppState, input: InputState, visibleRows: number): string {
  const mode = input.mode === "search" ? "SEARCH" : "NORMAL";
  const sort = state.view === "flat" ? ` · ${state.flatSort}` : "";
  const filter = state.filter ? ` · /${state.filter}` : "";
  return `-- ${mode} --  ${state.view}${sort}${filter}  · ${visibleRows} rows  · j/k move · m mark · D close · / search · q quit`;
}
