import { describe, expect, it } from "vitest";

import { createInputState, handleKey } from "./command";

describe("normal mode commands", () => {
  it.each([
    ["j", "next"],
    ["k", "previous"],
    ["G", "last"],
    ["m", "mark"],
    ["d", "mark"],
    ["u", "unmark"],
    ["U", "unmarkAll"],
    ["*", "toggleMark"],
    ["M", "markGroup"],
    ["D", "deleteMarked"],
    ["x", "deleteMarked"],
    ["Enter", "activate"],
    ["r", "refresh"],
    ["1", "flatView"],
    ["2", "domainView"],
    ["3", "treeView"],
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
  ] as const)("maps flat-mode s%s to %s", (key, command) => {
    const pending = handleKey(createInputState(), "s", "flat");

    expect(handleKey(pending.state, key, "flat")).toEqual({
      state: createInputState(),
      command,
    });
  });

  it("does not start a sort prefix outside Flat view", () => {
    expect(handleKey(createInputState(), "s", "domain")).toEqual({
      state: createInputState(),
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
      command: "leaveSearch",
    });
  });

  it("clears a pending normal-mode prefix on Escape", () => {
    expect(handleKey({ mode: "normal", pending: "g" }, "Escape", "flat")).toEqual({
      state: createInputState(),
    });
  });
});
