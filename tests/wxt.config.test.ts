import { expect, it } from "vitest";

import config from "../wxt.config";

type TestManifest = {
  action?: { default_title?: string; default_icon?: Record<string, string> };
  browser_specific_settings?: { gecko?: { id?: string } };
  commands?: Record<string, unknown>;
  icons?: Record<string, string>;
};

async function manifestFor(browser: "chrome" | "firefox"): Promise<TestManifest> {
  const manifest = config.manifest;
  if (typeof manifest !== "function") return (await manifest) as TestManifest;
  return await manifest({
    browser,
    command: "build",
    mode: "production",
    manifestVersion: 3,
  }) as unknown as TestManifest;
}

it("writes generated artifacts to dist", () => {
  expect((config as { outDir?: string }).outDir).toBe("dist");
});

it("uses a stable extension ID only in Firefox manifests", async () => {
  expect((await manifestFor("firefox")).browser_specific_settings?.gecko?.id).toBe(
    "tabuffer@fuyu0425.github.io",
  );
  expect((await manifestFor("chrome")).browser_specific_settings).toBeUndefined();
});

it("opens from a toolbar action without defining keyboard commands", async () => {
  const manifest = await manifestFor("chrome");

  const icons = {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png",
    "512": "icons/icon-512.png",
  };

  expect(manifest.icons).toEqual(icons);
  expect(manifest.action).toEqual({ default_title: "Open Tabuffer", default_icon: icons });
  expect(manifest.commands).toBeUndefined();
});

it("excludes local planning notes from Firefox source archives", () => {
  const zip = (config as { zip?: { excludeSources?: string[] } }).zip;

  expect(zip?.excludeSources).toContain("docs/superpowers/**");
});
