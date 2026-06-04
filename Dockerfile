# BlueScout 1086 — production image. Runs the custom Next.js + Socket.IO server.
FROM node:24-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# --- dependencies ---
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# --- build ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Placeholder DB URL: `prisma generate` and `next build` do not connect to it.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npm run db:generate && npm run build

# --- runtime ---
FROM base AS runner
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/lib/generated ./lib/generated
EXPOSE 3000
CMD ["npm", "run", "start"]
