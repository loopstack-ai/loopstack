# Agent image: the session server + Claude Code, layered onto the shared infra base.
ARG BASE_IMAGE=loopstack-engineer-base:latest

FROM node:22-slim AS build

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM ${BASE_IMAGE}

# The coding agent itself.
RUN npm i -g @anthropic-ai/claude-code

# GitHub CLI — used by the agent to search existing issues (authenticates via the GITHUB_TOKEN in the session
# env). Installed from GitHub's official apt repo.
RUN apt-get update \
  && apt-get install -y --no-install-recommends gnupg \
  && mkdir -p -m 755 /etc/apt/keyrings \
  && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
     | tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
  && chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
     > /etc/apt/sources.list.d/github-cli.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends gh \
  && rm -rf /var/lib/apt/lists/*

# The Loopstack CLI is the agent's default surface for running and testing workflows (against the app on
# localhost:3000, no login) — the terminal-native alternative to the browser-based Studio.
#
# The image always bakes the latest published CLI. Pulling the `latest` dist-tag metadata first ties this
# layer's build cache to the current version+tarball hash: when a new CLI is published the content changes
# and the install re-runs, but an unchanged `latest` reuses the cache (no --no-cache needed).
ADD https://registry.npmjs.org/@loopstack/cli/latest /tmp/loopstack-cli-latest.json
RUN npm i -g @loopstack/cli

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

# Loopstack MCP exit-point tools (ask_user / create_pr / create_github_issue). All gated per session by env
# flags, so this one image serves interactive, commit, PR, issue, and plain runs alike — no separate variant.
COPY interactive/loopstack-mcp.mjs /opt/loopstack/loopstack-mcp.mjs
COPY interactive/loopstack.mcp.json /etc/loopstack/loopstack.mcp.json

# Boot conditional services (Postgres/Redis), then the session server.
COPY start.sh ./
RUN chmod +x ./start.sh

ENV AGENT_PORT=3001
ENV WORKSPACE_ROOT=/workspace
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["./start.sh"]
