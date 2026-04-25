// lib/api/artwork.ts
import { gql } from './client';
import type { Artwork } from './types';

export interface ArtworkWithTransfers extends Artwork {
  transfers: ReadonlyArray<{
    fromAddr: string;
    toAddr: string;
    kind: 'gift' | 'settle';
    occurredAt: string;
    txHash: string;
  }>;
}

export async function fetchArtwork(idOrAddr: string): Promise<ArtworkWithTransfers | null> {
  const data = await gql<{ artwork: ArtworkWithTransfers | null }>(
    `query A($id: String!) {
      artwork(id: $id) {
        id object_addr collection_id edition_no title content_hash
        image_uri metadata_uri royalty_bps creator_addr current_owner minted_at
        transfers { fromAddr toAddr kind occurredAt txHash }
      }
    }`,
    { id: idOrAddr },
  );
  return data.artwork;
}
