import { describe, expect, it } from 'vitest';
import {
  AUTOSIGN_DEFAULTS,
  buildPlaceBidAuthz,
  clampDuration,
  isPlaceBidScope,
} from './index';

describe('clampDuration', () => {
  it('returns default for zero', () => {
    expect(clampDuration(0)).toBe(AUTOSIGN_DEFAULTS.defaultDurationSecs);
  });
  it('returns default for negative', () => {
    expect(clampDuration(-1)).toBe(AUTOSIGN_DEFAULTS.defaultDurationSecs);
  });
  it('returns default for NaN', () => {
    expect(clampDuration(NaN)).toBe(AUTOSIGN_DEFAULTS.defaultDurationSecs);
  });
  it('returns default for Infinity', () => {
    expect(clampDuration(Infinity)).toBe(AUTOSIGN_DEFAULTS.defaultDurationSecs);
  });
  it('caps at max duration', () => {
    expect(clampDuration(AUTOSIGN_DEFAULTS.maxDurationSecs * 10)).toBe(
      AUTOSIGN_DEFAULTS.maxDurationSecs,
    );
  });
  it('floors fractional values', () => {
    expect(clampDuration(3600.7)).toBe(3600);
  });
  it('passes through valid values', () => {
    expect(clampDuration(3600)).toBe(3600);
  });
});

describe('buildPlaceBidAuthz', () => {
  it('produces the canonical place_bid scope', () => {
    const p = buildPlaceBidAuthz(3600, 1_700_000_000);
    expect(p.msgTypeUrl).toBe('/initia.move.v1.MsgExecute');
    expect(p.target).toMatch(/::auction::place_bid$/);
    expect(p.spendCapUinit).toBe(20_000_000n);
    expect(p.durationSecs).toBe(3600);
    expect(p.expiryUnix).toBe(1_700_003_600);
  });
  it('uses now() when not provided', () => {
    const p = buildPlaceBidAuthz(3600);
    expect(p.expiryUnix).toBeGreaterThan(0);
  });
  it('clamps oversize duration', () => {
    const p = buildPlaceBidAuthz(99_999_999, 1_700_000_000);
    expect(p.durationSecs).toBe(AUTOSIGN_DEFAULTS.maxDurationSecs);
  });
});

describe('isPlaceBidScope', () => {
  it('accepts a valid place_bid target', () => {
    expect(isPlaceBidScope('init1xxx::auction::place_bid')).toBe(true);
  });
  it('rejects other functions', () => {
    expect(isPlaceBidScope('init1xxx::market::buy_now')).toBe(false);
  });
  it('rejects empty', () => {
    expect(isPlaceBidScope('')).toBe(false);
  });
});
