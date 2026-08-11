import { parseHTML } from "linkedom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAppState, type AppState } from "../src/core/state";
import type { TabInfo } from "../src/core/tab";
import { createInputState, type InputState } from "../src/input/command";
import { Renderer, type RenderModel } from "../src/ui/renderer";
import { statusText } from "../src/ui/statusline";

const now = 2_000_000_000_000;

const tab = (lastAccessed: number): TabInfo => ({
  id: 1,
  windowId: 1,
  index: 0,
  url: "https://example.test/",
  domain: "example.test",
  title: "Example",
  lastAccessed,
  active: false,
  pinned: false,
});

describe("Renderer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each([
    [59_000, "59s"],
    [60_000, "1m"],
    [60 * 60_000, "1h"],
    [24 * 60 * 60_000, "1d"],
    [7 * 24 * 60 * 60_000, "1w"],
    [21 * 24 * 60 * 60_000, "3w"],
  ])("renders a tab accessed %i ms ago with the right age unit", (elapsed, expected) => {
    const current = tab(now - elapsed);
    const { document } = parseHTML("<html><body><div id='rows'></div><div id='summary'></div><div id='status'></div><input id='search'></body></html>");
    vi.stubGlobal("document", document);
    vi.stubGlobal("requestAnimationFrame", vi.fn());
    const rows = document.getElementById("rows") as unknown as HTMLElement;
    const renderer = new Renderer(
      rows,
      document.getElementById("summary") as unknown as HTMLElement,
      document.getElementById("status") as unknown as HTMLElement,
      document.getElementById("search") as unknown as HTMLInputElement,
    );
    const model: RenderModel = {
      state: createAppState([current]),
      rows: [{ kind: "tab", rowId: "tab:1", tab: current }],
      cursorRowId: "tab:1",
      input: createInputState(),
      isProtected: () => false,
    };

    renderer.render(model);

    expect(rows.querySelector(".age-column")?.textContent).toBe(expected);
  });
});

describe("statusText", () => {
  const state = (overrides: Partial<AppState> = {}): AppState => ({
    ...createAppState([tab(now), { ...tab(now), id: 2, index: 1 }]),
    markedIds: new Set([2]),
    ...overrides,
  });

  it("includes NORMAL mode, view/sort, total tabs, and global marks", () => {
    const status = statusText(state(), createInputState(), 2);

    expect(status).toContain(
      "-- NORMAL --  Flat · newest accessed · 2 tabs · 1 marked · 2 rows",
    );
    expect(status).toContain("d mark-delete · x execute");
  });

  it("labels help mode clearly", () => {
    expect(statusText(state(), { mode: "help", pending: "" }, 2)).toContain(
      "-- HELP --  Flat · newest accessed",
    );
  });

  it("prompts before executing deletion marks", () => {
    const deletionState = state();
    deletionState.deletionMarkedIds.add(1);

    expect(statusText(deletionState, { mode: "confirmDelete", pending: "" }, 2)).toContain(
      "Really close 1 tab? (y or n)",
    );
  });

  it("includes SEARCH mode and the active filter", () => {
    const input: InputState = { mode: "search", pending: "" };

    expect(statusText(state({ view: "domain", filter: "docs" }), input, 3)).toContain(
      "-- SEARCH --  Domain groups · 2 tabs · 1 marked · /docs · 3 rows",
    );
  });
});

it("renders a deletion mark as d in the marker column", () => {
  const state = createAppState([tab(now)]);
  state.deletionMarkedIds.add(1);
  const { document } = parseHTML("<html><body><div id='rows'></div><div id='summary'></div><div id='status'></div><input id='search'></body></html>");
  vi.stubGlobal("document", document);
  vi.stubGlobal("requestAnimationFrame", vi.fn());
  const rows = document.getElementById("rows") as unknown as HTMLElement;
  const renderer = new Renderer(
    rows,
    document.getElementById("summary") as unknown as HTMLElement,
    document.getElementById("status") as unknown as HTMLElement,
    document.getElementById("search") as unknown as HTMLInputElement,
  );

  renderer.render({
    state,
    input: createInputState(),
    rows: [{ kind: "tab", rowId: "tab:1", tab: tab(now), depth: 0, hasChildren: false, collapsed: false }],
    cursorRowId: "tab:1",
    isProtected: () => false,
  });

  expect(rows.querySelector(".mark-column")?.textContent).toBe("d");
});
