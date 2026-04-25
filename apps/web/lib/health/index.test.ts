import { beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw';
import { pollChainHealth, shouldShowSequencerBanner, useHealth } from './index';

beforeEach(() => {
  useHealth.setState({
    chainHealthy: true,
    lastBlockHeight: 0,
    lastCheckedAt: 0,
    unhealthySinceMs: null,
  });
});

describe('useHealth store', () => {
  it('starts healthy', () => {
    expect(useHealth.getState().chainHealthy).toBe(true);
  });

  it('setHealth(healthy=true) clears unhealthySinceMs', () => {
    useHealth.setState({ chainHealthy: false, unhealthySinceMs: 100 });
    useHealth.getState().setHealth({ healthy: true, height: 42, at: 200 });
    const s = useHealth.getState();
    expect(s.chainHealthy).toBe(true);
    expect(s.unhealthySinceMs).toBeNull();
    expect(s.lastBlockHeight).toBe(42);
  });

  it('setHealth(healthy=false) sets unhealthySinceMs first time', () => {
    useHealth.getState().setHealth({ healthy: false, height: 10, at: 1000 });
    const s = useHealth.getState();
    expect(s.chainHealthy).toBe(false);
    expect(s.unhealthySinceMs).toBe(1000);
  });

  it('setHealth(healthy=false) preserves earliest unhealthySinceMs', () => {
    useHealth.getState().setHealth({ healthy: false, height: 10, at: 1000 });
    useHealth.getState().setHealth({ healthy: false, height: 10, at: 5000 });
    expect(useHealth.getState().unhealthySinceMs).toBe(1000);
  });
});

describe('shouldShowSequencerBanner', () => {
  it('returns false when healthy', () => {
    const s = useHealth.getState();
    expect(shouldShowSequencerBanner(s, 9_999_999)).toBe(false);
  });
  it('returns false when unhealthy but within 60s grace', () => {
    useHealth.getState().setHealth({ healthy: false, height: 0, at: 1000 });
    expect(shouldShowSequencerBanner(useHealth.getState(), 30_000)).toBe(false);
  });
  it('returns true when unhealthy for ≥60s', () => {
    useHealth.getState().setHealth({ healthy: false, height: 0, at: 1000 });
    expect(shouldShowSequencerBanner(useHealth.getState(), 61_001)).toBe(true);
  });
  it('returns false when unhealthySinceMs is null somehow', () => {
    useHealth.setState({ chainHealthy: false, unhealthySinceMs: null });
    expect(shouldShowSequencerBanner(useHealth.getState(), 999_999)).toBe(false);
  });
});

describe('pollChainHealth', () => {
  it('returns healthy=true when chain producing blocks', async () => {
    server.use(
      http.get('https://rpc.test/status', () =>
        HttpResponse.json({
          result: { sync_info: { latest_block_height: '12345', catching_up: false } },
        }),
      ),
    );
    const r = await pollChainHealth('https://rpc.test');
    expect(r).toEqual({ healthy: true, height: 12345 });
  });
  it('returns healthy=false when catching_up', async () => {
    server.use(
      http.get('https://rpc.test/status', () =>
        HttpResponse.json({
          result: { sync_info: { latest_block_height: '5', catching_up: true } },
        }),
      ),
    );
    const r = await pollChainHealth('https://rpc.test');
    expect(r.healthy).toBe(false);
  });
  it('returns healthy=false when height is 0', async () => {
    server.use(
      http.get('https://rpc.test/status', () =>
        HttpResponse.json({
          result: { sync_info: { latest_block_height: '0', catching_up: false } },
        }),
      ),
    );
    expect((await pollChainHealth('https://rpc.test')).healthy).toBe(false);
  });
  it('returns healthy=false on non-2xx', async () => {
    server.use(http.get('https://rpc.test/status', () => HttpResponse.json({}, { status: 500 })));
    expect(await pollChainHealth('https://rpc.test')).toEqual({ healthy: false, height: 0 });
  });
  it('returns healthy=false on network error', async () => {
    server.use(http.get('https://rpc.test/status', () => HttpResponse.error()));
    expect(await pollChainHealth('https://rpc.test')).toEqual({ healthy: false, height: 0 });
  });
  it('handles missing sync_info gracefully', async () => {
    server.use(http.get('https://rpc.test/status', () => HttpResponse.json({ result: {} })));
    expect((await pollChainHealth('https://rpc.test')).healthy).toBe(false);
  });
});
