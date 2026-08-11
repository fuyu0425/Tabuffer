import { defineConfig } from "wxt";

const icons = {
  16: "icons/icon-16.png",
  32: "icons/icon-32.png",
  48: "icons/icon-48.png",
  128: "icons/icon-128.png",
  512: "icons/icon-512.png",
};

export default defineConfig({
  srcDir: "src",
  outDir: "dist",
  manifestVersion: 3,
  zip: {
    excludeSources: ["docs/superpowers/**"],
  },
  manifest: ({ browser }) => ({
    name: "Tabuffer",
    description: "A keyboard-first tab manager.",
    ...(browser === "firefox" ? {
      browser_specific_settings: {
        gecko: {
          id: "tabuffer@fuyu0425.github.io",
        },
      },
    } : {}),
    permissions: ["tabs"],
    icons,
    action: {
      default_title: "Open Tabuffer",
      default_icon: icons,
    },
  }),
});
