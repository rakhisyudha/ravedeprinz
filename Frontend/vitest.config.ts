import { defineConfig } from 'vitest/config';

// Every suite imports the pure src/lib/* modules directly, so the runner needs
// no framework plugin and the default environment is node. Suites that need a
// document opt in with the `@vitest-environment jsdom` docblock.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
