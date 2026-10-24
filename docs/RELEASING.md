# Release and Obsidian submission

[Project overview](../README.md) · [Development](DEVELOPMENT.md)

Focus-LYT is an independent theme. Its GitHub repository is [BleonHys/LYT-Mode-Updated](https://github.com/BleonHys/LYT-Mode-Updated); the installed theme name is **Focus-LYT**. Keep the theme name stable when submitting and releasing it.

## Prepare a release

1. Update `manifest.json`, `package.json` and the root package entries in `package-lock.json` to the same `x.y.z` version. Add that version and its minimum Obsidian version to `versions.json`.
2. Update the changelog, theme guide and `docs/RELEASE-NOTES.md`. Refresh screenshots if the appearance changes.
3. Run `npm run build`, `npm run check`, `npm run check:docs`, `npm run test:container` and `npm run package`. Commit the source and generated `theme.css` together.
4. Push the commit to `main`. Review the release notes and assets. Once validation passes, create and push a tag that matches the manifest **exactly**, such as `1.0.0`, without a `v` prefix.
5. The **Publish theme release** workflow checks the tag, rebuilds the package and runs the full functional suite. After the checks pass, it publishes a GitHub release with `manifest.json`, `theme.css` and the ZIP attached.

Only the release job has `contents: write`; ordinary CI has read-only permissions. Workflow action versions are pinned to commits. The release workflow requires GitHub Actions to be enabled for the repository. Pushing a matching version tag is the publishing step.

If the initial tag does not trigger a run, open **Actions → Publish theme release → Run workflow**, choose `main` and enter the existing version tag, such as `1.0.0`. This checks out that exact tag and applies the same checks before publishing. It does not move or recreate the tag.

Theme users receive `theme.css` and `manifest.json`. Complete MIT and font license notices are included in the generated CSS because the theme installer does not fetch the repository's separate license files. The ZIP also carries those files, the example notes and the optional companion. The companion is installed separately and is not part of the theme-directory installation.

## Submit to the community directory

Follow the current [official submission guide](https://docs.obsidian.md/themes/app-themes/submit-theme). As checked on 24 October 2026, submission is through **community.obsidian.md**, rather than a new pull request to the old theme registry.

After publishing the release:

1. Sign in to [Obsidian Community](https://community.obsidian.md) with your Obsidian account and link your GitHub account.
2. Choose **Themes → New theme** and use:

| Field | Value |
| --- | --- |
| GitHub repository | `https://github.com/BleonHys/LYT-Mode-Updated` |
| Name in manifest | `Focus-LYT` |
| Default branch | `main` |
| Screenshot path | `docs/images/store.png` |
| Supported modes | Dark and Light |
| Current version | `1.0.0` |
| Minimum Obsidian version | `1.8.10` |

3. Review the directory's developer policies and maintenance commitment yourself, then submit.
4. Resolve any automated review feedback in a new version and release.

The repository contains the root README, license, manifest, generated theme, version map and screenshots. The screenshot path above points to a real 1440 × 810 demo-vault capture in the directory's recommended 16:9 aspect ratio. The directory recommends 512 × 288 pixels; the larger source keeps text clearer when viewed at full size.

Submission and acceptance are separate from publishing the repository. The theme is not listed until the directory approves it. See the [manifest reference](https://docs.obsidian.md/Reference/Manifest) and [official sample theme](https://github.com/obsidianmd/obsidian-sample-theme) when changing release metadata.
