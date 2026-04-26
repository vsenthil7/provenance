import { describe, it, expect } from 'vitest';
import {
  buildBuyNowMessage,
  buildPlaceBidMessage,
  buildMintArtworkMessage,
  encodeU64,
  encodeBool,
  encodeString,
  encodeBytes,
  encodeAddress,
  toBase64,
  toBase64Node,
  toBase64Browser,
} from './messages';

describe('encodeU64', () => {
  it('encodes 0', () => {
    expect(encodeU64(0n)).toBe('AAAAAAAAAAA=');
  });
  it('encodes 1', () => {
    expect(encodeU64(1n)).toBe('AQAAAAAAAAA=');
  });
  it('encodes 1_000_000', () => {
    // little-endian: 0x40 0x42 0x0F 0x00 ...
    const buf = Buffer.from(encodeU64(1_000_000n), 'base64');
    expect(buf[0]).toBe(0x40);
    expect(buf[1]).toBe(0x42);
    expect(buf[2]).toBe(0x0f);
    expect(buf.length).toBe(8);
  });
  it('rejects negative', () => {
    expect(() => encodeU64(-1n)).toThrow(/negative/);
  });
});

describe('encodeBool', () => {
  it('encodes true as 0x01', () => {
    expect(Buffer.from(encodeBool(true), 'base64')[0]).toBe(1);
  });
  it('encodes false as 0x00', () => {
    expect(Buffer.from(encodeBool(false), 'base64')[0]).toBe(0);
  });
});

describe('encodeString', () => {
  it('prepends ULEB128 length', () => {
    const buf = Buffer.from(encodeString('hi'), 'base64');
    expect(buf[0]).toBe(2);
    expect(buf[1]).toBe('h'.charCodeAt(0));
    expect(buf[2]).toBe('i'.charCodeAt(0));
  });
  it('handles empty string', () => {
    const buf = Buffer.from(encodeString(''), 'base64');
    expect(buf[0]).toBe(0);
    expect(buf.length).toBe(1);
  });
  it('handles strings whose ULEB128 length spans 2 bytes (>=128)', () => {
    const long = 'a'.repeat(200);
    const buf = Buffer.from(encodeString(long), 'base64');
    // ULEB128 of 200 = [0xc8, 0x01]
    expect(buf[0]).toBe(0xc8);
    expect(buf[1]).toBe(0x01);
    expect(buf.length).toBe(2 + 200);
  });
});

describe('encodeBytes', () => {
  it('encodes hex with 0x prefix', () => {
    const buf = Buffer.from(encodeBytes('0xdeadbeef'), 'base64');
    expect(buf[0]).toBe(4);
    expect(buf[1]).toBe(0xde);
    expect(buf[2]).toBe(0xad);
  });
  it('encodes hex without prefix', () => {
    const buf = Buffer.from(encodeBytes('cafebabe'), 'base64');
    expect(buf[0]).toBe(4);
    expect(buf[1]).toBe(0xca);
  });
  it('rejects odd-length hex', () => {
    expect(() => encodeBytes('0xabc')).toThrow(/odd hex/);
  });
});

describe('encodeAddress', () => {
  it('encodes 0x-prefixed hex as 32 bytes', () => {
    const buf = Buffer.from(encodeAddress('0xCAFE'), 'base64');
    expect(buf.length).toBe(32);
    // last bytes carry the value (right-padded leading zeros)
    expect(buf[30]).toBe(0xca);
    expect(buf[31]).toBe(0xfe);
  });
  it('encodes bech32 as a length-prefixed string (placeholder)', () => {
    const out = encodeAddress('init1abc');
    expect(typeof out).toBe('string');
    const buf = Buffer.from(out, 'base64');
    expect(buf[0]).toBe(8); // length of 'init1abc'
  });
});

describe('buildBuyNowMessage', () => {
  it('targets market::buy_now', () => {
    const m = buildBuyNowMessage({
      sender: 'init1buyer',
      listingObjectAddr: '0xL1',
      priceUinit: 5_000_000n,
    });
    expect(m.typeUrl).toBe('/initia.move.v1.MsgExecute');
    expect(m.value.moduleName).toBe('market');
    expect(m.value.functionName).toBe('buy_now');
    expect(m.value.args).toHaveLength(2);
  });
});

