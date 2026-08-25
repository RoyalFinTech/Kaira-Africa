# Kaira Africa API Server — production image
#
# Multi-stage build for a pnpm monorepo. Not build-tested in the
# environment this was authored in (no Docker daemon available there)
# — the underlying commands (pnpm install, pnpm run typecheck:libs,
# pnpm --filter @workspace/api-server run build, pnpm deploy) were
# each verified directly on the host shell before being encoded here.
# Verify the actual `docker build` once in a real environment before
# relying on it for a production deploy.

# ---- Stage 1: install all workspace dependencies -----------------------
FROM node:22-bookworm-slim AS deps
RUN corepack enable
WORKDIR /repo

# Copy the whole repo rather than cherry-picking manifests: this is a
# pnpm workspace with many member packages (see pnpm-workspace.yaml),
# and `pnpm install --frozen-lockfile` needs to see every member's
# package.json to resolve correctly. .dockerignore keeps this layer
# reasonably sized by excluding node_modules/dist/build artifacts.
COPY . .

# pnpm-workspace.yaml's `allowBuilds` section explicitly approves the
# native build scripts this repo needs (argon2, esbuild) so this runs
# non-interactively in CI/Docker.
RUN pnpm install --frozen-lockfile

# ---- Stage 2: build ------------------------------------------------------
FROM deps AS build

# Builds the Drizzle/Zod project references (lib/db, lib/api-zod, etc)
# then bundles the API server itself — the exact sequence verified
# manually: `pnpm run typecheck:libs` then a scoped
# `pnpm --filter @workspace/api-server run build`. Deliberately NOT
# the root `pnpm run build`, which also tries to build unrelated
# workspace members (e.g. a frontend design sandbox) that aren't part
# of this image and have their own unrelated env requirements.
RUN pnpm run typecheck:libs
RUN pnpm --filter @workspace/api-server run build

# Produces a pruned, self-contained copy of the api-server package
# plus only the production dependencies it (and its workspace
# dependencies) actually need — this is what keeps the final image
# small instead of shipping the whole monorepo's node_modules.
# --legacy: pnpm v10+ defaults to requiring
# inject-workspace-packages=true for `pnpm deploy`; --legacy uses the
# copy-from-store mechanism instead, which needs no workspace config
# changes. This exact command was verified to produce a working,
# bootable output (confirmed via `node dist/index.mjs` + a real
# /health check) before being encoded here.
RUN pnpm --filter @workspace/api-server deploy --legacy --prod /out/api-server

# ---- Stage 3: runtime -----------------------------------------------------
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Non-root user for defense-in-depth.
RUN groupadd --system kaira && useradd --system --gid kaira kaira

COPY --from=build /out/api-server ./
# Migrations are plain SQL files checked into the repo (see
# lib/db/migrations) — copied separately since `pnpm deploy` only
# copies the api-server package itself, not sibling workspace
# packages' files. Applied at deploy time via a self-contained bundle
# (dist/scripts/migrate.mjs, using drizzle-orm's programmatic
# migrator — needs neither drizzle-kit nor the pnpm workspace context
# that's absent from this pruned image, and this image doesn't even
# have pnpm installed). Set your platform's release/pre-deploy command
# to exactly:
#   node dist/scripts/migrate.mjs
# as a one-off step, NOT automatically on every container boot —
# running it from N replicas simultaneously on every boot is a real
# footgun (races/locks).
COPY --from=build /repo/lib/db/migrations ./lib/db/migrations

USER kaira

EXPOSE 3000

# /live is intentionally used here rather than /health or /ready:
# Docker's own HEALTHCHECK should answer "is this process alive",
# same distinction as Kubernetes liveness vs readiness probes (see
# routes/health.ts) — orchestrator-level readiness/DB checks belong to
# the orchestrator's own probe config, not baked into the image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "--enable-source-maps", "dist/index.mjs"]
