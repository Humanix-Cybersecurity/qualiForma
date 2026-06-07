# SPDX-License-Identifier: AGPL-3.0-or-later
# syntax=docker/dockerfile:1
# Image multi-cible (API et front) construite depuis le monorepo. Les couches base/install/build
# sont mutualisées entre les deux cibles (cache BuildKit).

FROM node:20-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# --- Dépendances (avec outils de compilation pour argon2) ---
FROM base AS install
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY . .
RUN pnpm install --frozen-lockfile

# --- Build API : dépendances internes d'abord (dist requis pour la résolution TS), puis api ---
FROM install AS build-api
RUN pnpm --filter @humanix/domain build \
    && pnpm --filter @humanix/signature-engine build \
    && pnpm --filter @humanix/pdf-templates build \
    && pnpm --filter @humanix/api exec prisma generate \
    && pnpm --filter @humanix/api build

# --- Build front : i18n + ui d'abord, puis web ; VITE_API_URL inliné par Vite ---
FROM install AS build-web
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @humanix/i18n build \
    && pnpm --filter @humanix/ui build \
    && pnpm --filter @humanix/web build

# --- Runtime API ---
FROM base AS api-runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl postgresql-client ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build-api /app /app
WORKDIR /app
EXPOSE 3000
CMD ["sh", "infra/docker/api-entrypoint.sh"]

# --- Runtime front (Vite preview sert le build statique) ---
FROM base AS web-runtime
COPY --from=build-web /app /app
WORKDIR /app/apps/web
EXPOSE 4173
CMD ["pnpm", "exec", "vite", "preview", "--host", "0.0.0.0", "--port", "4173"]
