FROM node:22-alpine AS base

RUN corepack enable

WORKDIR /app
ENV DATABASE_URL=postgresql://postgres:postgres@postgres:5432/social-media-microservices

FROM base AS deps

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY api-service/package.json ./api-service/
COPY auth-service/package.json ./auth-service/
COPY comment-service/package.json ./comment-service/
COPY media-service/package.json ./media-service/
COPY messaging-service/package.json ./messaging-service/
COPY notification-service/package.json ./notification-service/
COPY post-service/package.json ./post-service/
COPY search-service/package.json ./search-service/
COPY database/package.json ./database/
COPY rabbitmq/package.json ./rabbitmq/
COPY redis-client/package.json ./redis-client/
COPY database/ ./database/
COPY rabbitmq/ ./rabbitmq/
COPY redis-client/ ./redis-client/

RUN pnpm install --frozen-lockfile

FROM deps AS build

COPY . .

RUN pnpm --filter @social/auth-service build

FROM node:22-alpine AS runner

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app /app

WORKDIR /app/auth-service

EXPOSE 4001

CMD ["node", "-r", "ts-node/register/transpile-only", "dist/server.js"]
