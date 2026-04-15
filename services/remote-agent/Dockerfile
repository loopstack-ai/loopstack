FROM node:20-slim AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Install app-template via create-loopstack-app and pre-build
RUN npx --yes create-loopstack-app@latest custom-app --template=app-template --tag=main && \
    cd custom-app && \
    npm run build

FROM node:20-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends postgresql redis-server && \
    rm -rf /var/lib/apt/lists/*

RUN npm i -g pm2

WORKDIR /app

# Copy full custom-app (source + deps + pre-built dist)
COPY --from=build /app/custom-app /workspace

# Create compressed backup of the initial workspace for reset
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
