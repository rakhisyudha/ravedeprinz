# syntax=docker/dockerfile:1
FROM oven/bun:1.4-alpine
WORKDIR /app

COPY package.json ./
RUN bun install --production

COPY . .

ENV PORT=4000
EXPOSE 4000

# Auto-seed on first start (skips when data already exists), then run the API.
CMD ["sh", "-c", "bun run seed.ts && bun run index.ts"]
