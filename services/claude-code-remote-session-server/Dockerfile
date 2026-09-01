# Agent image: the session server + Claude Code, layered onto the shared infra base.
ARG BASE_IMAGE=loopstack-engineer-base:latest

FROM node:20-slim AS build

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM ${BASE_IMAGE}

# The coding agent itself.
RUN npm i -g @anthropic-ai/claude-code

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

# Boot conditional services (Postgres/Redis), then the session server.
COPY start.sh ./
RUN chmod +x ./start.sh

ENV AGENT_PORT=3001
ENV WORKSPACE_ROOT=/workspace
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["./start.sh"]
