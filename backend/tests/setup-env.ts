// Loaded by vitest BEFORE any test module is imported (see vitest.config.ts).
// Provides safe defaults for env validation so that importing src/* does not
// throw when running locally without a .env file. CI overrides these via the
// workflow `env:` block — those values win because they're already set in
// process.env before this file runs.
const defaults: Record<string, string> = {
  NODE_ENV: 'test',
  JWT_ACCESS_SECRET: 'test-access-secret-32-chars-minimum-len',
  JWT_REFRESH_SECRET: 'test-refresh-secret-32-chars-different',
  CORS_ORIGIN: 'http://localhost:5173',
  PAYMENT_PROVIDER_DEFAULT: 'mock',
  PAYMENT_WEBHOOK_SECRET: 'test-webhook-secret',
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://noop:noop@localhost:5432/noop'
};
for (const [k, v] of Object.entries(defaults)) {
  if (!process.env[k]) process.env[k] = v;
}
