'use client';

import { useState } from 'react';
import { useKit } from '@/lib/wallet/kit';
import { provenanceChain } from '@/lib/chain/customChain';
import { toast } from 'sonner';

async function sha256OfFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function CreateArtworkPage() {
  const { initiaAddress, requestTxBlock } = useKit();
  const [collectionAddr, setCollectionAddr] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [overrideRoyalty, setOverrideRoyalty] = useState(false);
  const [royaltyBps, setRoyaltyBps] = useState(500);
  const [stage, setStage] = useState<'idle' | 'hashing' | 'presigning' | 'uploading' | 'finalizing' | 'minting'>('idle');

  const onSubmit = async () => {
    if (!initiaAddress) return toast.error('Connect a wallet first.');
    if (!file) return toast.error('Pick an image file.');
    if (!collectionAddr) return toast.error('Provide the collection object address.');
    if (overrideRoyalty && royaltyBps > 1000) return toast.error('Royalty cap is 10% (1000 bps).');

    try {
      setStage('hashing');
      const hash = await sha256OfFile(file);

      setStage('presigning');
      const presignRes = await fetch('/api/presign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contentType: file.type, size: file.size, contentHash: hash }),
      });
      if (!presignRes.ok) throw new Error(`presign: ${(await presignRes.text()).slice(0, 100)}`);
      const { uploadUrl, publicUrl } = await presignRes.json();

      setStage('uploading');
      const upload = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'content-type': file.type },
        body: file,
      });
      if (!upload.ok) throw new Error(`upload: ${upload.status}`);

      setStage('finalizing');
      const fin = await fetch('/api/finalize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contentType: file.type, contentHash: hash }),
      });
      if (!fin.ok) throw new Error(`finalize: ${fin.status}`);

      setStage('minting');
      // Move call: provenance::artwork::mint(collection, title, hash_bytes, image_uri, "", override_some, override_bps)
      await requestTxBlock({
        chainId: provenanceChain.chainId,
        messages: [
          {
            typeUrl: '/initia.move.v1.MsgExecute',
            value: {
              sender: initiaAddress,
              moduleAddress: provenanceChain.packageAddress,
              moduleName: 'artwork',
              functionName: 'mint',
              typeArgs: [],
              args: [
                collectionAddr,
                title,
                hexToBytes(hash),
                publicUrl,
                '',
                overrideRoyalty,
                overrideRoyalty ? royaltyBps.toString() : '0',
              ],
            },
          },
        ],
      });

      toast.success(`Minted "${title}".`);
      window.location.href = '/portfolio';
    } catch (e) {
      toast.error(`Mint failed: ${(e as Error).message}`);
    } finally {
      setStage('idle');
    }
  };

  const stageLabel: Record<typeof stage, string> = {
    idle: 'Mint artwork',
    hashing: 'Hashing image…',
    presigning: 'Requesting upload URL…',
    uploading: 'Uploading to R2…',
    finalizing: 'Verifying upload…',
    minting: 'Minting on-chain…',
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 font-display text-4xl">New artwork</h1>
      <p className="mb-10 text-ink/70">
        The image's sha256 is recorded on-chain. The bytes live on R2 (with an IPFS mirror in
        v1.1). If R2 ever loses an image, anyone with a copy can rehost and the on-chain hash
        proves authenticity.
      </p>

      <div className="space-y-6 rounded-sm border border-ink/15 bg-white p-8">
        <Field label="Collection object address">
          <input
            value={collectionAddr}
            onChange={(e) => setCollectionAddr(e.target.value)}
            data-testid="art-col-addr"
            placeholder="init1col..."
            className="w-full border border-ink/20 px-3 py-2 font-mono text-sm focus:border-ink focus:outline-none"
          />
        </Field>
        <Field label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            data-testid="art-title"
            className="w-full border border-ink/20 px-3 py-2 font-mono text-base focus:border-ink focus:outline-none"
          />
        </Field>
        <Field label="Image (PNG / JPEG / WebP / AVIF, ≤25 MiB)">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            data-testid="art-file"
            className="block w-full text-sm"
          />
        </Field>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={overrideRoyalty}
            onChange={(e) => setOverrideRoyalty(e.target.checked)}
            data-testid="art-override"
          />
          Override the collection's default royalty for this piece
        </label>
        {overrideRoyalty && (
          <Field label="Override royalty (bps, max 1000)">
            <input
              type="number"
              min={0}
              max={1000}
              value={royaltyBps}
              onChange={(e) => setRoyaltyBps(Number(e.target.value))}
              data-testid="art-royalty"
              className="w-full border border-ink/20 px-3 py-2 font-mono text-base focus:border-ink focus:outline-none"
            />
          </Field>
        )}

        <button
          type="button"
          onClick={onSubmit}
          disabled={stage !== 'idle' || !file || !title || !collectionAddr}
          data-testid="art-submit"
          className="mt-4 w-full bg-ink py-3 font-mono text-sm uppercase tracking-wider text-paper hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {stageLabel[stage]}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block font-mono text-xs uppercase tracking-wider text-ink/60">
        {label}
      </label>
      {children}
    </div>
  );
}

function hexToBytes(hex: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < hex.length; i += 2) out.push(parseInt(hex.substring(i, i + 2), 16));
  return out;
}
