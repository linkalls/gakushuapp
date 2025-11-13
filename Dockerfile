# --- Base Stage ---
# Use the official Bun image. The slim version is smaller.
FROM oven/bun:1-slim AS base
WORKDIR /app

# --- Install Dependencies Stage ---
# This stage is dedicated to installing dependencies.
# It's a separate stage to leverage Docker's layer caching.
# It will only be re-run if package.json or bun.lockb changes.
FROM base AS install
RUN apt-get update && apt-get install -y --no-install-recommends openssl

# Copy files required for installation
COPY package.json bun.lock tsconfig.json next.config.ts ./

# Install dependencies using Bun.
# --frozen-lockfile ensures that the exact versions from bun.lockb are installed.
RUN bun install

# --- Runner Stage (Final Image) ---
# This is the final image that will be used to run the application.
FROM base AS runner
COPY --from=install /app/node_modules ./node_modules
COPY . .

# Next.js runs on port 3000 by default.
EXPOSE 3000

# The command to start the Next.js development server using Bun.
# The user mentioned `bun --bun`, which is for running the dev server.
# `bun run dev` will execute the "dev" script from package.json.
CMD ["bun", "start"]
