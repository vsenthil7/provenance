// lib/api/listing.ts
import { gql } from './client';
import type { Listing } from './types';

export async function fetchListing(id: string): Promise<Listing | null> {
  const data = await gql<{ listing: Listing | null }>(
    `query L($id: String!) {
      listing(id: $id) {
        id object_addr seller_addr price_uinit expires_at status created_at
        artwork {
          id object_addr title image_uri royalty_bps creator_addr current_owner edition_no
        }
      }
    }`,
    { id },
  );
  return data.listing;
}
