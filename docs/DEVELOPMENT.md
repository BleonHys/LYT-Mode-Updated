# Developing Focus-LYT

[Project overview](../README.md) · [Deutsch](../README.de.md) · [Test report](../TEST-REPORT.md)

## Requirements

Use Node.js 20 or newer and Python 3 for local builds and packaging. The functional test and screenshot workflows also require Docker with Linux/x86_64 support. The Docker image build downloads its dependencies; the actual test and capture containers run without networking.

## Build and package

From the repository root:

```sh
npm ci
npm run build
npm run check
npm run check:docs
npm run package
```

`build` joins `src/*.css` in alphabetical order into `theme.css`. Edit the source modules and commit the generated CSS with them. The generated file is included so theme users do not need Node.js.

`check` validates CSS, Style Settings YAML, setting IDs and usage, opt-in auto-hide behavior, embedded fonts, font sizes, manifests, licenses and the reproducibility of the generated theme.

`package` builds and checks the theme, then produces `dist/focus-lyt-1.0.0.zip`. The archive contains an installable `Focus-LYT` theme folder, the separate `focus-lyt-controls` companion, license notices and example notes. Packaging does not publish a GitHub release or submit the theme to Obsidian's community directory.

## Repository layout

| Path | Purpose |
| --- | --- |
| [`src/`](../src) | Theme CSS modules and Style Settings definitions |
| [`theme.css`](../theme.css) | Generated, installable theme |
| [`focus-lyt-controls/`](../focus-lyt-controls) | Optional plain-JavaScript companion; no compilation step |
| [`examples/vault/`](../examples/vault) | Public demonstration notes |
| [`tests/`](../tests) | Functional scenarios and native-input helpers |
| [`docker/`](../docker) | Isolated Obsidian/Electron environment and dependency pins |
| [`docs/images/`](images) | Published README screenshots and capture metadata |

The `lyt-prism` CSS and Style Settings IDs remain stable for existing installations. The public theme name is **Focus-LYT**.

## Functional tests

```sh
npm run test:container
```

This builds the test image and runs the suite against the real Obsidian desktop app in versions **1.8.10** and **1.14.4**, with **Style Settings 1.0.9**. Each test environment uses an isolated temporary vault and profile. Source files and fixtures are mounted read-only; reports are written to `output/playwright/`.

For a targeted run, pass a Playwright filter through the wrapper:

```sh
npm run test:container -- --grep 'controls accessibility'
```

`npm test` is the direct runner for an already prepared environment. Normal local development should use the container wrapper.

The HTML report, JSON results, screenshots and failure traces are local artifacts under `output/playwright/`, excluded from Git. A later run can replace reports, so preserve a run separately before comparing results. The [test report](../TEST-REPORT.md) records the last full run and its limits. Touch emulation does not establish compatibility with native phone apps.

## README screenshots

```sh
bash scripts/capture-readme.sh
```

The capture script uses the same Docker environment and a disposable **Focus-LYT Demo** vault. It opens the public [`Focus-LYT.md`](../examples/vault/Focus-LYT.md) example in real Obsidian 1.14.4 at 1440 × 1000, with Style Settings and the companion enabled. It captures light and dark previews plus the hidden, open and pinned tab-bar states. A separate 1440 × 810 capture supplies the directory preview. The state crops end below the same heading; the pinned crop includes the bar's reserved layout space.

The script copies the six PNGs and [`capture.json`](images/capture.json) into `docs/images/`. These files belong in Git so GitHub can display the README without local test artifacts. The capture process never opens the user's vault.

Before updating the previews, inspect every image for clipped text, tooltips, stale content and private data. Keep image captions and alternative text accurate. These screenshots demonstrate a configured workspace; auto-hide remains disabled by default.

## Releases and directory submission

See [Release and submission](RELEASING.md) for versioning, releases, the community-directory form and the screenshot path. CI runs checks, packaging and the full container suite for pushes and pull requests.

## Before sharing a change

Run `npm run check` and package the result. Run relevant container scenarios for behavior changes. Keep the public installation instructions consistent with the files actually shipped, and record test results without treating emulation as native-device coverage.

Preserve the [MIT notices](../LICENSE) and [font licenses](../THIRD-PARTY-NOTICES.md) when redistributing the theme.
