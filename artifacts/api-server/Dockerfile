# Kaira Africa API Server — production image

FROM node:22-bookworm-slim AS deps
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile

FROM deps AS build
RUN pnpm run typecheck:libs
RUN pnpm --filter @workspace/api-server run build
RUN pnpm --filter @workspace/api-server deploy --legacy --prod /out/api-server

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN groupadd --system kaira && useradd --system --gid kaira kaira
COPY --from=build /out/api-server ./
COPY --from=build /repo/lib/db/migrations ./lib/db/migrations

USER kaira
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Run the migration runner before the API. It serializes schema upgrades
# with a PostgreSQL advisory lock so replicas do not race through them.
CMD ["sh", "-c", "node --enable-source-maps dist/scripts/migrate.mjs && node --enable-source-maps dist/index.mjs"]
