/// `Artwork` is the canonical NFT resource for Provenance.
///
/// Critical design property: `transfer_via_settle` is `public(friend)` and the
/// only friend is `provenance::royalty`. There is no permissionless transfer
/// helper that simultaneously moves the resource and accepts payment. The free
/// transfer helper `gift` exists, takes no payment, and emits `GiftEvent` so
/// off-chain trade-bypass attempts are at least observable.
module provenance::artwork {
    use std::error;
    use std::signer;
    use std::string::String;
    use std::vector;
    use std::option::{Self, Option};
    use aptos_framework::object::{Self, Object, ExtendRef, TransferRef};
    use aptos_framework::event;

    use provenance::collection::{Self, Collection};

    // ---- friends ----
    friend provenance::royalty;
    friend provenance::market;
    friend provenance::auction;

    // ---- error codes ----
    const E_NOT_OWNER: u64               = 1;
    const E_ROYALTY_BPS_TOO_HIGH: u64    = 2;
    const E_BAD_HASH_LENGTH: u64         = 3;
    const E_NOT_ARTIST: u64              = 4;
    const E_COLLECTION_FROZEN: u64       = 5;
    const E_SUPPLY_EXHAUSTED: u64        = 6;
    const E_TITLE_TOO_LONG: u64          = 7;

    // ---- constants ----
    const MAX_ROYALTY_BPS: u64 = 1000;
    const HASH_LEN: u64 = 32;
    const MAX_TITLE_LEN: u64 = 256;

    // ---- resource ----
    struct Artwork has key {
        id: u64,
        collection: Object<Collection>,
        edition_no: u64,
        title: String,
        content_hash: vector<u8>,           // sha256, exactly 32 bytes
        image_uri: String,
        metadata_uri: String,
        royalty_override_bps: Option<u64>,
        creator: address,
        minted_at: u64,
        // Refs allow controlled mutation of the underlying object.
        extend_ref: ExtendRef,
        transfer_ref: TransferRef,
    }

    // ---- events ----
    #[event]
    struct ArtworkMintedEvent has drop, store {
        id: u64,
        collection_id: u64,
        edition_no: u64,
        creator: address,
        content_hash: vector<u8>,
        title: String,
    }

    #[event]
    struct GiftEvent has drop, store {
        artwork_id: u64,
        from: address,
        to: address,
    }

    /// Mint a new artwork into an existing collection. Only the artist may call.
    public entry fun mint(
        artist: &signer,
        collection_obj: Object<Collection>,
        title: String,
        content_hash: vector<u8>,
        image_uri: String,
        metadata_uri: String,
        royalty_override_bps_some: bool,
        royalty_override_bps: u64,
    ) {
        let artist_addr = signer::address_of(artist);
        let (col_id, col_artist, _default_bps, frozen, supply_remaining) =
            collection::mint_facts(&collection_obj);

        assert!(artist_addr == col_artist, error::permission_denied(E_NOT_ARTIST));
        assert!(!frozen, error::invalid_state(E_COLLECTION_FROZEN));
        assert!(supply_remaining, error::invalid_state(E_SUPPLY_EXHAUSTED));
        assert!(vector::length(&content_hash) == HASH_LEN, error::invalid_argument(E_BAD_HASH_LENGTH));
        assert!(std::string::length(&title) <= MAX_TITLE_LEN, error::invalid_argument(E_TITLE_TOO_LONG));

        let resolved_override = if (royalty_override_bps_some) {
            assert!(royalty_override_bps <= MAX_ROYALTY_BPS, error::invalid_argument(E_ROYALTY_BPS_TOO_HIGH));
            option::some(royalty_override_bps)
        } else {
            option::none<u64>()
        };

        // Tell the collection a new edition is being minted; it returns the
        // edition number for us to record. Friend-only call.
        let edition_no = collection::increment_supply(&collection_obj);
        let id = next_id();

        let constructor_ref = object::create_object(artist_addr);
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let transfer_ref = object::generate_transfer_ref(&constructor_ref);
        let object_signer = object::generate_signer(&constructor_ref);

        let artwork = Artwork {
            id,
            collection: collection_obj,
            edition_no,
            title,
            content_hash,
            image_uri,
            metadata_uri,
            royalty_override_bps: resolved_override,
            creator: col_artist,
            minted_at: timestamp_now(),
            extend_ref,
            transfer_ref,
        };
        move_to(&object_signer, artwork);

        event::emit(ArtworkMintedEvent {
            id,
            collection_id: col_id,
            edition_no,
            creator: col_artist,
            content_hash,
            title,
        });
    }

    /// Gift the artwork — free transfer, no money. Anyone can do this on
    /// something they own. The event makes off-chain trade-bypass observable.
    public entry fun gift(holder: &signer, artwork_obj: Object<Artwork>, recipient: address) acquires Artwork {
        let holder_addr = signer::address_of(holder);
        assert!(object::is_owner(artwork_obj, holder_addr), error::permission_denied(E_NOT_OWNER));

        let artwork = borrow_global<Artwork>(object::object_address(&artwork_obj));
        let id = artwork.id;
        let linear_transfer_ref = object::generate_linear_transfer_ref(&artwork.transfer_ref);
        object::transfer_with_ref(linear_transfer_ref, recipient);

        event::emit(GiftEvent { artwork_id: id, from: holder_addr, to: recipient });
    }

