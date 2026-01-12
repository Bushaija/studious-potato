## Multi-stage Dockerfile for Next.js (standalone output) with PNPM
# Base images: use Debian slim to avoid native module headaches (e.g., sharp)

# ------------------------------
# 1) Builder stage
# ------------------------------
FROM node:20-slim AS builder

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Build-time args for required env vars (safe placeholders). Override with --build-arg as needed.
ARG DB_HOST=placeholder
ARG DB_PORT=5432
ARG DB_USER=placeholder
ARG DB_PASSWORD=placeholder
ARG DB_NAME=placeholder
ARG DATABASE_URL=postgres://user:password@localhost:5432/db
ARG LOG_LEVEL=info
ARG PORT=3000
ARG DB_MIGRATING=false
ARG DB_SEEDING=false

# Export them as env so Next build can read them
ENV DB_HOST=$DB_HOST \
    DB_PORT=$DB_PORT \
    DB_USER=$DB_USER \
    DB_PASSWORD=$DB_PASSWORD \
    DB_NAME=$DB_NAME \
    DATABASE_URL=$DATABASE_URL \
    LOG_LEVEL=$LOG_LEVEL \
    PORT=$PORT \
    DB_MIGRATING=$DB_MIGRATING \
    DB_SEEDING=$DB_SEEDING

WORKDIR /app

# Install OS deps used during build (git is occasionally required by some packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates git openssl && \
    rm -rf /var/lib/apt/lists/*

# Install pnpm globally
RUN npm install -g pnpm

# Enable corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Leverage Docker layer caching: copy only manifests first
COPY package.json pnpm-lock.yaml ./

# Install deps (frozen lockfile for reproducibility)
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build Next.js (uses next.config.js output: "standalone")
RUN pnpm build


# ------------------------------
# 2) Runtime stage
# ------------------------------
FROM node:20-slim AS runner

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

# Optional runtime defaults so the app can boot without external envs
ARG DB_HOST=placeholder
ARG DB_PORT=5432
ARG DB_USER=placeholder
ARG DB_PASSWORD=placeholder
ARG DB_NAME=placeholder
ARG DATABASE_URL=postgres://user:password@localhost:5432/db
ARG LOG_LEVEL=info
ARG DB_MIGRATING=false
ARG DB_SEEDING=false

ENV DB_HOST=$DB_HOST \
    DB_PORT=$DB_PORT \
    DB_USER=$DB_USER \
    DB_PASSWORD=$DB_PASSWORD \
    DB_NAME=$DB_NAME \
    DATABASE_URL=$DATABASE_URL \
    LOG_LEVEL=$LOG_LEVEL \
    DB_MIGRATING=$DB_MIGRATING \
    DB_SEEDING=$DB_SEEDING

WORKDIR /app

# Create non-root user
RUN useradd -m -u 1001 nextjs

# Copy standalone server and static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Expose port
EXPOSE 3000

# Switch to non-root
USER nextjs

# Start Next.js standalone server
CMD ["node", "server.js"]


