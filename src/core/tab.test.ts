import { describe, expect, it } from "vitest";

import { normalizeTab } from "./tab";

describe("normalizeTab", () => {
  it("normalizes URLs and derives a lowercase domain", () => {
    expect(
      normalizeTab({
        id: 7,
        windowId: 2,
        index: 3,
        url: "HTTPS://Example.COM:443/path?x=1#top",
        title: "Example",
        lastAccessed: 100,
      }),
    ).toMatchObject({
      id: 7,
      url: "https://example.com/path?x=1#top",
      domain: "example.com",
    });
  });

  it("keeps non-web URLs available with an empty domain", () => {
    expect(
      normalizeTab({
        id: 8,
        windowId: 2,
        index: 4,
        url: "about:preferences",
        title: "Settings",
        lastAccessed: 101,
      }),
    ).toMatchObject({ url: "about:preferences", domain: "" });
  });
});
