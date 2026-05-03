import { describe, it, expect } from 'vitest';
import { withAdvisoryLock } from '../../src/cronLock.js';
import { HAS_REAL_DB } from './setup.js';

(HAS_REAL_DB ? describe : describe.skip)('cronLock advisory lock', () => {
  it('only one of two concurrent runs acquires the lock', async () => {
    let aHeld = false;
    let bHeld = false;

    const slow = (label: 'a' | 'b') => async () => {
      if (label === 'a') aHeld = true; else bHeld = true;
      await new Promise((r) => setTimeout(r, 200));
      return label;
    };

    const [a, b] = await Promise.all([
      withAdvisoryLock('test-job', slow('a')),
      withAdvisoryLock('test-job', slow('b'))
    ]);

    const acquiredCount = [a.acquired, b.acquired].filter(Boolean).length;
    expect(acquiredCount).toBe(1);
    // The losing run should NOT have entered the protected callback.
    expect(aHeld && bHeld).toBe(false);
  });

  it('a follow-up call after the lock is released succeeds', async () => {
    const first = await withAdvisoryLock('test-job-2', async () => 'first');
    expect(first.acquired).toBe(true);
    const second = await withAdvisoryLock('test-job-2', async () => 'second');
    expect(second.acquired).toBe(true);
  });
});
