/// Collections group artworks under a shared royalty default and supply cap.
///
/// Only the artist who created a collection may mint into it (enforced by
/// `provenance::artwork::mint`). Once `frozen`, no further mints are accepted.
module provenance::collection {
    use std::error;
    use std::signer;
    use std::string::String;
    use std::option::{Self, Option};
    use aptos_framework::object::{Self, Object, ExtendRef};
    use aptos_framework::event;

    friend provenance::artwork;

    // ---- error codes ----
    const E_ROYALTY_BPS_TOO_HIGH: u64 = 1;
    const E_NOT_ARTIST: u64           = 2;
    const E_FROZEN: u64               = 3;
    const E_NOT_MUTABLE: u64          = 4;
    const E_SUPPLY_EXHAUSTED: u64     = 5;
    const E_SYMBOL_TOO_LONG: u64      = 6;

    const MAX_ROYALTY_BPS: u64 = 1000;
    const MAX_SYMBOL_LEN: u64  = 8;

    struct Collection has key {
        id: u64,
        name: String,
        symbol: String,
        artist_addr: address,
        default_royalty_bps: u64,
        supply_cap: Option<u64>,
        minted: u64,
        metadata_uri: String,
        mutable_metadata: bool,
        created_at: u64,
        frozen: bool,
        extend_ref: ExtendRef,
    }

    #[event]
    struct CollectionCreatedEvent has drop, store {
        id: u64,
        artist_addr: address,
        name: String,
        symbol: String,
        default_royalty_bps: u64,
        supply_cap: Option<u64>,
    }

    #[event]
    struct CollectionFrozenEvent has drop, store {
        id: u64,
        artist_addr: address,
    }

    public entry fun create_collection(
        artist: &signer,
        name: String,
        symbol: String,
        default_royalty_bps: u64,
        supply_cap_some: bool,
        supply_cap: u64,
        metadata_uri: String,
        mutable_metadata: bool,
    ) {
        assert!(default_royalty_bps <= MAX_ROYALTY_BPS, error::invalid_argument(E_ROYALTY_BPS_TOO_HIGH));
        assert!(std::string::length(&symbol) <= MAX_SYMBOL_LEN, error::invalid_argument(E_SYMBOL_TOO_LONG));

        let artist_addr = signer::address_of(artist);
        let id = provenance::counters::next_collection_id();

        let cap = if (supply_cap_some) { option::some(supply_cap) } else { option::none<u64>() };

        let constructor_ref = object::create_object(artist_addr);
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let object_signer = object::generate_signer(&constructor_ref);

        let collection = Collection {
            id,
            name,
            symbol,
            artist_addr,
            default_royalty_bps,
            supply_cap: cap,
            minted: 0,
            metadata_uri,
            mutable_metadata,
            created_at: aptos_framework::timestamp::now_seconds(),
            frozen: false,
            extend_ref,
        };
        move_to(&object_signer, collection);

        event::emit(CollectionCreatedEvent {
            id, artist_addr, name, symbol, default_royalty_bps, supply_cap: cap,
        });
    }

    public entry fun freeze_collection(artist: &signer, collection_obj: Object<Collection>) acquires Collection {
        let collection = borrow_global_mut<Collection>(object::object_address(&collection_obj));
        assert!(signer::address_of(artist) == collection.artist_addr, error::permission_denied(E_NOT_ARTIST));
        collection.frozen = true;
        event::emit(CollectionFrozenEvent { id: collection.id, artist_addr: collection.artist_addr });
    }

    public entry fun set_metadata_uri(artist: &signer, collection_obj: Object<Collection>, new_uri: String) acquires Collection {
        let collection = borrow_global_mut<Collection>(object::object_address(&collection_obj));
        assert!(signer::address_of(artist) == collection.artist_addr, error::permission_denied(E_NOT_ARTIST));
        assert!(collection.mutable_metadata, error::invalid_state(E_NOT_MUTABLE));
        collection.metadata_uri = new_uri;
    }

    /// Friend-only — used by `provenance::artwork::mint` to read mint
    /// preconditions in one borrow.
    public(friend) fun mint_facts(collection_obj: &Object<Collection>): (u64, address, u64, bool, bool) acquires Collection {
        let collection = borrow_global<Collection>(object::object_address(collection_obj));
        let supply_remaining = if (option::is_some(&collection.supply_cap)) {
            collection.minted < *option::borrow(&collection.supply_cap)
        } else {
            true
        };
        (collection.id, collection.artist_addr, collection.default_royalty_bps, collection.frozen, supply_remaining)
    }

    /// Friend-only — increments minted counter, returns the new edition number.
    public(friend) fun increment_supply(collection_obj: &Object<Collection>): u64 acquires Collection {
        let collection = borrow_global_mut<Collection>(object::object_address(collection_obj));
        assert!(!collection.frozen, error::invalid_state(E_FROZEN));
        if (option::is_some(&collection.supply_cap)) {
            assert!(
                collection.minted < *option::borrow(&collection.supply_cap),
                error::invalid_state(E_SUPPLY_EXHAUSTED),
            );
        };
        collection.minted = collection.minted + 1;
        collection.minted
    }

    public(friend) fun default_royalty_bps(collection_obj: &Object<Collection>): u64 acquires Collection {
        borrow_global<Collection>(object::object_address(collection_obj)).default_royalty_bps
    }

    #[view]
    public fun artist_of(collection_obj: Object<Collection>): address acquires Collection {
        borrow_global<Collection>(object::object_address(&collection_obj)).artist_addr
    }

    #[view]
    public fun is_frozen(collection_obj: Object<Collection>): bool acquires Collection {
        borrow_global<Collection>(object::object_address(&collection_obj)).frozen
    }

    // ---- test-only ----

    #[test_only]
    /// Test-only constructor that returns the Object<Collection> handle directly
    /// instead of requiring callers to scrape it from the event stream.
    public fun create_collection_for_test(
        artist: &signer,
        default_royalty_bps: u64,
    ): Object<Collection> {
        assert!(default_royalty_bps <= MAX_ROYALTY_BPS, error::invalid_argument(E_ROYALTY_BPS_TOO_HIGH));
        let artist_addr = signer::address_of(artist);
        let id = provenance::counters::next_collection_id();

        let constructor_ref = object::create_object(artist_addr);
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let object_signer = object::generate_signer(&constructor_ref);
        let obj = object::object_from_constructor_ref<Collection>(&constructor_ref);

        let collection = Collection {
            id,
            name: std::string::utf8(b"Test Collection"),
            symbol: std::string::utf8(b"TEST"),
            artist_addr,
            default_royalty_bps,
            supply_cap: option::none<u64>(),
            minted: 0,
            metadata_uri: std::string::utf8(b"https://r2.example/col.json"),
            mutable_metadata: false,
            created_at: aptos_framework::timestamp::now_seconds(),
            frozen: false,
            extend_ref,
        };
        move_to(&object_signer, collection);

        event::emit(CollectionCreatedEvent {
            id, artist_addr,
            name: std::string::utf8(b"Test Collection"),
            symbol: std::string::utf8(b"TEST"),
            default_royalty_bps,
            supply_cap: option::none<u64>(),
        });
        obj
    }
}
