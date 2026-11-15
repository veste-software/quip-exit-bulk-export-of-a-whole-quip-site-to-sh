import { defineConfig } from 'vitest/config';

// Plain Vitest (no Astro Vite config): the tested code in src/lib, src/mock and worker/
// is framework-free TypeScript. Tests live in test/ and run once with `npm test`.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 20000,
  },
});
