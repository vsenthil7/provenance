import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';

export const R2_BUCKET = process.env.R2_BUCKET ?? 'provenance-art';
export const R2_PUBLIC_BASE =
  process.env.NEXT_PUBLIC_R2_BASE ?? 'https://r2.provenance.app';

export function r2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    },
  });
}

const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/avif',
]);

const MAX_BYTES = 25 * 1024 * 1024; // 25 MiB

export function validateUpload({
  contentType,
  size,
}: {
  contentType: string;
  size: number;
}): { ok: true } | { ok: false; reason: string } {
  if (!ALLOWED_TYPES.has(contentType)) {
    return { ok: false, reason: `unsupported content-type: ${contentType}` };
  }
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, reason: 'size must be positive' };
  }
  if (size > MAX_BYTES) {
    return { ok: false, reason: `file too large (max ${MAX_BYTES} bytes)` };
  }
  return { ok: true };
}

export function objectKey(contentHashHex: string, contentType: string): string {
  const ext = contentType.split('/')[1] ?? 'bin';
  // Keep the hash as the key — content-addressable storage.
  return `art/${contentHashHex.toLowerCase()}.${ext}`;
}

export function publicUrl(key: string): string {
  return `${R2_PUBLIC_BASE}/${key}`;
}

export async function presignPut(
  key: string,
  contentType: string,
  expiresInSec = 600,
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2Client(), cmd, { expiresIn: expiresInSec });
}

/** Hex-encode a sha256 hash (32 bytes). Validates length. */
export function assertSha256Hex(hex: string): string {
  const clean = hex.toLowerCase().replace(/^0x/, '');
  if (!/^[0-9a-f]{64}$/.test(clean)) {
    throw new Error(`not a sha256 hex string: got length ${clean.length}`);
  }
  return clean;
}
