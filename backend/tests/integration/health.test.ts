import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';

const HAS_DB = !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('noop');

describe('health & readiness', () => {
  it('GET /health returns 200 even without DB', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.uptime).toBeGreaterThan(0);
  });

  (HAS_DB ? it : it.skip)('GET /ready returns 200 when DB is reachable', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.db).toBe('up');
  });
});
