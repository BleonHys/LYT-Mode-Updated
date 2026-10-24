#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"
npm run build
mkdir -p output/playwright docs/images
docker build --file docker/Dockerfile --tag lyt-prism-tests:1.0 .
docker run --rm --init --network none --shm-size=1g \
  --user "$(id -u):$(id -g)" \
  --mount "type=bind,src=$project_root,dst=/workspace,readonly" \
  --mount "type=bind,src=$project_root/focus-lyt-controls,dst=/workspace/focus-lyt-controls,readonly" \
  --mount "type=bind,src=$project_root/examples,dst=/workspace/examples,readonly" \
  --mount "type=bind,src=$project_root/tests,dst=/runner/tests,readonly" \
  --mount "type=bind,src=$project_root/scripts,dst=/runner/scripts,readonly" \
  --mount "type=bind,src=$project_root/output/playwright,dst=/output" \
  --entrypoint bash lyt-prism-tests:1.0 -c \
  'export XDG_RUNTIME_DIR=/tmp/lyt-prism-runtime; mkdir -p "$XDG_RUNTIME_DIR"; chmod 700 "$XDG_RUNTIME_DIR"; exec dbus-run-session -- xvfb-run -a -s "-screen 0 1600x1200x24" bash -c "openbox >/tmp/openbox.log 2>&1 & exec node /runner/scripts/capture-readme.mjs"'
for asset in dark.png light.png focus-hidden.png focus-open.png focus-locked.png store.png capture.json; do
  cp "output/playwright/readme/$asset" "docs/images/$asset"
done
