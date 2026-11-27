# Web Pit Stop (customer + internal). Dibangun dari folder frontend/ dengan output "standalone" (image kecil, tanpa node_modules penuh).
#   docker build -t pitstop-web ./frontend
#
# PENTING: BACKEND_URL dan NEXT_PUBLIC_* dibaca SAAT BUILD (rewrite /api dan alamat situs ikut terkunci di hasil build).
# Mengubahnya berarti membangun ulang image: docker compose up -d --build web

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
# Alamat backend di jaringan Docker (nama service di docker-compose.yml). Dipakai proxy /api:
# /api/internal diteruskan ke container internal, sisanya /api/* ke container customer.
ARG BACKEND_URL=http://api:4000
ARG INTERNAL_BACKEND_URL=http://internal:4001
# Alamat publik situs untuk sitemap dan metadata. Kosong = bawaan di lib/site-config.ts.
ARG NEXT_PUBLIC_SITE_URL=
# Kosong = web internal memanggil /api di alamat web sendiri (lewat proxy di atas).
ARG NEXT_PUBLIC_API_URL=
ENV BACKEND_URL=$BACKEND_URL \
    INTERNAL_BACKEND_URL=$INTERNAL_BACKEND_URL \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# ARG selalu terlihat sebagai variabel environment di perintah RUN. Kalau kosong, buang dulu supaya bawaan di kode
# (NEXT_PUBLIC_SITE_URL ?? 'https://...') yang dipakai, bukan string kosong.
RUN if [ -z "$NEXT_PUBLIC_SITE_URL" ]; then unset NEXT_PUBLIC_SITE_URL; fi && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
# Halaman server-side (lib/catalog.ts) membaca BACKEND_URL saat jalan, bukan hanya saat build. ARG tahap build tidak ikut ke sini,
# jadi harus dinyatakan ulang; tanpa ini halaman utama memanggil localhost:4000 dan gagal (500).
ARG BACKEND_URL=http://api:4000
ENV BACKEND_URL=$BACKEND_URL
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1

CMD ["node", "server.js"]
