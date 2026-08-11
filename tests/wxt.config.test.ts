import { expect, it } from "vitest";

import config from "../wxt.config";

it("suggests an unreserved keyboard shortcut for opening Tabuffer", () => {
  const manifest = (config as {
    manifest?: { commands?: Record<string, { suggested_key?: { default?: string } }> };
  }).manifest;

  expect(manifest?.commands?.["open-tabuffer"]?.suggested_key?.default).toBe("Alt+Shift+T");
});
