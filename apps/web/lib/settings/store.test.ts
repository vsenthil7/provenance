import { beforeEach, describe, expect, it } from 'vitest';
import { useSettings } from './store';

beforeEach(() => {
  useSettings.getState().disable();
});

describe('useSettings store', () => {
  it('starts disabled', () => {
    const s = useSettings.getState();
    expect(s.isEnabled).toBe(false);
    expect(s.expiryUnix).toBe(0);
    expect(s.scopeTarget).toBeNull();
  });

  it('enables with target and expiry', () => {
    useSettings.getState().enable(3600, 'init1xxx::auction::place_bid', 1_700_003_600);
    const s = useSettings.getState();
    expect(s.isEnabled).toBe(true);
    expect(s.expiryUnix).toBe(1_700_003_600);
    expect(s.durationSecs).toBe(3600);
    expect(s.scopeTarget).toBe('init1xxx::auction::place_bid');
  });

  it('disables and clears state', () => {
    useSettings.getState().enable(3600, 'foo', 1_700_003_600);
    useSettings.getState().disable();
    const s = useSettings.getState();
    expect(s.isEnabled).toBe(false);
    expect(s.expiryUnix).toBe(0);
    expect(s.scopeTarget).toBeNull();
  });

  it('isExpired returns true when not enabled', () => {
    expect(useSettings.getState().isExpired(0)).toBe(true);
  });

  it('isExpired returns true when past expiry', () => {
    useSettings.getState().enable(3600, 'foo', 1_700_000_000);
    expect(useSettings.getState().isExpired(1_700_000_001)).toBe(true);
  });

  it('isExpired returns false when within window', () => {
    useSettings.getState().enable(3600, 'foo', 1_700_003_600);
    expect(useSettings.getState().isExpired(1_700_002_000)).toBe(false);
  });

  it('isExpired uses Date.now when no arg passed', () => {
    useSettings.getState().enable(3600, 'foo', Math.floor(Date.now() / 1000) + 3600);
    expect(useSettings.getState().isExpired()).toBe(false);
  });
});
