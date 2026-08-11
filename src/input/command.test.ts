import { describe, expect, it } from "vitest";

import { createInputState, handleKey } from "./command";

describe("normal mode commands", () => {
  it.each([
    ["j", "next"],
    ["ArrowDown", "next"],
    ["k", "previous"],
    ["ArrowUp", "previous"],
    ["G", "last"],
    ["m", "mark"],
    ["d", "markDelete"],
    ["u", "unmark"],
    ["U", "unmarkAll"],
    ["*", "toggleMark"],
    ["M", "markGroup"],
    ["D", "deleteMarked"],
    ["x", "requestDeleteConfirmation"],
    ["Enter", "activate"],
    ["r", "refresh"],
    ["1", "flatView"],
    ["2", "domainView"],
    ["3", "treeView"],
    ["T", "cycleTheme"],
    ["h", "left"],
    ["l", "right"],
    ["q", "quit"],
  ] as const)("maps %s to %s", (key, command) => {
    expect(handleKey(createInputState(), key, "tree")).toMatchObject({ command });
  });

  it("waits for the second g before moving to the first row", () => {
    const pending = handleKey(createInputState(), "g", "flat");

    expect(pending).toEqual({ state: { mode: "normal", pending: "g" } });
    expect(handleKey(pending.state, "g", "flat")).toEqual({
      state: createInputState(),
      command: "first",
    });
  });

  it.each([
    ["t", "sortAccessed"],
    ["o", "sortBrowser"],
    ["d", "sortDomain"],
    ["r", "toggleSortDirection"],
  ] as const)("maps s%s to %s", (key, command) => {
    const pending = handleKey(createInputState(), "s", "flat");

    expect(handleKey(pending.state, key, "flat")).toEqual({
      state: createInputState(),
      command,
    });
  });

  it.each(["flat", "domain", "tree"] as const)("opens and completes the sort prefix in %s view", (view) => {
    const pending = handleKey(createInputState(), "s", view);

    expect(pending).toEqual({
      state: { mode: "normal", pending: "s" },
    });
    expect(handleKey(pending.state, "t", view)).toEqual({
      state: createInputState(),
      command: "sortAccessed",
    });
  });

  it("replaces a stale prefix with a newly started prefix", () => {
    expect(handleKey({ mode: "normal", pending: "g" }, "s", "flat")).toEqual({
      state: { mode: "normal", pending: "s" },
    });
  });
});

describe("search input mode", () => {
  it("enters search mode and emits its focus command", () => {
    expect(handleKey(createInputState(), "/", "flat")).toEqual({
      state: { mode: "search", pending: "" },
      command: "enterSearch",
    });
  });

  it("suspends normal commands while search input is active", () => {
    expect(handleKey({ mode: "search", pending: "" }, "D", "flat")).toEqual({
      state: { mode: "search", pending: "" },
    });
  });

  it("leaves search mode on Escape", () => {
    expect(handleKey({ mode: "search", pending: "" }, "Escape", "flat")).toEqual({
      state: createInputState(),
      command: "cancelSearch",
    });
  });

  it("accepts the current filter and returns to normal mode on Enter", () => {
    expect(handleKey({ mode: "search", pending: "" }, "Enter", "domain")).toEqual({
      state: createInputState(),
      command: "acceptSearch",
    });
  });

  it("pops the newest filter with backslash", () => {
    expect(handleKey(createInputState(), "\\", "flat")).toMatchObject({ command: "popFilter" });
  });

  it("clears a pending normal-mode prefix on Escape", () => {
    expect(handleKey({ mode: "normal", pending: "g" }, "Escape", "flat")).toEqual({
      state: createInputState(),
    });
  });
});

describe("help mode", () => {
  it("opens with ? and closes with ?, q, or Escape", () => {
    const opened = handleKey(createInputState(), "?", "flat");

    expect(opened).toEqual({
      state: { mode: "help", pending: "" },
      command: "enterHelp",
    });
    for (const key of ["?", "q", "Escape"]) {
      expect(handleKey(opened.state, key, "flat")).toEqual({
        state: createInputState(),
        command: "leaveHelp",
      });
    }
  });

  it("suspends normal commands while help is open", () => {
    expect(handleKey({ mode: "help", pending: "" }, "d", "flat")).toEqual({
      state: { mode: "help", pending: "" },
    });
  });
});

describe("delete confirmation mode", () => {
  it("accepts y and cancels with n or Escape", () => {
    const confirmation = { mode: "confirmDelete", pending: "" } as const;

    expect(handleKey(confirmation, "y", "flat")).toEqual({
      state: createInputState(),
      command: "executeDeletes",
    });
    for (const key of ["n", "Escape"]) {
      expect(handleKey(confirmation, key, "flat")).toEqual({
        state: createInputState(),
        command: "cancelDeleteConfirmation",
      });
    }
  });

  it("ignores other keys while awaiting confirmation", () => {
    expect(handleKey({ mode: "confirmDelete", pending: "" }, "d", "flat")).toEqual({
      state: { mode: "confirmDelete", pending: "" },
    });
  });
});
