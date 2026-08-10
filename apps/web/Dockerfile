# Build context is the repo root (a pnpm workspace).
#   docker build -f apps/web/Dockerfile -t udos-web:local .
#
# Next.js's `output: 'standalone'` (next.config.js) traces only the dependencies
# each route actually needs, so the runtime image doesn't need the workspace's
# full node_modules — much smaller than the API image's approach, and Next.js's
# own tracer (not pnpm's symlinks) is what makes that safe here.

FROM node:22-alpine AS base
RUN corepack enable

# ---------------------------------------------------------------------------
FROM base AS build
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
# NEXT_PUBLIC_* vars are compiled into the client bundle at build time, not read
# at container start — they must be supplied as build args, not Deployment env.
ARG NEXT_PUBLIC_API_URL=http://localhost:3000/api
ARG NEXT_PUBLIC_KEYCLOAK_ISSUER=http://localhost:8080/realms/udos
ARG NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=udos-web
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_KEYCLOAK_ISSUER=$NEXT_PUBLIC_KEYCLOAK_ISSUER \
    NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=$NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
RUN pnpm exec nx build @udos/web --configuration=production

# ---------------------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public

USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
