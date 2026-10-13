FROM node:22-bookworm-slim

WORKDIR /app

COPY server/package.json server/package-lock.json ./server/
COPY client/package.json client/package-lock.json ./client/
RUN npm --prefix server ci --omit=dev --no-audit --no-fund \
  && npm --prefix client ci --no-audit --no-fund

COPY server ./server
COPY client ./client
RUN npm --prefix client run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server/index.js"]
