# Serves the Studio app bundle.
#
# `dist/` is produced by the workspace build before the image is built:
#   npx turbo run build --filter='@loopstack/loopstack-studio^...'
#   npm run build:prod -w @loopstack/loopstack-studio
#
# The bundle is static, so the image is identical on every architecture
# apart from the base image and `serve`.

FROM node:24-alpine
WORKDIR /app

RUN npm install -g serve

COPY dist ./dist
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
