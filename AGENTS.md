# AGENTS.md

This file applies to the entire repository. It is written for coding agents and automated contributors working on Tabuffer.

## Product intent

Tabuffer is a keyboard-first, browser-neutral tab manager inspired by Emacs `ibuffer`. Preserve these qualities:

- Keyboard operation is the primary interaction model; mouse support is supplementary.
- Firefox and Chromium builds should behave consistently.
- Tab data stays local. Do not add telemetry, analytics, remote favicon services, or other network dependencies.
- Keep permissions minimal. The extension currently needs only `tabs`; adding permissions requires an explicit product reason and documentation update.
- Ordinary marks protect pinned tabs. The confirmed `d`/`x` deletion path may close pinned tabs; Tabuffer's own manager tab is always protected.
- Search layers, cursor state, collapsed groups, and marks are page-local. Only view, sort/direction, and theme preferences persist.

## Repository map

- `src/core/`: pure tab normalization, filtering, sorting, state, and view projection logic. Keep this independent of browser and DOM APIs.
- `src/input/`: keyboard state machine. Key interpretation belongs here, not in the controller.
- `src/browser/`: the `BrowserAdapter` boundary and WebExtensions implementation. Browser API calls belong here.
- `src/ui/`: controller orchestration, DOM rendering, and status text.
- `src/entrypoints/`: WXT background and manager-page entrypoints.
- `src/public/`: shipped static assets.
- `tests/`: integration-style renderer and WXT configuration tests. Colocated `*.test.ts` files cover focused modules.
- `dist/` and `.wxt/`: generated artifacts; never edit or commit them.

## Architecture rules

1. Normalize browser tab objects once in `src/core/tab.ts`; downstream code consumes `TabInfo`.
2. Keep browser operations behind `BrowserAdapter` so controller tests do not depend on WebExtensions globals.
3. Derive visible rows in `src/core/views.ts`; the renderer should display a supplied model rather than make product decisions.
4. Keep keyboard handling deterministic: `handleKey` receives input state, a key, and the current view, then returns new state plus an optional command.
5. Treat tab events as refresh signals. Reconcile live tabs before destructive actions so stale IDs and newly protected tabs are handled safely.
6. Prefer the platform and small pure functions over dependencies or speculative abstractions.

## Behavioral invariants

- `d` flags the selected tab, visible Domain group, or visible Tree subtree and advances once; `x` requests confirmation; only `y` executes those flags.
- Deletion flags may contain pinned tabs. Ordinary `m`, `M`, and `D` marks must continue excluding pinned tabs.
- Ordinary marks (`m`, `*`, and `M`) are separate from deletion flags; `D` closes ordinary marks.
- `U` clears both kinds of marks.
- `/` begins a search, `Enter` pushes a non-empty layer, and `\` pops one layer. An empty stack means no filter.
- `1`, `2`, and `3` select flat, domain, and tree views. `s` opens which-key; `st`, `so`, and `sd` sort every view.
- `sr` toggles the current sort direction without changing its criterion; the direction applies to every sibling sequence.
- Domain sorting orders groups and children. Tree sorting recursively orders siblings without changing opener parents.
- `T` cycles themes in the exact order Auto, Light, Dark; Auto follows `prefers-color-scheme`.
- `j`/`k` and arrow keys move selection without scrolling the page independently.
- In Domain view, `J`/`K` and Shift+Down/Shift+Up select the next/previous Domain header.
- Page Down/Page Up move the cursor by one visible page and keep it visible.
- `z` recenters the cursor; confirmed deletion recenters after reconciling live tabs.
- Domain groups choose the first available browser-provided favicon in browser order. Missing favicons render no placeholder.
- Tabuffer must never close itself as part of a bulk operation.

When a behavior or key changes, update the built-in help, status text where relevant, tests, and README in the same change.

## Development workflow

Install exactly from the lockfile:

```sh
npm ci
```

For behavior changes and bug fixes, use a red-green-refactor cycle:

1. Add the smallest test that demonstrates the desired behavior or reproduces the bug.
2. Run it and confirm it fails for the intended reason.
3. Implement the minimum production change.
4. Run the focused test, then the full verification suite.

Required verification:

```sh
npm test
npm run typecheck
npm run build -- --browser chrome
npm run build -- --browser firefox
```

Run the two builds sequentially because WXT uses the shared `dist` directory. Before reporting completion, also run `git diff --check` and inspect `git status --short`.

## Code conventions

- Use TypeScript with the existing strict configuration and ESM imports.
- Follow existing formatting: two spaces, double quotes, semicolons, and trailing commas in multiline constructs.
- Prefer explicit domain types and pure transformations over casts or mutation.
- Preserve accessibility: rows need roles and selected state; decorative favicon images use empty alt text; all actions need keyboard access.
- Keep error handling narrow. Optional preferences may fail silently, but browser operations should reject so callers can surface failures during development.
- Avoid unrelated refactors. Keep each change small enough to review from its tests and diff.

## Manifest and release rules

- Edit manifest settings in `wxt.config.ts`; WXT generates `manifest.json`.
- Do not hardcode generated `moz-extension://` or `chrome-extension://` URLs.
- Do not claim store availability or add store links until listings exist.
- Before submitting Manifest V3 to Firefox Add-ons, configure a stable `browser_specific_settings.gecko.id` in `wxt.config.ts`.
- Store packages are generated with `npx wxt zip --browser chrome` and `npx wxt zip --browser firefox`; inspect the archives before upload.

## Git safety

- Work in the current checkout unless the user explicitly requests a separate worktree.
- Preserve unrelated user changes in a dirty working tree.
- Never use destructive reset/checkout commands to discard work.
- Never use `git add -f`; ignored files are ignored intentionally.
- Keep `docs/superpowers/` and other local planning artifacts uncommitted.
- Do not commit, push, publish, or create a pull request unless the user asks.
