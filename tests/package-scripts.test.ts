import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("browser packaging scripts", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts: Record<string, string>;
  };

  it("provides explicit browser build commands", () => {
    expect(packageJson.scripts["build:chrome"]).toBe("wxt build --browser chrome");
    expect(packageJson.scripts["build:firefox"]).toBe("wxt build --browser firefox");
  });

  it("packages Chrome and creates a Firefox XPI", () => {
    expect(packageJson.scripts["package:chrome"]).toBe("wxt zip --browser chrome");
    expect(packageJson.scripts["package:firefox"]).toBe(
      "wxt zip --browser firefox && node scripts/create-firefox-xpi.mjs",
    );
    expect(packageJson.scripts.package).toBe(
      "npm run package:chrome && npm run package:firefox",
    );
  });
});
