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
        suggested_key: {
          default: "Ctrl+Shift+Period",
          linux: "Ctrl+Shift+Period",
          mac: "Command+Shift+Period",
          windows: "Ctrl+Shift+Period",
        },
        description: "Open Tabuffer",
      },
    },
  },
});
