-- 0001_init.sql
-- Provenance indexer schema. Mirrors apps/indexer/ponder.schema.ts and
-- docs/DATA_MODEL.md §2.
--
-- Run with: psql "$DATABASE_URL" < migrations/0001_init.sql
-- Idempotent: re-running is a no-op.

CREATE TABLE IF NOT EXISTS collections (
  id                  BIGINT PRIMARY KEY,
  object_addr         TEXT NOT NULL UNIQUE,
  artist_addr         TEXT NOT NULL,
  artist_username     TEXT,
  name                TEXT NOT NULL,
  symbol              TEXT NOT NULL,
  default_royalty_bps INTEGER NOT NULL CHECK (default_royalty_bps BETWEEN 0 AND 1000),
  supply_cap          BIGINT,
  minted              BIGINT NOT NULL DEFAULT 0,
  metadata_uri        TEXT NOT NULL,
  frozen              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          BIGINT NOT NULL,
  block_height        BIGINT NOT NULL,
  tx_hash             TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS collections_artist_addr_idx ON collections (artist_addr);
CREATE INDEX IF NOT EXISTS collections_artist_username_idx ON collections (artist_username) WHERE artist_username IS NOT NULL;
CREATE INDEX IF NOT EXISTS collections_created_at_idx ON collections (created_at DESC);

CREATE TABLE IF NOT EXISTS artworks (
  id            BIGINT PRIMARY KEY,
  object_addr   TEXT NOT NULL UNIQUE,
  collection_id BIGINT NOT NULL REFERENCES collections(id),
  edition_no    BIGINT NOT NULL,
  title         TEXT NOT NULL,
  content_hash  TEXT NOT NULL,
  image_uri     TEXT NOT NULL,
  metadata_uri  TEXT,
  royalty_bps   INTEGER NOT NULL,
  creator_addr  TEXT NOT NULL,
  current_owner TEXT NOT NULL,
  minted_at     BIGINT NOT NULL,
  block_height  BIGINT NOT NULL,
  tx_hash       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS artworks_collection_id_idx ON artworks (collection_id);
CREATE INDEX IF NOT EXISTS artworks_creator_addr_idx ON artworks (creator_addr);
CREATE INDEX IF NOT EXISTS artworks_current_owner_idx ON artworks (current_owner);
CREATE INDEX IF NOT EXISTS artworks_minted_at_idx ON artworks (minted_at DESC);

CREATE TABLE IF NOT EXISTS listings (
  id            BIGINT PRIMARY KEY,
  object_addr   TEXT NOT NULL UNIQUE,
  artwork_id    BIGINT NOT NULL REFERENCES artworks(id),
  seller_addr   TEXT NOT NULL,
  price_uinit   BIGINT NOT NULL,
  expires_at    BIGINT,
  status        TEXT NOT NULL CHECK (status IN ('active','sold','cancelled','expired')),
  created_at    BIGINT NOT NULL,
  closed_at     BIGINT,
  block_height  BIGINT NOT NULL,
  tx_hash       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS listings_artwork_active_idx ON listings (artwork_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS listings_status_created_idx ON listings (status, created_at DESC);

CREATE TABLE IF NOT EXISTS auctions (
  id                BIGINT PRIMARY KEY,
  object_addr       TEXT NOT NULL UNIQUE,
  artwork_id        BIGINT NOT NULL REFERENCES artworks(id),
  seller_addr       TEXT NOT NULL,
  reserve_uinit     BIGINT NOT NULL,
  current_bid_uinit BIGINT NOT NULL DEFAULT 0,
  current_bidder    TEXT,
  min_increment_bps INTEGER NOT NULL,
  ends_at           BIGINT NOT NULL,
  extension_secs    INTEGER NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('live','finalized','no_bids')),
  created_at        BIGINT NOT NULL,
  finalized_at      BIGINT,
  block_height      BIGINT NOT NULL,
  tx_hash           TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS auctions_status_ends_idx ON auctions (status, ends_at);

CREATE TABLE IF NOT EXISTS bids (
  id              BIGSERIAL PRIMARY KEY,
  auction_id      BIGINT NOT NULL REFERENCES auctions(id),
  bidder_addr     TEXT NOT NULL,
  bidder_username TEXT,
  amount_uinit    BIGINT NOT NULL,
  placed_at       BIGINT NOT NULL,
  block_height    BIGINT NOT NULL,
  tx_hash         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS bids_auction_idx ON bids (auction_id, placed_at);

CREATE TABLE IF NOT EXISTS offers (
  id            BIGINT PRIMARY KEY,
  object_addr   TEXT NOT NULL UNIQUE,
  artwork_id    BIGINT NOT NULL REFERENCES artworks(id),
  bidder_addr   TEXT NOT NULL,
  price_uinit   BIGINT NOT NULL,
  expires_at    BIGINT,
  status        TEXT NOT NULL CHECK (status IN ('open','accepted','cancelled','expired')),
  created_at    BIGINT NOT NULL,
  closed_at     BIGINT,
  block_height  BIGINT NOT NULL,
  tx_hash       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS offers_artwork_open_idx ON offers (artwork_id, status);

CREATE TABLE IF NOT EXISTS settlements (
  id                 BIGSERIAL PRIMARY KEY,
  artwork_id         BIGINT NOT NULL REFERENCES artworks(id),
  source             TEXT NOT NULL CHECK (source IN ('listing','auction','offer')),
  source_id          BIGINT NOT NULL,
  buyer_addr         TEXT NOT NULL,
  seller_addr        TEXT NOT NULL,
  artist_addr        TEXT NOT NULL,
  gross_uinit        BIGINT NOT NULL,
  royalty_uinit      BIGINT NOT NULL,
  protocol_fee_uinit BIGINT NOT NULL,
  seller_net_uinit   BIGINT NOT NULL,
  settled_at         BIGINT NOT NULL,
  block_height       BIGINT NOT NULL,
  tx_hash            TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS settlements_artist_idx ON settlements (artist_addr, settled_at);

CREATE TABLE IF NOT EXISTS transfers (
  id            TEXT PRIMARY KEY,                   -- tx_hash:event_index
  artwork_id    BIGINT NOT NULL REFERENCES artworks(id),
  from_addr     TEXT NOT NULL,
  to_addr       TEXT NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('gift','settle')),
  occurred_at   BIGINT NOT NULL,
  block_height  BIGINT NOT NULL,
  tx_hash       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS transfers_artwork_idx ON transfers (artwork_id, occurred_at);

CREATE TABLE IF NOT EXISTS indexer_state (
  id          INTEGER PRIMARY KEY,
  last_height BIGINT NOT NULL DEFAULT 0
);
INSERT INTO indexer_state (id, last_height) VALUES (1, 0)
  ON CONFLICT (id) DO NOTHING;