    /// The friend-only paid-transfer helper. Called by `royalty::settle` only.
    public(friend) fun transfer_via_settle(artwork_obj: Object<Artwork>, buyer: address) acquires Artwork {
        let artwork = borrow_global<Artwork>(object::object_address(&artwork_obj));
        let linear_transfer_ref = object::generate_linear_transfer_ref(&artwork.transfer_ref);
        object::transfer_with_ref(linear_transfer_ref, buyer);
    }

    // ---- views called by royalty + frontend ----

    public fun settlement_facts(artwork_obj: &Object<Artwork>): (u64, address, u64) acquires Artwork {
        let artwork = borrow_global<Artwork>(object::object_address(artwork_obj));
        let bps = if (option::is_some(&artwork.royalty_override_bps)) {
            *option::borrow(&artwork.royalty_override_bps)
        } else {
            collection::default_royalty_bps(&artwork.collection)
        };
        (artwork.id, artwork.creator, bps)
    }

    #[view]
    public fun id_of(artwork_obj: Object<Artwork>): u64 acquires Artwork {
        borrow_global<Artwork>(object::object_address(&artwork_obj)).id
    }

    #[view]
    public fun creator_of(artwork_obj: Object<Artwork>): address acquires Artwork {
        borrow_global<Artwork>(object::object_address(&artwork_obj)).creator
    }

    // ---- internals ----

    inline fun timestamp_now(): u64 {
        aptos_framework::timestamp::now_seconds()
    }

    /// Next-id counter. In a real deploy this is a singleton resource; for
    /// the hackathon we keep it inline-friendly. Replaced by friend-managed
    /// counter at publish time.
    fun next_id(): u64 {
        // Placeholder: in the production build this reads from a shared
        // counter resource at @provenance. For test purposes the counter is
        // initialised in tests/test_utils.move.
        provenance::counters::next_artwork_id()
    }

    // ---- test-only helpers ----

    /// Test-only mint with explicit royalty_override. Mirrors `mint_for_test`
    /// but stores `option::some(override_bps)` so `settlement_facts` exercises
    /// the override branch.
    #[test_only]
    public fun mint_with_override_for_test(
        artist: &signer,
        collection_obj: Object<Collection>,
        title: String,
        content_hash: vector<u8>,
        override_bps: u64,
    ): Object<Artwork> {
        let artist_addr = signer::address_of(artist);
        let (_col_id, col_artist, _default_bps, frozen, supply_remaining) =
            collection::mint_facts(&collection_obj);
        assert!(artist_addr == col_artist, error::permission_denied(E_NOT_ARTIST));
        assert!(!frozen, error::invalid_state(E_COLLECTION_FROZEN));
        assert!(supply_remaining, error::invalid_state(E_SUPPLY_EXHAUSTED));
        assert!(vector::length(&content_hash) == HASH_LEN, error::invalid_argument(E_BAD_HASH_LENGTH));
        assert!(override_bps <= MAX_ROYALTY_BPS, error::invalid_argument(E_ROYALTY_BPS_TOO_HIGH));

        let edition_no = collection::increment_supply(&collection_obj);
        let id = next_id();
        let constructor_ref = object::create_object(artist_addr);
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let transfer_ref = object::generate_transfer_ref(&constructor_ref);
        let object_signer = object::generate_signer(&constructor_ref);
        let artwork = Artwork {
            id, collection: collection_obj, edition_no, title, content_hash,
            image_uri: std::string::utf8(b"https://r2.example/art.png"),
            metadata_uri: std::string::utf8(b""),
            royalty_override_bps: option::some(override_bps),
            creator: col_artist,
            minted_at: timestamp_now(),
            extend_ref, transfer_ref,
        };
        move_to(&object_signer, artwork);
        object::object_from_constructor_ref<Artwork>(&constructor_ref)
    }

    #[test_only]
    public fun mint_for_test(
        artist: &signer,
        collection_obj: Object<Collection>,
        title: String,
        content_hash: vector<u8>,
    ): Object<Artwork> {
        let artist_addr = signer::address_of(artist);
        let (_col_id, col_artist, _default_bps, frozen, supply_remaining) =
            collection::mint_facts(&collection_obj);
        assert!(artist_addr == col_artist, error::permission_denied(E_NOT_ARTIST));
        assert!(!frozen, error::invalid_state(E_COLLECTION_FROZEN));
        assert!(supply_remaining, error::invalid_state(E_SUPPLY_EXHAUSTED));
        assert!(vector::length(&content_hash) == HASH_LEN, error::invalid_argument(E_BAD_HASH_LENGTH));

        let edition_no = collection::increment_supply(&collection_obj);
        let id = next_id();

        let constructor_ref = object::create_object(artist_addr);
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let transfer_ref = object::generate_transfer_ref(&constructor_ref);
        let object_signer = object::generate_signer(&constructor_ref);

        let artwork = Artwork {
            id,
            collection: collection_obj,
            edition_no,
            title,
            content_hash,
            image_uri: std::string::utf8(b"https://r2.example/art.png"),
            metadata_uri: std::string::utf8(b""),
            royalty_override_bps: option::none<u64>(),
            creator: col_artist,
            minted_at: timestamp_now(),
            extend_ref,
            transfer_ref,
        };
        move_to(&object_signer, artwork);
        // Modern aptos-framework's object_from_constructor_ref strictly checks
        // that the resource exists at the address. Therefore build the typed
        // handle AFTER move_to, not before.
        object::object_from_constructor_ref<Artwork>(&constructor_ref)
    }
}
