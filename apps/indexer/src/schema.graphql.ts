/**
 * GraphQL schema for the read API consumed by the frontend.
 *
 * Implementation: Ponder generates a default GraphQL API from the schema in
 * ponder.schema.ts. We add custom resolvers for the queries the frontend
 * actually uses (liveDrops, portfolio, royaltyEarnings).
 */

export const TYPE_DEFS = `
  scalar BigInt

  type Query {
    liveDrops(limit: Int = 12): [Drop!]!
    portfolio(owner: String!): [Holding!]!
    artistEarnings(artistAddr: String!): [SettlementSummary!]!
    auction(id: BigInt!): Auction
    listing(id: BigInt!): Listing
    artwork(id: BigInt!): Artwork
    collection(id: BigInt!): Collection
    health: Health!
  }

  type Drop {
    id: BigInt!
    title: String!
    artistAddress: String!
    artistUsername: String
    imageUri: String!
    priceUinit: BigInt!
    href: String!
  }

  type Holding {
    artworkId: BigInt!
    objectAddr: String!
    title: String!
    imageUri: String!
    collectionName: String!
    creatorAddr: String!
    creatorUsername: String
    royaltyBps: Int!
  }

  type SettlementSummary {
    artworkId: BigInt!
    grossUinit: BigInt!
    royaltyUinit: BigInt!
    settledAt: BigInt!
    source: String!
  }

  type Auction {
    id: BigInt!
    objectAddr: String!
    artworkId: BigInt!
    sellerAddr: String!
    reserveUinit: BigInt!
    currentBidUinit: BigInt!
    currentBidder: String
    minIncrementBps: Int!
    endsAt: BigInt!
    extensionSecs: Int!
    status: String!
    bids: [Bid!]!
  }

  type Bid {
    bidderAddr: String!
    bidderUsername: String
    amountUinit: BigInt!
    placedAt: BigInt!
    txHash: String!
  }

  type Listing {
    id: BigInt!
    artworkId: BigInt!
    sellerAddr: String!
    priceUinit: BigInt!
    expiresAt: BigInt
    status: String!
  }

  type Artwork {
    id: BigInt!
    objectAddr: String!
    title: String!
    imageUri: String!
    contentHash: String!
    royaltyBps: Int!
    creatorAddr: String!
    currentOwner: String!
    collection: Collection!
    transfers: [Transfer!]!
  }

  type Transfer {
    fromAddr: String!
    toAddr: String!
    kind: String!     # 'gift' | 'settle'
    occurredAt: BigInt!
    txHash: String!
  }

  type Collection {
    id: BigInt!
    name: String!
    symbol: String!
    artistAddr: String!
    artistUsername: String
    defaultRoyaltyBps: Int!
    supplyCap: BigInt
    minted: BigInt!
    metadataUri: String!
    frozen: Boolean!
  }

  type Health {
    indexerLagBlocks: BigInt!
    lastIndexedHeight: BigInt!
    lastChainHeight: BigInt!
  }
`;
