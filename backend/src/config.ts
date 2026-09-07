export const config = {
  port: Number(process.env.PORT ?? 4100),
  databaseUrl:
    process.env.DATABASE_URL ?? 'postgres://archive:archive@127.0.0.1:5433/ravedeprinz',
  frontendOrigin: process.env.FRONTEND_URL ?? 'http://localhost:3100',
  requestTimeoutMs: Number(process.env.API_TIMEOUT_MS ?? 8000),
};
