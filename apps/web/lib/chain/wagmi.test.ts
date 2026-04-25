import { describe, it, expect } from 'vitest';
import { wagmiConfig } from './wagmi';

describe('wagmiConfig', () => {
  it('is a wagmi Config object', () => {
    expect(wagmiConfig).toBeDefined();
    expect(typeof wagmiConfig).toBe('object');
  });

  it('has at least one chain configured', () => {
    expect(wagmiConfig.chains.length).toBeGreaterThan(0);
  });

  it('exposes the connectors collection', () => {
    expect(Array.isArray(wagmiConfig.connectors)).toBe(true);
  });

  it('returns a client for the registered chain', () => {
    const c = wagmiConfig.getClient({ chainId: wagmiConfig.chains[0].id });
    expect(c).toBeDefined();
  });
});
