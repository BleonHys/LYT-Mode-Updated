#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"
npm run build
mkdir -p output/playwright
docker build --file docker/Dockerfile --tag lyt-prism-tests:1.0 .
docker run --rm --init --network none --shm-size=1g \
  --user "$(id -u):$(id -g)" \
  --mount "type=bind,src=$project_root,dst=/workspace,readonly" \
  --mount "type=bind,src=$project_root/examples/vault,dst=/workspace/examples/vault,readonly" \
  --mount "type=bind,src=$project_root/focus-lyt-controls,dst=/workspace/focus-lyt-controls,readonly" \
  --mount "type=bind,src=$project_root/tests,dst=/runner/tests,readonly" \
  --mount "type=bind,src=$project_root/playwright.config.mjs,dst=/runner/playwright.config.mjs,readonly" \
  --mount "type=bind,src=$project_root/output/playwright,dst=/output" \
  lyt-prism-tests:1.0 "$@"
