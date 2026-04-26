// lib/chain/messages.ts
// Builders for /initia.move.v1.MsgExecute payloads.
// Camel-case keys per InterwovenKit's requestTxBlock spec; BCS args
// serialised as base64 strings — see Initia move client docs.

import { provenanceChain } from './customChain';

const PACKAGE_ADDRESS =
  process.env.NEXT_PUBLIC_PROVENANCE_PACKAGE ?? '0xCAFE'; // overridden at deploy time

export interface MoveExecuteMessage {
  typeUrl: '/initia.move.v1.MsgExecute';
  value: {
    sender: string;
    moduleAddress: string;
    moduleName: string;
    functionName: string;
    typeArgs: string[];
    args: string[]; // base64-encoded BCS bytes
  };
}

interface BuildBuyParams {
  sender: string;
  listingObjectAddr: string;
  priceUinit: bigint;
}

export function buildBuyNowMessage(p: BuildBuyParams): MoveExecuteMessage {
  return {
    typeUrl: '/initia.move.v1.MsgExecute',
    value: {
      sender: p.sender,
      moduleAddress: PACKAGE_ADDRESS,
      moduleName: 'market',
      functionName: 'buy_now',
      typeArgs: [],
      args: [
        encodeAddress(p.listingObjectAddr),
        encodeU64(p.priceUinit),
      ],
    },
  };
}

interface BuildBidParams {
  sender: string;
  auctionObjectAddr: string;
  amountUinit: bigint;
}

export function buildPlaceBidMessage(p: BuildBidParams): MoveExecuteMessage {
  return {
    typeUrl: '/initia.move.v1.MsgExecute',
    value: {
      sender: p.sender,
      moduleAddress: PACKAGE_ADDRESS,
      moduleName: 'auction',
      functionName: 'place_bid',
      typeArgs: [],
      args: [
        encodeAddress(p.auctionObjectAddr),
        encodeU64(p.amountUinit),
      ],
    },
  };
}

interface BuildMintParams {
  sender: string;
  collectionObjectAddr: string;
  title: string;
  contentHashHex: string; // 0x-prefixed 32-byte hex
  imageUri: string;
  metadataUri: string;
  royaltyOverrideBps: number | null;
}

export function buildMintArtworkMessage(p: BuildMintParams): MoveExecuteMessage {
  return {
    typeUrl: '/initia.move.v1.MsgExecute',
    value: {
      sender: p.sender,
      moduleAddress: PACKAGE_ADDRESS,
      moduleName: 'artwork',
      functionName: 'mint',
      typeArgs: [],
      args: [
        encodeAddress(p.collectionObjectAddr),
        encodeString(p.title),
        encodeBytes(p.contentHashHex),
        encodeString(p.imageUri),
        encodeString(p.metadataUri),
        encodeBool(p.royaltyOverrideBps !== null),
        encodeU64(BigInt(p.royaltyOverrideBps ?? 0)),
      ],
    },
  };
}

// ---- BCS-ish encoders. Real BCS lives in viem-cosmos / @initia/initia.js;
// for the scaffold we hand-roll the small subset our messages need so the
// shape is testable. Replace with library calls in Phase 3 if/when added.

export function encodeU64(v: bigint): string {
  if (v < 0n) throw new Error('negative u64');
  const bytes = new Uint8Array(8);
  let n = v;
  for (let i = 0; i < 8; i++) {
    bytes[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return toBase64(bytes);
}

export function encodeBool(b: boolean): string {
  return toBase64(new Uint8Array([b ? 1 : 0]));
}

export function encodeAddress(addr: string): string {
  // 32-byte object addresses; bech32 → 32 raw bytes is delegated to viem-cosmos
  // in production. For tests we accept hex for simplicity.
  if (addr.startsWith('0x')) {
    const hex = addr.slice(2).padStart(64, '0');
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return toBase64(bytes);
  }
  // bech32 placeholder: in prod, use bech32 lib. The tests assert *shape*
  // (length-prefixed ascii), production replaces with raw bytes.
  return encodeString(addr);
}

export function encodeString(s: string): string {
  const enc = new TextEncoder().encode(s);
  const len = encodeULEB128(enc.length);
  const out = new Uint8Array(len.length + enc.length);
  out.set(len, 0);
  out.set(enc, len.length);
  return toBase64(out);
}

export function encodeBytes(hex: string): string {
  const stripped = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (stripped.length % 2 !== 0) throw new Error('odd hex');
  const raw = new Uint8Array(stripped.length / 2);
  for (let i = 0; i < raw.length; i++) {
    raw[i] = parseInt(stripped.slice(i * 2, i * 2 + 2), 16);
  }
  const len = encodeULEB128(raw.length);
  const out = new Uint8Array(len.length + raw.length);
  out.set(len, 0);
  out.set(raw, len.length);
  return toBase64(out);
}

function encodeULEB128(n: number): Uint8Array {
  const bytes: number[] = [];
  let v = n;
  do {
    let b = v & 0x7f;
    v >>>= 7;
    if (v !== 0) b |= 0x80;
    bytes.push(b);
  } while (v !== 0);
  return new Uint8Array(bytes);
}

/**
 * Encode a byte array as base64. Uses Buffer when available (Node, Next.js
 * server runtime), falls back to btoa() in pure browser environments.
 *
 * Exported and split into helpers so both branches are exercised by unit tests
 * without monkey-patching `globalThis.Buffer`.
 */
export function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') return toBase64Node(bytes);
  return toBase64Browser(bytes);
}

/** Node / server path. Uses the Buffer global. */
export function toBase64Node(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

/** Pure-browser fallback. Uses String.fromCharCode + btoa. */
export function toBase64Browser(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
