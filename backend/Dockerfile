# syntax=docker/dockerfile:1
FROM oven/bun:1.4-alpine
WORKDIR /app

COPY backend/package.json ./
RUN bun install --production

COPY backend ./backend
COPY data ./data

ENV PORT=4000
EXPOSE 4000
CMD ["bun", "run", "backend/index.ts"]
