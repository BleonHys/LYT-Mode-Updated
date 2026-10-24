#!/usr/bin/env bash
set -euo pipefail
export XDG_RUNTIME_DIR=/tmp/lyt-prism-runtime
mkdir -p "$XDG_RUNTIME_DIR"
chmod 700 "$XDG_RUNTIME_DIR"
exec dbus-run-session -- xvfb-run -a -s '-screen 0 1600x1200x24' bash -c 'openbox >/tmp/lyt-prism-openbox.log 2>&1 & exec npx playwright test "$@"' bash "$@"
