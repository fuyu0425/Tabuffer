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

  it("does not derive a domain from host-bearing non-web URLs", () => {
    expect(
      normalizeTab({
        id: 9,
        windowId: 2,
        index: 5,
        url: "moz-extension://extension-id/options.html",
        title: "Options",
        lastAccessed: 102,
      }),
    ).toMatchObject({
      url: "moz-extension://extension-id/options.html",
      domain: "",
    });
  });
});
