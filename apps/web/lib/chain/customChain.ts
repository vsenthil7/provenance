// Registry-shaped chain object for InterwovenKit.
// The `indexer` URL is mandatory even if we don't query it from the kit;
// the kit itself uses it for portfolio views and absence triggers errors.

export const provenanceChain = {
  chainId: 'provenance-1',
  chainName: 'Provenance',
  bech32Prefix: 'init',
  apis: {
    rpc: process.env.NEXT_PUBLIC_PROVENANCE_RPC ?? 'https://rpc.provenance-1.initia.xyz',
    rest: process.env.NEXT_PUBLIC_PROVENANCE_REST ?? 'https://rest.provenance-1.initia.xyz',
    indexer:
      process.env.NEXT_PUBLIC_PROVENANCE_INDEXER ?? 'https://indexer.provenance-1.initia.xyz',
  },
  fees: {
    fee_tokens: [{ denom: 'uinit', fixed_min_gas_price: 0.015 }],
  },
  metadata: {
    op_bridge_id: process.env.NEXT_PUBLIC_OP_BRIDGE_ID ?? '0',
    op_denoms: ['uinit'],
  },
  packageAddress:
    process.env.NEXT_PUBLIC_PROVENANCE_PACKAGE ??
    'init1pkg00000000000000000000000000000000prov',
} as const;

export type ProvenanceChain = typeof provenanceChain;
