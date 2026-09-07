# syntax=docker/dockerfile:1
FROM oven/bun:1.4-alpine
WORKDIR /app

COPY package.json ./
RUN bun install --production

COPY . .

ENV PORT=4100
ENV NODE_ENV=production
EXPOSE 4100

# Boot order: migrations FIRST so seeds and the API see the expected
# schema. Seeds are idempotent (skip when content already exists) the
# API re-runs migrate() too, which is also idempotent.
CMD ["sh", "-c", "bun src/migrate.ts && bun src/seed.ts && bun src/seed-auth.ts && bun src/index.ts"]
