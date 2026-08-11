import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Tabuffer stylesheet", () => {
  it("uses the same concrete monospace font in Firefox and Chrome", () => {
    const css = readFileSync("src/entrypoints/tabuffer/style.css", "utf8");

    expect(css).toContain("font: 14px/1.45 Menlo, Monaco, Consolas, monospace;");
  });
});
