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
      "-- NORMAL --  Flat · newest accessed · theme:auto · 2 tabs · 1 marked · 2 rows",
    );
    expect(status).toContain("d mark-delete · x execute");
  });

  it("reports the selected theme", () => {
    expect(statusText(state({ theme: "dark" }), createInputState(), 2)).toContain("theme:dark");
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

    expect(statusText(state({ view: "domain", filterStack: ["github"], filter: "docs" }), input, 3)).toContain(
      "-- SEARCH --  Domain groups · newest accessed · theme:auto · 2 tabs · 1 marked · /github /docs_ · 3 rows",
    );
  });

  it("reports the selected sort in Tree view", () => {
    expect(statusText(state({ view: "tree", sort: "domain" }), createInputState(), 2)).toContain(
      "Opener tree · domain",
    );
  });

  it.each([
    ["lastAccessed", "oldest accessed"],
    ["browser", "reverse browser order"],
    ["domain", "domain Z→A"],
  ] as const)("reports reversed %s sorting as %s", (sort, label) => {
    expect(statusText(state({ sort, sortReversed: true }), createInputState(), 2)).toContain(label);
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

it("exposes the selected theme on the document body", () => {
  const current = tab(now);
  const state = createAppState([current]);
  state.theme = "light";
  const { document } = parseHTML("<html><body><div id='rows'></div><div id='summary'></div><div id='status'></div><input id='search'></body></html>");
  vi.stubGlobal("document", document);
  vi.stubGlobal("requestAnimationFrame", vi.fn());
  const renderer = new Renderer(
    document.getElementById("rows") as unknown as HTMLElement,
    document.getElementById("summary") as unknown as HTMLElement,
    document.getElementById("status") as unknown as HTMLElement,
    document.getElementById("search") as unknown as HTMLInputElement,
  );

  renderer.render({
    state,
    input: createInputState(),
    rows: [{ kind: "tab", rowId: "tab:1", tab: current }],
    cursorRowId: "tab:1",
    isProtected: () => false,
  });

  expect(document.body.dataset.theme).toBe("light");
});

it("exposes the pending sort prefix for the which-key panel", () => {
  const current = tab(now);
  const { document } = parseHTML("<html><body><div id='rows'></div><div id='summary'></div><div id='status'></div><input id='search'></body></html>");
  vi.stubGlobal("document", document);
  vi.stubGlobal("requestAnimationFrame", vi.fn());
  const renderer = new Renderer(
    document.getElementById("rows") as unknown as HTMLElement,
    document.getElementById("summary") as unknown as HTMLElement,
    document.getElementById("status") as unknown as HTMLElement,
    document.getElementById("search") as unknown as HTMLInputElement,
  );

  renderer.render({
    state: createAppState([current]),
    input: { mode: "normal", pending: "s" },
    rows: [{ kind: "tab", rowId: "tab:1", tab: current }],
    cursorRowId: "tab:1",
    isProtected: () => false,
  });

  expect(document.body.dataset.pending).toBe("s");
});

it("renders the favicon before a tab domain", () => {
  const current = { ...tab(now), favIconUrl: "https://example.test/favicon.ico" };
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
    state: createAppState([current]),
    input: createInputState(),
    rows: [{ kind: "tab", rowId: "tab:1", tab: current }],
    cursorRowId: "tab:1",
    isProtected: () => false,
  });

  const domain = rows.querySelector(".tab-domain")!;
  const icon = domain.querySelector<HTMLImageElement>(".domain-icon");
  expect(icon?.src).toBe("https://example.test/favicon.ico");
  expect(icon?.alt).toBe("");
  expect(domain.firstElementChild).toBe(icon);
  expect(domain.textContent).toBe("example.test");
});

it("omits the favicon element when a domain group has no icon", () => {
  const current = tab(now);
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
    state: createAppState([current]),
    input: createInputState(),
    rows: [{ kind: "domain", rowId: "domain:example.test", domain: "example.test", tabCount: 1, collapsed: true }],
    cursorRowId: "domain:example.test",
    isProtected: () => false,
  });

  expect(rows.querySelector(".domain-title")?.textContent).toBe("example.test");
  expect(rows.querySelector(".domain-icon")).toBeNull();
});

it("renders a domain group's selected favicon before its name", () => {
  const current = tab(now);
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
    state: createAppState([current]),
    input: createInputState(),
    rows: [{ kind: "domain", rowId: "domain:example.test", domain: "example.test", favIconUrl: "https://example.test/favicon.ico", tabCount: 1, collapsed: true }],
    cursorRowId: "domain:example.test",
    isProtected: () => false,
  });

  const domain = rows.querySelector(".domain-title")!;
  expect(domain.querySelector<HTMLImageElement>(".domain-icon")?.src).toBe("https://example.test/favicon.ico");
  expect(domain.textContent).toBe("example.test");
});
