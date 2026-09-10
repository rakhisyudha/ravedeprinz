// FRONTEND_URL is the single source of truth for allowed browser origins.
// It accepts a comma-separated list so local development can cover both
// Astro dev ports; production sets exactly one https origin.
function parseOrigins(raw: string | undefined): string[] {
  const list = (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (list.length > 0) return [...new Set(list)];
  return ['http://localhost:3000', 'http://localhost:3100'];
}

const frontendOrigins = parseOrigins(process.env.FRONTEND_URL);

export const config = {
  port: Number(process.env.PORT ?? 4100),
  databaseUrl:
    process.env.DATABASE_URL ?? 'postgres://archive:archive@127.0.0.1:5433/ravedeprinz',
  frontendOrigin: frontendOrigins[0]!,
  frontendOrigins,
  requestTimeoutMs: Number(process.env.API_TIMEOUT_MS ?? 8000),
};
