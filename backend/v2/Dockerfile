# syntax=docker/dockerfile:1
FROM oven/bun:1.4-alpine
WORKDIR /app

COPY package.json ./
RUN bun install --production

COPY . .

ENV PORT=4100
EXPOSE 4100

# Migrations run on boot inside the API; seeds are idempotent (skip when
# content already exists), then run the API.
CMD ["sh", "-c", "bun src/seed.ts && bun src/seed-auth.ts && bun src/index.ts"]
