import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",
  manifestVersion: 3,
  manifest: {
    name: "Tabuffer",
    description: "A keyboard-first tab manager.",
    permissions: ["tabs"],
    commands: {
      "open-tabuffer": {
        suggested_key: { default: "Ctrl+Shift+I" },
        description: "Open Tabuffer",
      },
    },
  },
});
