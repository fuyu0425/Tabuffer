import type { ViewMode } from "../core/state";

export type Command =
  | "next"
  | "previous"
  | "first"
  | "last"
  | "mark"
  | "markDelete"
  | "unmark"
  | "unmarkAll"
  | "toggleMark"
  | "markGroup"
  | "deleteMarked"
  | "requestDeleteConfirmation"
  | "executeDeletes"
  | "cancelDeleteConfirmation"
  | "activate"
  | "enterSearch"
  | "leaveSearch"
  | "enterHelp"
  | "leaveHelp"
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
  mode: "normal" | "search" | "help" | "confirmDelete";
  pending: "" | "g" | "s";
}

export interface KeyResult {
  state: InputState;
  command?: Command;
}

const singleKeys: Readonly<Record<string, Command>> = {
  j: "next",
  ArrowDown: "next",
  k: "previous",
  ArrowUp: "previous",
  G: "last",
  m: "mark",
  d: "markDelete",
  u: "unmark",
  U: "unmarkAll",
  "*": "toggleMark",
  M: "markGroup",
  D: "deleteMarked",
  x: "requestDeleteConfirmation",
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
  if (state.mode === "confirmDelete") {
    if (key === "y") return command("executeDeletes");
    if (key === "n" || key === "Escape") return command("cancelDeleteConfirmation");
    return { state };
  }

  if (state.mode === "help") {
    return key === "Escape" || key === "q" || key === "?"
      ? { state: createInputState(), command: "leaveHelp" }
      : { state };
  }

  if (state.mode === "search") {
    return key === "Escape" || key === "Enter"
      ? { state: createInputState(), command: "leaveSearch" }
      : { state };
  }

  if (key === "Escape") return { state: createInputState() };
  if (key === "?") return { state: { mode: "help", pending: "" }, command: "enterHelp" };
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
