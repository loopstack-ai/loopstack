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
RUN npx --yes create-loopstack-app@latest app --template=app-template --tag=main
RUN npm install
RUN npm run build

FROM node:20-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends postgresql redis-server git && \
    rm -rf /var/lib/apt/lists/*

RUN npm i -g pm2

WORKDIR /app

# Copy monorepo workspace
COPY --from=build /workspace-setup /workspace

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
