# Focus-LYT 1.0.0 — validation report

[Project overview](README.md) · [Development](docs/DEVELOPMENT.md)

**24 October 2026:** the complete container run passed **43 tests**, with no failures, skips or retries, in **475.1 seconds**. Static validation, documentation checks and deterministic ZIP packaging also passed.

The tested companion version is **Focus-LYT Controls 1.0.0**.

## Environment and coverage

| Environment | Full-run result |
| --- | --- |
| Obsidian 1.14.4, Linux/X11 | 20 passed |
| Obsidian 1.8.10, Linux/X11 | 19 passed |
| Phone/tablet viewports with Obsidian's mobile DOM/CSS states | 4 touch-emulation scenarios passed |

The test environment uses **Style Settings 1.0.9**. Containers run without networking, with isolated temporary vaults and profiles. Source files and fixtures are mounted read-only. The base image, npm packages, Obsidian and Style Settings are pinned; Ubuntu system packages are not individually pinned.

The suite covers:

- Reading view, Live Preview, Source mode, editing, search, split panes and separate windows.
- Properties, tables, code, tasks, callouts, Canvas and Bases in 1.14.4.
- Custom font choices, persisted Style Settings, native window controls and a test-assigned pin shortcut.
- Rendered contrast samples of at least 4.5:1; this is a sampled check, not an exhaustive accessibility audit.
- Emulated touch navigation, larger fonts, sidebars and pinned/unpinned states.

## Focus controls

Four companion scenarios exercise both app versions and color modes in ordinary and natively maximized windows. They check the 48 × 24 px reveal target, centering, opening without note movement, unobstructed lock buttons, pinning by mouse and assigned shortcut, persisted state, split panes and repositioning after sidebar changes.

They also verify cleanup on mobile DOM states, theme changes and plugin disable/enable, including the absence of duplicate controls. The accessibility scenario checks visible keyboard focus, Enter, Space and reduced motion.

Existing hover scenarios cover sidebar navigation, brief edge crossings, transitions between tabs and window buttons, open tab menus, split views and reversal during a fade. Pinning reserves layout space; temporary revealing does not move the note. The native drag region is limited to the bottom edge of the open bar's blank area because native drag regions intercept hover input.

The public README images show the final [hidden](docs/images/focus-hidden.png), [open](docs/images/focus-open.png) and [pinned](docs/images/focus-locked.png) states. They were captured separately in a public demo vault; they are presentation images, not the functional test logs.

## Packaging

The archive contains the theme and the separate optional companion. The ZIP integrity and required install paths were checked, and the generated theme was compared with the source build. The packaged guide rewrites its relative license links for the install folder. The complete MIT and font license notices are also embedded in the generated CSS, including for installations that fetch only the two theme assets. Repeated packaging produces identical bytes.

No default pin shortcut is shipped. The test environment explicitly assigns one; users can assign their own in Obsidian's Hotkeys settings.

## Reproduce and inspect

```sh
npm run check
npm run test:container
npm run test:container -- --grep 'controls accessibility'
npm run package
```

Reports are generated locally and excluded from Git. The recorded full-run artifacts are preserved under `output/playwright/full-1.0.0/` (`results.json`, `results/` and `report/index.html`). A new run may replace the main `output/playwright/` paths. GitHub CI also uploads its own report as a workflow artifact. See the [development guide](docs/DEVELOPMENT.md) for setup.

## Limits

Maximized windows were tested; true operating-system fullscreen was not. Native Windows/macOS window controls and physical Android/iOS devices were not tested. Mobile results are emulation only.

Under X11, native window dragging could not be demonstrated in Obsidian 1.14.4 even without the theme. The comparison and retained drag area are recorded in the local test artifacts. Native dragging was checked with and without the theme in 1.8.10.

Community-plugin compatibility beyond the scenarios above is not guaranteed.

## Source fingerprints

| File | SHA-256 |
| --- | --- |
| `theme.css` | `84976b72c20032561b22ab673b5d4cc78875948e1f6285480d24784a539c0fd1` |
| `focus-lyt-controls/main.js` | `902e391ddf4b4254a89bc0c7b232ee1ee3e3733b40ee32c87636acf8ba22f851` |
| `focus-lyt-controls/styles.css` | `15e8aa71e6200001380118f49350f65c1fdedf88ae60361c93b33b881a401716` |
