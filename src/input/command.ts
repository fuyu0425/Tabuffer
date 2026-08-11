import type { ViewMode } from "../core/state";

export type Command =
  | "next"
  | "previous"
  | "first"
  | "last"
  | "mark"
  | "unmark"
  | "unmarkAll"
  | "toggleMark"
  | "markGroup"
  | "deleteMarked"
  | "activate"
  | "enterSearch"
  | "leaveSearch"
  | "refresh"
  | "flatView"
  | "domainView"
  | "treeView"
  | "sortAccessed"
  | "sortBrowser"
  | "sortDomain"
  | "left"
  | "right"
  | "quit";

export interface InputState {
  mode: "normal" | "search";
  pending: "" | "g" | "s";
}

export interface KeyResult {
  state: InputState;
  command?: Command;
}

const singleKeys: Readonly<Record<string, Command>> = {
  j: "next",
  k: "previous",
  G: "last",
  m: "mark",
  u: "unmark",
  U: "unmarkAll",
  "*": "toggleMark",
  M: "markGroup",
  D: "deleteMarked",
  Enter: "activate",
  r: "refresh",
  "1": "flatView",
  "2": "domainView",
  "3": "treeView",
  h: "left",
  l: "right",
  q: "quit",
};

const sortKeys: Readonly<Record<string, Command>> = {
  t: "sortAccessed",
  o: "sortBrowser",
  d: "sortDomain",
};

export function createInputState(): InputState {
  return { mode: "normal", pending: "" };
}

export function handleKey(state: InputState, key: string, view: ViewMode): KeyResult {
  if (state.mode === "search") {
    return key === "Escape"
      ? { state: createInputState(), command: "leaveSearch" }
      : { state };
  }

  if (key === "Escape") return { state: createInputState() };
  if (key === "/") return { state: { mode: "search", pending: "" }, command: "enterSearch" };
  if (state.pending === "g" && key === "g") return command("first");
  if (state.pending === "s" && view === "flat" && sortKeys[key]) return command(sortKeys[key]);
  if (key === "g") return { state: { mode: "normal", pending: "g" } };
  if (key === "s" && view === "flat") return { state: { mode: "normal", pending: "s" } };
  return singleKeys[key] ? command(singleKeys[key]) : { state: createInputState() };
}

function command(value: Command): KeyResult {
  return { state: createInputState(), command: value };
}
