FROM node:20-alpine AS base

# Install dependensi dasar yang dibutuhkan alpine
FROM base AS deps
RUN apk add --no-libc6-compat
WORKDIR /app

# Copy package management files
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./

# Install dependensi berdasarkan lockfile yang terdeteksi
RUN \
  if [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  else echo "Lockfile tidak ditemukan." && exit 1; \
  fi

# Builder stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Matikan telemetri Next.js saat build
ENV NEXT_TELEMETRY_DISABLED 1

# Masukkan ENV yang dibutuhkan saat BUILD TIME di sini jika ada (contoh: NEXT_PUBLIC_API_URL)
# ARG NEXT_PUBLIC_API_URL
# ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Jalankan skrip build
RUN \
  if [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f yarn.lock ]; then yarn build; \
  else echo "Lockfile tidak ditemukan." && exit 1; \
  fi

# Runner stage (Image produksi akhir)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Buat non-root user untuk alasan keamanan
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy folder public dan hasil build standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]