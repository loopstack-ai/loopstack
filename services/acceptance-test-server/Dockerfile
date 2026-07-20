FROM node:20-slim AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Scaffold monorepo workspace
WORKDIR /workspace-setup
COPY workspace-root/ ./
RUN mkdir -p packages
RUN npm install -g @nestjs/cli
RUN nest new app --skip-git --skip-install --package-manager npm
WORKDIR /workspace-setup/app

# Optional local @loopstack packages — populate via scripts/pack-local-packages.sh so the app
# under test runs the working tree instead of the published registry versions. The tarballs are
# kept at a stable path because the app's package.json references them via file: specifiers
# (later `npm install` runs inside the container must still resolve them).
COPY local-packages/ /opt/loopstack-local/
RUN if ls /opt/loopstack-local/*.tgz >/dev/null 2>&1; then \
      npm install /opt/loopstack-local/*.tgz; \
    else \
      npm install @loopstack/loopstack-module; \
    fi

# Apply fixtures over scaffolded files
COPY fixtures/backend/ /tmp/fixtures/backend/
RUN cp /tmp/fixtures/backend/nest-cli.json ./nest-cli.json && \
    cp /tmp/fixtures/backend/src/app.module.ts ./src/app.module.ts && \
    cp /tmp/fixtures/backend/src/main.ts ./src/main.ts && \
    rm -rf /tmp/fixtures

# Set up the testing template
WORKDIR /workspace-setup
COPY testing-template/ ./tests/

WORKDIR /workspace-setup
RUN npm install
RUN npm run build

FROM node:20-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends postgresql redis-server git curl && \
    rm -rf /var/lib/apt/lists/*

RUN npm i -g pm2

# Install Claude Code CLI
RUN npm i -g @anthropic-ai/claude-code

WORKDIR /app

# Copy monorepo workspace (and the local package tarballs its file: specifiers may point at)
COPY --from=build /workspace-setup /workspace
COPY --from=build /opt/loopstack-local/ /opt/loopstack-local/

# Initialize git repo in workspace so version control is available from the start
RUN cd /workspace && \
    git config --global user.name "loopstack" && \
    git config --global user.email "noreply@loopstack.ai" && \
    git config --global init.defaultBranch main && \
    git init && git add . && git commit -m "Initial scaffold"

# Create compressed backup of the initial workspace for reset (includes .git)
RUN tar czf /opt/workspace-backup.tar.gz -C / workspace

# Install agent production dependencies
COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

# Copy agent build output
COPY --from=build /app/dist ./dist

# Copy PM2 ecosystem config
COPY ecosystem.config.cjs ./

COPY start.sh ./
RUN chmod +x start.sh

ENV AGENT_PORT=3001
ENV WORKSPACE_ROOT=/workspace

EXPOSE 3000 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["./start.sh"]
