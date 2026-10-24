# Focus-LYT

**Space to think. Color to connect.**

[Deutsch](README.de.md) · [Install](#install) · [Focus controls](#focus-controls) · [Development](docs/DEVELOPMENT.md) · [Changelog](CHANGELOG.md)

An Obsidian theme built around the colors and typography of [LYT Mode](https://github.com/nickmilo/LYT-Mode), with a workspace and auto-hide behavior inspired by [Border](https://github.com/Akifyss/obsidian-border). Focus-LYT brings these foundations together with a light palette and optional controls that keep the note at the center of your workspace.

**Obsidian 1.8.10+ · Dark & light · MIT**

[![Focus-LYT in dark mode: cyan text, gold emphasis, lavender italics, pink links and mint tasks in a quiet, framed workspace.](docs/images/dark.png)](docs/images/dark.png)

*Dark mode keeps LYT's expressive colors on charcoal surfaces. The example shows tasks, links, a table and callouts. The tab bar is hidden, with the optional reveal arrow visible above the note.*

<details>
<summary><strong>Light mode — warm paper, lavender panels and deeper accents</strong></summary>

[![The same Focus-LYT demo note in light mode, with warm paper surfaces, pale lavender sidebars and darker text colors.](docs/images/light.png)](docs/images/light.png)

*The light palette preserves the role of each color while adapting it to a brighter workspace.*

</details>

These are real Obsidian screenshots from the included [demo note](examples/vault/Focus-LYT.md), captured with Style Settings and Focus-LYT Controls enabled. Auto-hide is **off by default**. Click an image for its full size.

## What you get

- **A recognizable palette.** Cyan body text, gold emphasis, lavender italics, pink links and mint tags in dark mode, with separate light-mode colors.
- **A quiet workspace.** Framed panes, native Obsidian icons and a clean note title without decorative gradients or symbols.
- **Optional focus tools.** Hide individual desktop controls, reveal them when needed, or pin them in place.
- **Consistent note styling.** Reading view, Live Preview and Source mode, plus tasks, callouts, tables, code and properties.
- **Offline typography.** Embedded DM Sans and DM Mono; your Obsidian font choices still work.
- **Touch-aware behavior.** Auto-hide is suspended on mobile and touch-only interfaces. System reduced-motion preferences are respected.

## Install

Focus-LYT is currently installed manually; it is not yet listed in Obsidian's community theme browser. No build tools are needed to use the theme.

1. On this repository's GitHub page, choose **Code → Download ZIP** and extract it.
2. Open your vault's configuration folder, normally `.obsidian`, and create `themes/Focus-LYT/` inside it.
3. Copy the following items from the repository root into that new folder: `theme.css`, `manifest.json`, `LICENSE`, `THIRD-PARTY-NOTICES.md` and the entire `licenses` folder.
4. In Obsidian, open **Settings → Appearance → Themes** and select **Focus-LYT**. If it is not shown yet, reload Obsidian.

The resulting structure should be:

```text
Your vault/
└── .obsidian/
    └── themes/
        └── Focus-LYT/
            ├── theme.css
            ├── manifest.json
            ├── LICENSE
            ├── THIRD-PARTY-NOTICES.md
            └── licenses/
```

The theme works on its own. These optional additions unlock more controls:

| Component | What it adds | Where to get it |
| --- | --- | --- |
| Style Settings | Palette, layout, writing focus, auto-hide switches and pin commands | Install **Style Settings** in Obsidian's Community plugins; [project](https://github.com/mgmeyers/obsidian-style-settings) |
| Focus-LYT Controls | A visible reveal arrow and a lock button in the note tab bar | Included in [`focus-lyt-controls`](focus-lyt-controls); requires Style Settings |

## Focus controls

Auto-hide is optional. For the arrow and lock shown below:

1. Install and enable **Style Settings**.
2. Copy the repository's entire `focus-lyt-controls` folder into `<vault>/.obsidian/plugins/`. Its `manifest.json`, `main.js` and `styles.css` must sit directly inside that folder.
3. Reload Obsidian and enable **Focus-LYT Controls** under **Settings → Community plugins**.
4. Open **Style Settings → Focus-LYT → Ein- und Ausblenden** and enable **Notiz-Tabs automatisch ausblenden**.

Some setting labels are currently in German. The labels above match the interface exactly.

### 1. Keep the note in view

[![Hidden note tab bar, with a small downward arrow centered at the top of the note.](docs/images/focus-hidden.png)](docs/images/focus-hidden.png)

The arrow marks the reveal area. Hover over it or click it to open the tab bar. Without the companion plugin, the theme's narrow upper-edge reveal area remains available.

### 2. Bring the tools back

[![Revealed note tab bar showing the note tab, close button, new-tab button, unlocked padlock and native window controls.](docs/images/focus-open.png)](docs/images/focus-open.png)

The tab bar appears over the note without moving its text. The arrow disappears while the bar is open. Sidebar tabs stay visible and keep their position.

### 3. Pin it when you need it

[![Pinned note tab bar with a closed padlock; the note sits below the bar with reserved space.](docs/images/focus-locked.png)](docs/images/focus-locked.png)

Click the lock to keep the bar visible. Pinning restores its place in the layout and pauses **all six** theme auto-hides. Unlocking restores your individual choices. You can also toggle **Leisten anheften** through the Style Settings command in the command palette.

For quick keyboard access, assign a shortcut such as **Ctrl+Alt+P** under **Settings → Hotkeys**. This is a suggestion, not a preconfigured shortcut. The arrow and lock also support keyboard focus, Enter and Space.

On phones and tablets, the companion adds no controls and the native touch navigation remains visible.

## Make it yours

With Style Settings enabled, open its **Focus-LYT** section:

| Area | Options |
| --- | --- |
| Colors | Separate light/dark backgrounds, body text, bold, italic, link and tag colors |
| Layout | Pane spacing and corners, or a flatter workspace |
| Writing focus | Highlight the current line or dim inactive prose while preserving syntax colors |
| Auto-hide | Note tabs, status bar, ribbon, sidebar toolbar/search, note header and vault profile |
| Phone and tablet | Optional tablet panels and full-width phone sidebars |
| Motion | Writing-focus transitions and a reduced-motion switch |

Each auto-hide starts disabled and can be toggled separately. **Leisten anheften** provides one shared way to pause them. The [German theme guide](docs/GUIDE.de.md) has more detail.

## Compatibility and feedback

The minimum supported Obsidian version is **1.8.10**. Container checks use real Obsidian **1.8.10** and **1.14.4** on Linux, with **Style Settings 1.0.9**. They cover editing, note views, split panes, focus controls, maximized windows and emulated touch layouts. The [test report](TEST-REPORT.md) records the results and scope.

Native Windows/macOS window controls and physical iOS/Android devices have not been verified. Other community plugins may need their own styling.

For a bug report, [open an issue](https://github.com/BleonHys/LYT-Mode-Updated/issues/new/choose) with your Obsidian, theme and operating-system versions, color mode, relevant plugins/settings and steps to reproduce it. A screenshot from a sample note is especially useful.

## Development

Source modules, build instructions, container tests, packaging and reproducible screenshot capture are documented in [Development](docs/DEVELOPMENT.md). The [example vault](examples/README.md) is available for trying both palettes. See [Contributing](CONTRIBUTING.md) for changes and [Release and submission](docs/RELEASING.md) for publishing.

## Credits and license

Focus-LYT is an independent project built on two generous open-source foundations:

- **[LYT Mode](https://github.com/nickmilo/LYT-Mode)** by **Nick Milo**, with design contributions from **Cecilia May**: the original palette, typography and bundled font assets form the visual foundation.
- **[Border](https://github.com/Akifyss/obsidian-border)** by **Akifyss**: the pane layout and automatic reveal behavior informed the workspace design.

Thank you to both projects. Focus-LYT is not an official release of either project.

The theme and companion are licensed under **MIT**. DM Sans and DM Mono retain their **SIL Open Font License 1.1** licenses. See the [theme license](LICENSE), [companion license](focus-lyt-controls/LICENSE) and [third-party notices](THIRD-PARTY-NOTICES.md).
