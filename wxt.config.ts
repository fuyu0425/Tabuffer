import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",
  manifestVersion: 3,
  manifest: {
    name: "Tabuffer",
    description: "A keyboard-first tab manager.",
    permissions: ["tabs"],
    action: {
      default_title: "Open Tabuffer",
    },
  },
});
