import { onchainTable, primaryKey, index } from '@ponder/core';

export const collections = onchainTable(
  'collections',
  (t) => ({
    id: t.bigint().primaryKey(),
    objectAddr: t.text().notNull().unique(),
    artistAddr: t.text().notNull(),
    artistUsername: t.text(),
    name: t.text().notNull(),
    symbol: t.text().notNull(),
    defaultRoyaltyBps: t.integer().notNull(),
    supplyCap: t.bigint(),
    minted: t.bigint().notNull().default(0n),
    metadataUri: t.text().notNull(),
    frozen: t.boolean().notNull().default(false),
    createdAt: t.bigint().notNull(),
    blockHeight: t.bigint().notNull(),
    txHash: t.text().notNull(),
  }),
  (t) => ({
    artistIdx: index().on(t.artistAddr),
    createdAtIdx: index().on(t.createdAt),
  }),
);

export const artworks = onchainTable(
  'artworks',
  (t) => ({
    id: t.bigint().primaryKey(),
    objectAddr: t.text().notNull().unique(),
    collectionId: t.bigint().notNull(),
    editionNo: t.bigint().notNull(),
    title: t.text().notNull(),
    contentHash: t.text().notNull(), // hex
    imageUri: t.text().notNull(),
    metadataUri: t.text(),
    royaltyBps: t.integer().notNull(),
    creatorAddr: t.text().notNull(),
    currentOwner: t.text().notNull(),
    mintedAt: t.bigint().notNull(),
    blockHeight: t.bigint().notNull(),
    txHash: t.text().notNull(),
  }),
  (t) => ({
    collectionIdx: index().on(t.collectionId),
    creatorIdx: index().on(t.creatorAddr),
    ownerIdx: index().on(t.currentOwner),
    mintedAtIdx: index().on(t.mintedAt),
  }),
);

export const listings = onchainTable(
  'listings',
  (t) => ({
    id: t.bigint().primaryKey(),
    objectAddr: t.text().notNull().unique(),
    artworkId: t.bigint().notNull(),
    sellerAddr: t.text().notNull(),
    priceUinit: t.bigint().notNull(),
    expiresAt: t.bigint(),
    status: t.text().notNull(), // active | sold | cancelled | expired
    createdAt: t.bigint().notNull(),
    closedAt: t.bigint(),
    blockHeight: t.bigint().notNull(),
    txHash: t.text().notNull(),
  }),
  (t) => ({
    artworkActiveIdx: index().on(t.artworkId, t.status),
    statusCreatedIdx: index().on(t.status, t.createdAt),
  }),
);

export const auctions = onchainTable(
  'auctions',
  (t) => ({
    id: t.bigint().primaryKey(),
    objectAddr: t.text().notNull().unique(),
    artworkId: t.bigint().notNull(),
    sellerAddr: t.text().notNull(),
    reserveUinit: t.bigint().notNull(),
    currentBidUinit: t.bigint().notNull().default(0n),
    currentBidder: t.text(),
    minIncrementBps: t.integer().notNull(),
    endsAt: t.bigint().notNull(),
    extensionSecs: t.integer().notNull(),
    status: t.text().notNull(), // live | finalized | no_bids
    createdAt: t.bigint().notNull(),
    finalizedAt: t.bigint(),
    blockHeight: t.bigint().notNull(),
    txHash: t.text().notNull(),
  }),
  (t) => ({
    statusEndsIdx: index().on(t.status, t.endsAt),
  }),
);

export const bids = onchainTable(
  'bids',
  (t) => ({
    id: t.bigint().primaryKey(),
    auctionId: t.bigint().notNull(),
    bidderAddr: t.text().notNull(),
    bidderUsername: t.text(),
    amountUinit: t.bigint().notNull(),
    placedAt: t.bigint().notNull(),
    blockHeight: t.bigint().notNull(),
    txHash: t.text().notNull(),
  }),
  (t) => ({
    auctionIdx: index().on(t.auctionId, t.placedAt),
  }),
);

export const offers = onchainTable(
  'offers',
  (t) => ({
    id: t.bigint().primaryKey(),
    objectAddr: t.text().notNull().unique(),
    artworkId: t.bigint().notNull(),
    bidderAddr: t.text().notNull(),
    priceUinit: t.bigint().notNull(),
    expiresAt: t.bigint(),
    status: t.text().notNull(), // open | accepted | cancelled | expired
    createdAt: t.bigint().notNull(),
    closedAt: t.bigint(),
    blockHeight: t.bigint().notNull(),
    txHash: t.text().notNull(),
  }),
  (t) => ({
    artworkOpenIdx: index().on(t.artworkId, t.status),
  }),
);

export const settlements = onchainTable(
  'settlements',
  (t) => ({
    id: t.bigint().primaryKey(),
    artworkId: t.bigint().notNull(),
    source: t.text().notNull(), // listing | auction | offer
    sourceId: t.bigint().notNull(),
    buyerAddr: t.text().notNull(),
    sellerAddr: t.text().notNull(),
    artistAddr: t.text().notNull(),
    grossUinit: t.bigint().notNull(),
    royaltyUinit: t.bigint().notNull(),
    protocolFeeUinit: t.bigint().notNull(),
    sellerNetUinit: t.bigint().notNull(),
    settledAt: t.bigint().notNull(),
    blockHeight: t.bigint().notNull(),
    txHash: t.text().notNull(),
  }),
  (t) => ({
    artistIdx: index().on(t.artistAddr, t.settledAt),
  }),
);

export const transfers = onchainTable(
  'transfers',
  (t) => ({
    id: t.text().primaryKey(), // tx_hash:event_index
    artworkId: t.bigint().notNull(),
    fromAddr: t.text().notNull(),
    toAddr: t.text().notNull(),
    kind: t.text().notNull(), // gift | settle
    occurredAt: t.bigint().notNull(),
    blockHeight: t.bigint().notNull(),
    txHash: t.text().notNull(),
  }),
  (t) => ({
    artworkIdx: index().on(t.artworkId, t.occurredAt),
  }),
);

export const indexerState = onchainTable('indexer_state', (t) => ({
  id: t.integer().primaryKey(),
  lastHeight: t.bigint().notNull().default(0n),
}));
