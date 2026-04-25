import { describe, it, expect, vi } from 'vitest';

vi.mock('@initia/interwovenkit-react', () => ({
  useInterwovenKit: () => ({
    initiaAddress: 'init1c',
    username: 'test',
    openConnect: vi.fn(),
    openProfile: vi.fn(),
    openBridge: vi.fn(),
    requestTxBlock: vi.fn(async () => ({ txhash: 'OK' })),
    extraSurfaceWeIgnore: 'lol',
  }),
}));

describe('useKit', () => {
  it('exposes the typed slice with the documented fields', async () => {
    const { renderHook } = await import('@testing-library/react');
    const { useKit } = await import('./kit');
    const { result } = renderHook(() => useKit());
    expect(result.current.initiaAddress).toBe('init1c');
    expect(result.current.username).toBe('test');
    expect(typeof result.current.openConnect).toBe('function');
    expect(typeof result.current.openProfile).toBe('function');
    expect(typeof result.current.openBridge).toBe('function');
    expect(typeof result.current.requestTxBlock).toBe('function');
  });
});
