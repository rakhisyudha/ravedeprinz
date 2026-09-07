import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import svelte from '@astrojs/svelte';

// Phase 1: server output (node standalone) so later phases can add
// on-demand endpoints (OG images) without re-architecting.
// Individual pages opt into prerendering; see src/pages.
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  // Tailwind is wired manually via postcss.config.cjs + tailwind.config.mjs
  // (@astrojs/tailwind does not support Astro 7 yet); the @tailwind
  // directives in src/styles/global.css are processed by Vite directly.
  integrations: [svelte()],
  server: { port: 3100 },
});
