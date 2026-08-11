import { expect, it } from "vitest";

import config from "../wxt.config";

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
