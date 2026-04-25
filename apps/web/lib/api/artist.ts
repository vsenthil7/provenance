// lib/api/artist.ts
import { gql } from './client';
import type { Collection } from './types';

const Q = `
  query ArtistCollections($artist: String!) {
    collections(where: { artist_addr: $artist }, orderBy: "created_at", orderDirection: "desc") {
      items { id object_addr name symbol default_royalty_bps minted supply_cap metadata_uri }
    }
  }
`;

export async function fetchArtistCollections(artistAddress: string): Promise<Collection[]> {
  const data = await gql<{ collections: { items: Collection[] } }>(Q, { artist: artistAddress });
  return data.collections.items;
}
