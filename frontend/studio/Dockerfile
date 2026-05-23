FROM node:20-alpine AS build
WORKDIR /app

ARG COMMIT_SHA=unknown
ARG VERSION=unknown

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

ENV VITE_COMMIT_SHA=${COMMIT_SHA}
ENV VITE_APP_VERSION=${VERSION}

RUN npm run build:prod

FROM node:20-alpine AS production
WORKDIR /app

RUN npm install -g serve

COPY --from=build /app/dist ./dist
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
