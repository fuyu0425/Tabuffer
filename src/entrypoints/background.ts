import { defineBackground } from "wxt/sandbox";
import { browser } from "wxt/browser";

import { webExtensionAdapter } from "../browser/webextension";

export default defineBackground(() => {
  let opening: Promise<void> | undefined;

  browser.action.onClicked.addListener(() => {
    if (opening) return;
    opening = webExtensionAdapter.openOrFocusManager()
      .catch(console.error)
      .finally(() => { opening = undefined; });
  });
});
