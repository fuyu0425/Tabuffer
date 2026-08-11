<p align="center">
  <img src="src/public/icons/icon-128.png" width="96" height="96" alt="Tabuffer icon">
</p>

<h1 align="center">Tabuffer</h1>

<p align="center">
  A keyboard-first tab manager inspired by Emacs <code>ibuffer</code>.
</p>

Tabuffer turns your open tabs into a fast, searchable buffer list. Navigate without leaving the keyboard, switch between flat, domain, and opener-tree views, mark several tabs, and close them as one deliberate operation.

> [!NOTE]
> Tabuffer is preparing for Firefox Add-ons and the Chrome Web Store. Until those listings are available, install it from source using the instructions below.

## Highlights

- Three sortable views: a flat list, collapsible domain groups, and opener trees.
- Familiar `ibuffer`-style deletion: press `d` to flag tabs, then `x` and `y` to confirm.
- Cumulative search: each accepted `/` search narrows the current result; `\` removes the newest layer.
- Keyboard navigation with `j`/`k`, arrow keys, `gg`, `G`, `h`, and `l`.
- Browser-provided favicons, with no third-party favicon service.
- Auto, Light, and Dark themes with a warm, low-glare light palette.
- Deliberate pinned-tab deletion through the confirmed `d`/`x` workflow; ordinary bulk marks remain protected.
- Live updates when tabs open, close, move, or change.
- Remembers only the selected view, sort mode and direction, and theme between sessions. Search layers and marks remain page-local.

## Keyboard reference

Press `?` inside Tabuffer for the built-in reference.

### Views and sorting

| Key | Action |
| --- | --- |
| `1` | Flat list |
| `2` | Group by domain |
| `3` | Opener tree |
| `s` | Open the sort which-key panel |
| `st` | Sort by newest access |
| `so` | Sort by browser tab order |
| `sd` | Sort by domain |
| `sr` | Reverse the current sort direction |
| `T` | Cycle Auto → Light → Dark appearance |

The selected sort and direction apply to every view. Domain mode orders both groups and their tabs. Tree mode recursively sorts siblings—including top-level roots—without moving a tab away from its opener parent. Reverse mode means oldest-first, reverse browser order, or domain Z→A.

Auto is the default theme and follows the browser's current system color scheme.

### Navigation

| Key | Action |
| --- | --- |
| `j` / `↓` | Select the next row |
| `k` / `↑` | Select the previous row |
| `gg` / `G` | Select the first / last row |
| `h` / `l` | Collapse / expand a domain or tree branch |
| `Enter` | Activate the selected tab |
| `r` | Refresh |
| `q` | Close Tabuffer |

### Searching

| Key | Action |
| --- | --- |
| `/` | Start a search |
| `Enter` | Accept it and push it onto the search stack |
| `Escape` | Cancel the search being entered |
| `\` | Pop the newest accepted search; an empty stack shows all tabs |

Search matches tab titles, URLs, and domains. Accepted searches are cumulative and last only as long as the Tabuffer page.

### Marks and deletion

| Key | Action |
| --- | --- |
| `d` | Flag the selected tab, Domain group, or Tree subtree for deletion, then move down |
| `x` | Ask to execute deletion flags; confirm with `y` or cancel with `n` |
| `m` / `u` | Add / remove an ordinary mark and move down |
| `*` | Toggle an ordinary mark without moving |
| `M` | Mark the selected domain or opener subtree |
| `D` | Close all ordinarily marked tabs |
| `U` | Clear every mark and deletion flag |

Deletion flags may include pinned tabs, so `d`, `x`, and `y` can deliberately close them. Ordinary `m`/`M` marks still exclude pinned tabs, and the Tabuffer manager tab is always protected.

## Install from source

You need a recent Node.js LTS release and npm.

Clone or download this repository, then run:

```sh
cd Tabuffer
npm ci
```

### Firefox

```sh
npm run build -- --browser firefox
```

1. Open `about:debugging` in Firefox.
2. Select **This Firefox**.
3. Select **Load Temporary Add-on**.
4. Choose `dist/firefox-mv3/manifest.json`.

Firefox removes temporary add-ons when it restarts. A persistent end-user installation requires a package signed by Mozilla; the planned Firefox Add-ons release will provide that.

### Chrome and Chromium browsers

```sh
npm run build -- --browser chrome
```

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose `dist/chrome-mv3`.

Click Tabuffer's toolbar icon to open or focus the manager.

## Privacy and permissions

Tabuffer requests the `tabs` permission so it can list, activate, and close tabs and read their titles, URLs, and browser-provided favicons.

It does not request host permissions, inject content scripts, read page contents, use analytics, or send tab data to an external service. All tab management happens locally in the browser.

## Development

```sh
npm test
npm run typecheck
npm run build -- --browser chrome
npm run build -- --browser firefox
```

Run browser builds sequentially: WXT writes generated files beneath the shared `dist` directory.

To create store submission archives with the installed WXT CLI:

```sh
npx wxt zip --browser chrome
npx wxt zip --browser firefox
```

The Firefox command also creates a source archive for Mozilla's review. Before the first Firefox Add-ons submission, the manifest must receive a stable Gecko extension ID.

### Project layout

```text
src/
├── browser/       WebExtensions adapter
├── core/          tab model, filtering, sorting, and view projections
├── entrypoints/   background action and Tabuffer manager page
├── input/         keyboard state machine
├── public/        extension icons
└── ui/            controller, renderer, and status line
tests/             renderer and configuration integration tests
```

The core modules remain browser-independent. Browser API calls belong in `src/browser`, while DOM behavior belongs in `src/ui`.

## Contributing

Issues and focused pull requests are welcome. Please:

1. Keep the interface keyboard-first and browser-neutral.
2. Add a regression test before changing behavior.
3. Avoid new permissions, network services, and dependencies unless the benefit is explicit.
4. Run the complete verification commands above before submitting.

See [AGENTS.md](AGENTS.md) for the repository's detailed engineering rules.

## License

Tabuffer is available under the [MIT License](LICENSE).

## References

- [Temporary extension installation in Firefox](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/)
- [Loading an unpacked extension in Chrome](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)
- [Publishing extensions with WXT](https://wxt.dev/guide/essentials/publishing)
