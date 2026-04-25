// lib/api/collection.ts
import { gql } from './client';
import type { Collection, Artwork } from './types';

export async function fetchCollection(id: string): Promise<Collection | null> {
  const data = await gql<{ collection: Collection | null }>(
    `query Col($id: String!) {
      collection(id: $id) {
        id object_addr name symbol artist_addr artist_username
        default_royalty_bps minted supply_cap metadata_uri frozen created_at
      }
    }`,
    { id },
  );
  return data.collection;
}

export async function fetchCollectionArtworks(collectionId: string): Promise<Artwork[]> {
  const data = await gql<{ artworks: { items: Artwork[] } }>(
    `query Arts($cid: String!) {
      artworks(where: { collection_id: $cid }, orderBy: "edition_no") {
        items {
          id object_addr collection_id edition_no title content_hash
          image_uri metadata_uri royalty_bps creator_addr current_owner minted_at
        }
      }
    }`,
    { cid: collectionId },
  );
  return data.artworks.items;
}
