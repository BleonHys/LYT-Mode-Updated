# Release and Obsidian submission

[Project overview](../README.md)

The repository contains the installable theme, documentation, screenshots, examples and optional companion. `theme.css` is the theme source and distribution file.

## Publish a release

1. Check the theme in Obsidian and update the changelog and screenshots for any visible changes.
2. Set the new `x.y.z` version in `manifest.json` and add its minimum Obsidian version to `versions.json`.
3. Commit the files and create a GitHub release with a tag matching the manifest version exactly, without a `v` prefix.
4. Attach **`manifest.json`** and **`theme.css`** as individual release assets. These are the files Obsidian installs.

An optional installation ZIP can contain a `Focus-LYT` folder with the theme files, license notices and `licenses/`. Include `focus-lyt-controls/` and example notes as separate folders. The existing [1.0.0 release](https://github.com/BleonHys/LYT-Mode-Updated/releases/tag/1.0.0) already provides this layout.

The companion is installed separately and is not included in the theme-directory installation. Complete MIT and font license notices are embedded in `theme.css` as well as provided in separate files.

## Submit to the community directory

Follow the [official submission guide](https://docs.obsidian.md/themes/app-themes/submit-theme). After publishing a release:

1. Sign in to [Obsidian Community](https://community.obsidian.md) with your Obsidian account and link your GitHub account.
2. Choose **Themes → New theme** and use the following details.

| Field | Value |
| --- | --- |
| GitHub repository | `https://github.com/BleonHys/LYT-Mode-Updated` |
| Name in manifest | `Focus-LYT` |
| Default branch | `main` |
| Screenshot path | `docs/images/store.png` |
| Supported modes | Dark and Light |
| Current version | `1.0.0` |
| Minimum Obsidian version | `1.8.10` |

Review the directory's developer policies and maintenance commitment, then submit. Resolve review feedback in a new version and release.

The repository provides the required theme files, README, license, version map and screenshots. The directory preview is a real 1440 × 810 demo-vault capture. Acceptance into the directory is a separate step from publishing on GitHub.
