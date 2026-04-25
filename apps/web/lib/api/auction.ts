// lib/api/auction.ts
import { gql } from './client';
import type { Auction } from './types';

export async function fetchAuction(id: string): Promise<Auction | null> {
  const data = await gql<{ auction: Auction | null }>(
    `query A($id: String!) {
      auction(id: $id) {
        id object_addr seller_addr reserve_uinit current_bid_uinit current_bidder
        min_increment_bps ends_at extension_secs status
        artwork { id object_addr title image_uri royalty_bps creator_addr current_owner edition_no }
        recent_bids: bids(limit: 20, orderBy: "placed_at", orderDirection: "desc") {
          id bidder_addr bidder_username amount_uinit placed_at
        }
      }
    }`,
    { id },
  );
  return data.auction;
}
