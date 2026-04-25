import { describe, it, expect } from 'vitest';
import { provenanceChain } from './customChain';

describe('provenanceChain config', () => {
  it('has the required InterwovenKit registry fields', () => {
    expect(provenanceChain.chainId).toBe('provenance-1');
    expect(provenanceChain.chainName).toBe('Provenance');
    expect(provenanceChain.bech32Prefix).toBe('init');
  });

  it('exposes RPC, REST, and indexer URLs', () => {
    expect(provenanceChain.apis.rpc).toMatch(/^https?:\/\//);
    expect(provenanceChain.apis.rest).toMatch(/^https?:\/\//);
    expect(provenanceChain.apis.indexer).toMatch(/^https?:\/\//);
  });

  it('declares the uinit fee token with the documented gas price', () => {
    const tokens = provenanceChain.fees.fee_tokens;
    expect(tokens).toHaveLength(1);
    expect(tokens[0].denom).toBe('uinit');
    expect(tokens[0].fixed_min_gas_price).toBe(0.015);
  });

  it('declares OP bridge metadata with uinit denom', () => {
    expect(provenanceChain.metadata.op_denoms).toEqual(['uinit']);
    expect(typeof provenanceChain.metadata.op_bridge_id).toBe('string');
  });

  it('exposes a non-empty package address', () => {
    expect(provenanceChain.packageAddress.length).toBeGreaterThan(0);
    expect(provenanceChain.packageAddress).toMatch(/^init1/);
  });
});
