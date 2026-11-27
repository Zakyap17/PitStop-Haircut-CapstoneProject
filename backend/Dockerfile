# Backend Pit Stop. Satu image, dua peran: SERVICE=public (API web customer) dan SERVICE=internal (API web internal),
# dijalankan sebagai container terpisah di docker-compose.yml. Dibangun dari folder backend/.
#   docker build -t pitstop-backend ./backend
# Tahap 1 memasang dependensi produksi saja (tanpa PGlite dan nodemon); tahap 2 hanya membawa yang dipakai saat jalan.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4000 \
    SERVICE=public \
    HEALTH_PATH=/api/health

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
# Migrasi dibawa ke image supaya bisa dijalankan dengan: docker compose run --rm api npm run migrate
COPY --chown=node:node migrations ./migrations
COPY --chown=node:node db ./db
COPY --chown=node:node scripts ./scripts

USER node
EXPOSE 4000 4001

# Port dan alamat cek mengikuti PORT dan HEALTH_PATH container (internal: /api/internal/health).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}${HEALTH_PATH}" >/dev/null || exit 1

CMD ["node", "src/index.js"]
