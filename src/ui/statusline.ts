import type { AppState } from "../core/state";
import type { InputState } from "../input/command";

export function statusText(state: AppState, input: InputState, visibleRows: number): string {
  const mode = input.mode.toUpperCase();
  const sortLabels = {
    lastAccessed: "newest accessed",
    browser: "browser order",
    domain: "domain",
  } as const;
  const view = state.view === "flat"
    ? `Flat · ${sortLabels[state.flatSort]}`
    : state.view === "domain" ? "Domain groups" : "Opener tree";
  const filter = state.filter ? ` · /${state.filter}` : "";
  const marked = state.markedIds.size + state.deletionMarkedIds.size;
  const keys = input.mode === "help"
    ? "q/?/Esc close help"
    : "j/k move · d mark-delete · x execute · / search · ? help · q quit";
  return `-- ${mode} --  ${view} · ${state.tabs.size} tabs · ${marked} marked${filter} · ${visibleRows} rows  · ${keys}`;
}