describe('buildPlaceBidMessage', () => {
  it('targets auction::place_bid (the autosign scope)', () => {
    const m = buildPlaceBidMessage({
      sender: 'init1bidder',
      auctionObjectAddr: '0xA1',
      amountUinit: 3_000_000n,
    });
    expect(m.value.moduleName).toBe('auction');
    expect(m.value.functionName).toBe('place_bid');
  });
});

describe('buildMintArtworkMessage', () => {
  it('targets artwork::mint', () => {
    const m = buildMintArtworkMessage({
      sender: 'init1artist',
      collectionObjectAddr: '0xC1',
      title: 'Quiet',
      contentHashHex: '0x' + 'a'.repeat(64),
      imageUri: 'https://x',
      metadataUri: '',
      royaltyOverrideBps: null,
    });
    expect(m.value.moduleName).toBe('artwork');
    expect(m.value.functionName).toBe('mint');
    expect(m.value.args).toHaveLength(7);
  });

  it('encodes royalty override as Some when provided', () => {
    const m = buildMintArtworkMessage({
      sender: 'init1artist',
      collectionObjectAddr: '0xC1',
      title: 't',
      contentHashHex: '00'.repeat(32),
      imageUri: '',
      metadataUri: '',
      royaltyOverrideBps: 750,
    });
    // sixth arg is the bool
    expect(Buffer.from(m.value.args[5], 'base64')[0]).toBe(1);
  });

  it('encodes royalty override as None (false bool) when null', () => {
    const m = buildMintArtworkMessage({
      sender: 'init1artist',
      collectionObjectAddr: '0xC1',
      title: 't',
      contentHashHex: '00'.repeat(32),
      imageUri: '',
      metadataUri: '',
      royaltyOverrideBps: null,
    });
    expect(Buffer.from(m.value.args[5], 'base64')[0]).toBe(0);
    // u64 of 0 when override is null
    expect(Buffer.from(m.value.args[6], 'base64').length).toBe(8);
  });
});

describe('toBase64 paths', () => {
  // Cover the routing function's truthy branch (Buffer is defined in Node).
  it('toBase64 in Node delegates to the Buffer path', () => {
    const out = toBase64(new Uint8Array([1, 2, 3]));
    expect(out).toBe(toBase64Node(new Uint8Array([1, 2, 3])));
  });

  // Direct test of toBase64Node so the function is invoked even if a future
  // refactor changes the routing.
  it('toBase64Node produces the same bytes as Buffer.from(...).toString("base64")', () => {
    const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    expect(toBase64Node(bytes)).toBe(Buffer.from(bytes).toString('base64'));
  });

  // Direct test of the browser fallback path. Stub btoa so the test does
  // not depend on the (Node 22+) global btoa polyfill.
  it('toBase64Browser concatenates char codes and calls btoa', () => {
    const calls: string[] = [];
    const realBtoa = (globalThis as { btoa?: (s: string) => string }).btoa;
    (globalThis as { btoa?: (s: string) => string }).btoa = (s: string) => {
      calls.push(s);
      // realistic return: a deterministic base64 of the input's char codes
      return Buffer.from(Array.from(s, (c) => c.charCodeAt(0))).toString('base64');
    };
    try {
      const out = toBase64Browser(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
      expect(calls).toHaveLength(1);
      // The string passed to btoa is the char-code-as-string concat
      expect(calls[0]).toBe(
        String.fromCharCode(0xde) +
        String.fromCharCode(0xad) +
        String.fromCharCode(0xbe) +
        String.fromCharCode(0xef),
      );
      // The result round-trips through Buffer.from
      expect(Buffer.from(out, 'base64').length).toBe(4);
    } finally {
      if (realBtoa) (globalThis as { btoa?: (s: string) => string }).btoa = realBtoa;
      else delete (globalThis as { btoa?: (s: string) => string }).btoa;
    }
  });

  // Cover toBase64Browser path with empty input.
  it('toBase64Browser handles empty input', () => {
    expect(toBase64Browser(new Uint8Array(0))).toBe('');
  });
});
