FROM mcr.microsoft.com/playwright:v1.60.0-noble@sha256:9bd26ad900bb5e0f4dee75839e957a89ae89c2b7ab1e76050e559790e946b948
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends openbox dbus-x11 xdotool libasound2t64 libgtk-3-0 libnss3 libgbm1 && rm -rf /var/lib/apt/lists/*
COPY docker/dependencies.json docker/install-dependencies.mjs /setup/
RUN node /setup/install-dependencies.mjs
WORKDIR /runner
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY docker/entrypoint.sh /usr/local/bin/lyt-prism-tests
ENV THEME_ROOT=/workspace ARTIFACT_ROOT=/output OBSIDIAN_ROOT=/opt/obsidian STYLE_SETTINGS_ROOT=/opt/style-settings
ENTRYPOINT ["bash", "/usr/local/bin/lyt-prism-tests"]
