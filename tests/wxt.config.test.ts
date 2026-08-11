import { expect, it } from "vitest";

import config from "../wxt.config";

it("writes generated artifacts to dist", () => {
  expect((config as { outDir?: string }).outDir).toBe("dist");
});

it("opens from a toolbar action without defining keyboard commands", () => {
  const manifest = (config as {
    manifest?: {
      action?: { default_title?: string; default_icon?: Record<string, string> };
      commands?: Record<string, unknown>;
      icons?: Record<string, string>;
    };
  }).manifest;

  const icons = {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png",
    "512": "icons/icon-512.png",
  };

  expect(manifest?.icons).toEqual(icons);
  expect(manifest?.action).toEqual({ default_title: "Open Tabuffer", default_icon: icons });
  expect(manifest?.commands).toBeUndefined();
});

it("excludes local planning notes from Firefox source archives", () => {
  const zip = (config as { zip?: { excludeSources?: string[] } }).zip;

  expect(zip?.excludeSources).toContain("docs/superpowers/**");
});
