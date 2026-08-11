import { expect, it } from "vitest";

import config from "../wxt.config";

it("opens from a toolbar action without defining keyboard commands", () => {
  const manifest = (config as {
    manifest?: {
      action?: { default_title?: string };
      commands?: Record<string, unknown>;
    };
  }).manifest;

  expect(manifest?.action).toEqual({ default_title: "Open Tabuffer" });
  expect(manifest?.commands).toBeUndefined();
});
