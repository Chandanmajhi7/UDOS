# Build context is the repo root (a pnpm workspace) — see infra/k8s or the build
# command below. Multi-stage: `build` has the full workspace + devDependencies to
# compile; `runtime` keeps only what's needed to run the already-built bundle.
#
#   docker build -f apps/api/Dockerfile -t udos-api:local .

FROM node:22-alpine AS base
RUN corepack enable

# ---------------------------------------------------------------------------
FROM base AS build
WORKDIR /repo
COPY . .
# The VM/CI network fetching ~1600 packages is more failure-prone than a local
# machine's; pnpm's 60s default fetch-timeout is too tight for that, and its
# default 16-way fetch concurrency saturates a NAT'd VM network stack (Colima)
# worse than a plain machine's — neither is a sign anything is actually wrong.
# A project .npmrc (rather than `pnpm config --global`) avoids a Corepack/PATH
# quirk with global config in this base image.
RUN printf 'fetch-timeout=300000\nnetwork-concurrency=4\nfetch-retries=5\n' >> .npmrc
RUN pnpm install --frozen-lockfile
RUN pnpm exec prisma generate --schema=prisma/schema.prisma
RUN pnpm exec nx build @udos/api --configuration=production
# Prunes devDependencies from the already-installed node_modules in place —
# pnpm's workspace symlink structure is relative, so this stays correct without
# needing to cherry-pick individual node_modules directories across packages.
# CI=true: pnpm otherwise wants an interactive confirmation before purging
# devDependencies, and a Docker build has no TTY to give it one.
RUN CI=true pnpm install --prod --frozen-lockfile --ignore-scripts

# ---------------------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/libs/database/node_modules ./libs/database/node_modules
COPY --from=build /repo/prisma ./prisma

USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
