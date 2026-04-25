import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/health', () => ({
  pollChainHealth: vi.fn(async () => ({ healthy: true, height: 999 })),
}));

import { GET } from './route';

describe('GET /api/health', () => {
  it('returns chain health snapshot', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.chainHealthy).toBe(true);
    expect(json.blockHeight).toBe(999);
    expect(typeof json.checkedAt).toBe('string');
  });
});
