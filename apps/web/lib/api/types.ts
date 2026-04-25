// lib/api/types.ts
// Shape of data returned by the indexer GraphQL. Mirrors DATA_MODEL.md §2
// but trimmed to what the UI consumes.

export interface Collection {
  id: string;
  object_addr: string;
  name: string;
  symbol: string;
  artist_addr: string;
  artist_username?: string | null;
  default_royalty_bps: number;
  minted: number;
  supply_cap: number | null;
  metadata_uri: string;
  frozen: boolean;
  created_at: string;
}

export interface Artwork {
  id: string;
  object_addr: string;
  collection_id: string;
  edition_no: number;
  title: string;
  content_hash: string;
  image_uri: string;
  metadata_uri: string | null;
  royalty_bps: number;
  creator_addr: string;
  current_owner: string;
  minted_at: string;
}

export interface Listing {
  id: string;
  object_addr: string;
  artwork: Artwork;
  seller_addr: string;
  price_uinit: string; // bigint serialised as string
  expires_at: string | null;
  status: 'active' | 'sold' | 'cancelled' | 'expired';
  created_at: string;
}

export interface Bid {
  id: string;
  bidder_addr: string;
  bidder_username: string | null;
  amount_uinit: string;
  placed_at: string;
}

export interface Auction {
  id: string;
  object_addr: string;
  artwork: Artwork;
  seller_addr: string;
  reserve_uinit: string;
  current_bid_uinit: string;
  current_bidder: string | null;
  min_increment_bps: number;
  ends_at: string;
  extension_secs: number;
  status: 'live' | 'finalized' | 'no_bids';
  recent_bids?: Bid[];
}

export interface Settlement {
  artwork_id: string;
  source: 'listing' | 'auction' | 'offer';
  source_id: string;
  buyer: string;
  seller: string;
  gross_uinit: string;
  royalty_uinit: string;
  protocol_fee_uinit: string;
  seller_net_uinit: string;
  artist_addr: string;
  ts: string;
}
