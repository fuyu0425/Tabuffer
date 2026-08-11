import { expect, it } from "vitest";

import config from "../wxt.config";

it("suggests platform-specific keyboard shortcuts for opening Tabuffer", () => {
  const manifest = (config as {
    manifest?: {
      commands?: Record<
        string,
        {
          suggested_key?: {
            default?: string;
            linux?: string;
            mac?: string;
            windows?: string;
          };
        }
      >;
    };
  }).manifest;

  expect(manifest?.commands?.["open-tabuffer"]?.suggested_key).toEqual({
    default: "Ctrl+Shift+Period",
    linux: "Ctrl+Shift+Period",
    mac: "Command+Shift+Period",
    windows: "Ctrl+Shift+Period",
  });
});
