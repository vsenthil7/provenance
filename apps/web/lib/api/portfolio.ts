// lib/api/portfolio.ts
import { gql } from './client';
import type { Artwork } from './types';

export async function fetchOwnedArtworks(ownerAddress: string): Promise<Artwork[]> {
  const data = await gql<{ artworks: { items: Artwork[] } }>(
    `query Owned($owner: String!) {
      artworks(where: { current_owner: $owner }, orderBy: "minted_at", orderDirection: "desc") {
        items {
          id object_addr collection_id edition_no title content_hash
          image_uri metadata_uri royalty_bps creator_addr current_owner minted_at
        }
      }
    }`,
    { owner: ownerAddress },
  );
  return data.artworks.items;
}
