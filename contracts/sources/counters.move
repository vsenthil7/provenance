/// Monotonic ID counters for collections, artworks, listings, auctions, offers.
///
/// Stored as a singleton at @provenance. Initialised once on publish via
/// `init_module`. All friend-only.
module provenance::counters {
    use aptos_framework::account;

    friend provenance::collection;
    friend provenance::artwork;
    friend provenance::market;
    friend provenance::auction;

    struct Counters has key {
        next_collection: u64,
        next_artwork: u64,
        next_listing: u64,
        next_offer: u64,
        next_auction: u64,
    }

    fun init_module(deployer: &signer) {
        move_to(deployer, Counters {
            next_collection: 1,
            next_artwork: 1,
            next_listing: 1,
            next_offer: 1,
            next_auction: 1,
        });
    }

    public(friend) fun next_collection_id(): u64 acquires Counters {
        let c = borrow_global_mut<Counters>(@provenance);
        let id = c.next_collection;
        c.next_collection = id + 1;
        id
    }

    public(friend) fun next_artwork_id(): u64 acquires Counters {
        let c = borrow_global_mut<Counters>(@provenance);
        let id = c.next_artwork;
        c.next_artwork = id + 1;
        id
    }

    public(friend) fun next_listing_id(): u64 acquires Counters {
        let c = borrow_global_mut<Counters>(@provenance);
        let id = c.next_listing;
        c.next_listing = id + 1;
        id
    }

    public(friend) fun next_offer_id(): u64 acquires Counters {
        let c = borrow_global_mut<Counters>(@provenance);
        let id = c.next_offer;
        c.next_offer = id + 1;
        id
    }

    public(friend) fun next_auction_id(): u64 acquires Counters {
        let c = borrow_global_mut<Counters>(@provenance);
        let id = c.next_auction;
        c.next_auction = id + 1;
        id
    }

    #[test_only]
    public fun init_for_test(deployer: &signer) {
        init_module(deployer)
    }
}
