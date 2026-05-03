import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    setupFiles: ['./tests/setup-env.ts'],
    // Integration tests share a single Postgres database and call TRUNCATE in
    // beforeEach. Running test files in parallel causes deadlocks on the
    // exclusive locks TRUNCATE acquires. Force a single fork so all files run
    // sequentially in one process. Tests within a file already run serially.
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    fileParallelism: false
  }
});
