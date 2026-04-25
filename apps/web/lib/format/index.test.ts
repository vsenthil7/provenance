import { describe, expect, it } from 'vitest';
import { formatINIT, initToUinit, shortenAddress, uinitToInit } from './index';

describe('shortenAddress', () => {
  it('returns empty string for empty input', () => {
    expect(shortenAddress('')).toBe('');
  });
  it('returns input unchanged for short addresses', () => {
    expect(shortenAddress('init1abc')).toBe('init1abc');
  });
  it('shortens long addresses with ellipsis', () => {
    const addr = 'init1lina000000000000000000000000000000lina';
    expect(shortenAddress(addr)).toBe('init1lin…lina');
  });
  it('shortens at exactly the boundary', () => {
    expect(shortenAddress('1234567890123')).toBe('12345678…0123');
  });
});

describe('uinitToInit', () => {
  it('converts whole INIT', () => {
    expect(uinitToInit(1_000_000n)).toBe('1');
  });
  it('converts zero', () => {
    expect(uinitToInit(0n)).toBe('0');
  });
  it('handles fractional INIT', () => {
    expect(uinitToInit(1_500_000n)).toBe('1.5');
  });
  it('strips trailing zeros from fraction', () => {
    expect(uinitToInit(1_100_000n)).toBe('1.1');
  });
  it('handles dust amounts', () => {
    expect(uinitToInit(7n)).toBe('0.000007');
  });
  it('accepts number input', () => {
    expect(uinitToInit(2_000_000)).toBe('2');
  });
  it('accepts string input', () => {
    expect(uinitToInit('3000000')).toBe('3');
  });
});

describe('initToUinit', () => {
  it('converts whole INIT to uinit', () => {
    expect(initToUinit('1')).toBe(1_000_000n);
  });
  it('converts decimal INIT', () => {
    expect(initToUinit('1.5')).toBe(1_500_000n);
  });
  it('handles zero', () => {
    expect(initToUinit('0')).toBe(0n);
  });
  it('truncates beyond 6 dp', () => {
    expect(initToUinit('1.1234567890')).toBe(1_123_456n);
  });
  it('accepts number input', () => {
    expect(initToUinit(2.5)).toBe(2_500_000n);
  });
  it('handles missing fractional part', () => {
    expect(initToUinit('5')).toBe(5_000_000n);
  });
});

describe('formatINIT', () => {
  it('appends INIT label', () => {
    expect(formatINIT(1_000_000n)).toBe('1 INIT');
    expect(formatINIT(1_500_000n)).toBe('1.5 INIT');
  });
});
