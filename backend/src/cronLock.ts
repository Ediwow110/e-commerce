import { prisma } from './prisma.js';

/**
 * Postgres advisory lock for cron-style background jobs.
 *
 * Two backend instances scheduling the same job (e.g. `expire:orders` every
 * minute) would race and double-process. `pg_try_advisory_lock(key)` returns
 * true only for the first caller; everyone else returns false immediately
 * without blocking. The lock is held for the lifetime of the Postgres session,
 * so we MUST release it explicitly before disconnecting.
 *
 * Key: a stable 64-bit integer derived from a string label so different jobs
 * don't collide.
 */

function hash64(label: string): bigint {
  // FNV-1a 64-bit — stable, no collisions across our handful of job names.
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < label.length; i++) {
    hash ^= BigInt(label.charCodeAt(i));
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  // Postgres advisory lock keys are signed bigints; mask to fit.
  // Use the high bit as sign: shift down to a safe range.
  return hash >> 1n;
}

export async function withAdvisoryLock<T>(
  jobLabel: string,
  fn: () => Promise<T>
): Promise<{ acquired: true; result: T } | { acquired: false; result: null }> {
  const key = hash64(`luxe:cron:${jobLabel}`).toString();
  const rows = await prisma.$queryRawUnsafe<{ ok: boolean }[]>(`SELECT pg_try_advisory_lock(${key}::bigint) AS ok`);
  const acquired = !!rows[0]?.ok;
  if (!acquired) {
    return { acquired: false, result: null };
  }
  try {
    const result = await fn();
    return { acquired: true, result };
  } finally {
    await prisma.$queryRawUnsafe(`SELECT pg_advisory_unlock(${key}::bigint)`).catch(() => undefined);
  }
}
