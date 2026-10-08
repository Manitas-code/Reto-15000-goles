import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'tests/unit/**/*.test.ts',
      'tests/server/**/*.test.ts',
      'tests/react/**/*.test.{ts,tsx}',
    ],
  },
});
