## @file Dockerfile
## @brief Multi-stage build for the Next.js application and custom server.

## @section builder_stage Builder stage
FROM node:25-alpine AS builder

WORKDIR /app

## @brief Install all dependencies required for build-time tasks.
COPY package.json package-lock.json ./
RUN npm ci

## @brief Copy Prisma schema and generate the Prisma client.
COPY prisma ./prisma
COPY prisma.config.ts ./
## Provide a dummy DB URL so Prisma config evaluation passes during build.
ENV DATABASE_URL="postgresql://mock:mock@localhost:5432/mock"
RUN npx prisma generate

## @brief Copy the application source.
COPY . .

## @brief Build the Next.js application.
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

## @section runner_stage Runtime stage
FROM node:25-alpine AS runner

WORKDIR /app

## @brief Configure the runtime environment.
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

## @brief Install production-only dependencies.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

## @brief Copy build outputs and required runtime files.
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/types ./types
COPY --from=builder /app/server.ts ./server.ts

## @brief Install tsx to execute the custom TypeScript server entrypoint.
RUN npm install -g tsx

EXPOSE 3000

## @brief Synchronize the database schema and start the server.
CMD ["sh", "-c", "npx prisma db push && tsx server.ts"]
