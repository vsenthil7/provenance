/// Fixed-price listings and offers.
///
/// Both paid paths (`buy_now`, `accept_offer`) route through
/// `royalty::settle`. There is no other way to take payment for an artwork in
/// this module.
module provenance::market {
    use std::error;
    use std::signer;
    use std::option;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::object::{Self, Object, ExtendRef};
    use aptos_framework::event;
    use aptos_framework::timestamp;

    use provenance::artwork::{Self, Artwork};
    use provenance::royalty;

    // ---- friends (auction can use the listing utility helpers) ----
    friend provenance::auction;

    // ---- error codes ----
    const E_NOT_OWNER: u64           = 1;
    const E_NOT_SELLER: u64          = 2;
    const E_LISTING_INACTIVE: u64    = 3;
    const E_LISTING_EXPIRED: u64     = 4;
    const E_LISTING_STALE: u64       = 5;   // seller transferred away after listing
    const E_PRICE_MUST_BE_POSITIVE: u64 = 6;
    const E_INSUFFICIENT_PAYMENT: u64 = 7;
    const E_OFFER_EXPIRED: u64       = 8;
    const E_NOT_BIDDER: u64          = 9;

    const SOURCE_LISTING: u8 = 1;
    const SOURCE_OFFER: u8   = 3;

    struct Listing has key {
        id: u64,
        artwork: Object<Artwork>,
        seller: address,
        price_uinit: u64,
        expires_at: u64,                // 0 = no expiry
        active: bool,
        created_at: u64,
        extend_ref: ExtendRef,
    }

    struct Offer has key {
        id: u64,
        artwork: Object<Artwork>,
        bidder: address,
        price_uinit: u64,
        expires_at: u64,
        escrow: Coin<AptosCoin>,
        extend_ref: ExtendRef,
    }

    #[event] struct ListingCreatedEvent has drop, store {
        id: u64, artwork_id: u64, seller: address, price_uinit: u64, expires_at: u64,
    }
    #[event] struct ListingCancelledEvent has drop, store { id: u64 }
    #[event] struct BuyExecutedEvent has drop, store { listing_id: u64, buyer: address }
    #[event] struct OfferCreatedEvent has drop, store {
        id: u64, artwork_id: u64, bidder: address, price_uinit: u64, expires_at: u64,
    }
    #[event] struct OfferAcceptedEvent has drop, store { id: u64 }
    #[event] struct OfferCancelledEvent has drop, store { id: u64 }

    // ----------------------- listings -----------------------

    public entry fun list_fixed(
        seller: &signer,
        artwork_obj: Object<Artwork>,
        price_uinit: u64,
        expires_at: u64,
    ) {
        assert!(price_uinit > 0, error::invalid_argument(E_PRICE_MUST_BE_POSITIVE));
        let seller_addr = signer::address_of(seller);
        assert!(object::is_owner(artwork_obj, seller_addr), error::permission_denied(E_NOT_OWNER));

        let id = provenance::counters::next_listing_id();
        let constructor_ref = object::create_object(seller_addr);
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let object_signer = object::generate_signer(&constructor_ref);

        move_to(&object_signer, Listing {
            id,
            artwork: artwork_obj,
            seller: seller_addr,
            price_uinit,
            expires_at,
            active: true,
            created_at: timestamp::now_seconds(),
            extend_ref,
        });

        let artwork_id = artwork::id_of(artwork_obj);
        event::emit(ListingCreatedEvent { id, artwork_id, seller: seller_addr, price_uinit, expires_at });
    }

    public entry fun cancel_listing(seller: &signer, listing_obj: Object<Listing>) acquires Listing {
        let listing = borrow_global_mut<Listing>(object::object_address(&listing_obj));
        assert!(listing.active, error::invalid_state(E_LISTING_INACTIVE));
        assert!(signer::address_of(seller) == listing.seller, error::permission_denied(E_NOT_SELLER));
        listing.active = false;
        event::emit(ListingCancelledEvent { id: listing.id });
    }

    public entry fun buy_now(buyer: &signer, listing_obj: Object<Listing>, payment: Coin<AptosCoin>) acquires Listing {
        let listing = borrow_global_mut<Listing>(object::object_address(&listing_obj));
        assert!(listing.active, error::invalid_state(E_LISTING_INACTIVE));
        if (listing.expires_at > 0) {
            assert!(timestamp::now_seconds() < listing.expires_at, error::invalid_state(E_LISTING_EXPIRED));
        };
        assert!(coin::value(&payment) >= listing.price_uinit, error::invalid_argument(E_INSUFFICIENT_PAYMENT));

        // Re-check ownership: seller may have gifted the artwork after listing.
        // Move's resource model means the listing object survives, but the buy
        // must fail rather than silently transfer something the seller no longer owns.
        assert!(object::is_owner(listing.artwork, listing.seller), error::invalid_state(E_LISTING_STALE));

        let buyer_addr = signer::address_of(buyer);
        let artwork = listing.artwork;
        let seller = listing.seller;
        let listing_id = listing.id;

        listing.active = false;

        // If the buyer overpaid (e.g. they passed a coin worth > price), refund
        // the surplus before settle.
        let surplus = coin::value(&payment) - listing.price_uinit;
        if (surplus > 0) {
            let refund = coin::extract(&mut payment, surplus);
            coin::deposit<AptosCoin>(buyer_addr, refund);
        };

        royalty::settle(buyer_addr, seller, artwork, payment, SOURCE_LISTING, listing_id);
        event::emit(BuyExecutedEvent { listing_id, buyer: buyer_addr });
    }

    // ----------------------- offers -----------------------

    public entry fun make_offer(
        bidder: &signer,
        artwork_obj: Object<Artwork>,
        price_uinit: u64,
        expires_at: u64,
        escrow: Coin<AptosCoin>,
    ) {
        assert!(price_uinit > 0, error::invalid_argument(E_PRICE_MUST_BE_POSITIVE));
        assert!(coin::value(&escrow) >= price_uinit, error::invalid_argument(E_INSUFFICIENT_PAYMENT));
        let bidder_addr = signer::address_of(bidder);

        let id = provenance::counters::next_offer_id();
        let constructor_ref = object::create_object(bidder_addr);
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let object_signer = object::generate_signer(&constructor_ref);

        let artwork_id = artwork::id_of(artwork_obj);

        move_to(&object_signer, Offer {
            id,
            artwork: artwork_obj,
            bidder: bidder_addr,
            price_uinit,
            expires_at,
            escrow,
            extend_ref,
        });

        event::emit(OfferCreatedEvent { id, artwork_id, bidder: bidder_addr, price_uinit, expires_at });
    }

    public entry fun accept_offer(seller: &signer, offer_obj: Object<Offer>) acquires Offer {
        let offer = move_from<Offer>(object::object_address(&offer_obj));
        let Offer { id, artwork, bidder, price_uinit: _, expires_at, escrow, extend_ref: _ } = offer;
        if (expires_at > 0) {
            assert!(timestamp::now_seconds() < expires_at, error::invalid_state(E_OFFER_EXPIRED));
        };
        let seller_addr = signer::address_of(seller);
        assert!(object::is_owner(artwork, seller_addr), error::permission_denied(E_NOT_OWNER));

        royalty::settle(bidder, seller_addr, artwork, escrow, SOURCE_OFFER, id);
        event::emit(OfferAcceptedEvent { id });
    }

    public entry fun cancel_offer(bidder: &signer, offer_obj: Object<Offer>) acquires Offer {
        let offer = move_from<Offer>(object::object_address(&offer_obj));
        let Offer { id, artwork: _, bidder: bidder_recorded, price_uinit: _, expires_at: _, escrow, extend_ref: _ } = offer;
        assert!(signer::address_of(bidder) == bidder_recorded, error::permission_denied(E_NOT_BIDDER));
        coin::deposit<AptosCoin>(bidder_recorded, escrow);
        event::emit(OfferCancelledEvent { id });
    }

    // ---- test-only helpers that return the Object<T> handle ----

    #[test_only]
    public fun list_fixed_for_test(
        seller: &signer,
        artwork_obj: Object<Artwork>,
        price_uinit: u64,
        expires_at: u64,
    ): Object<Listing> {
        assert!(price_uinit > 0, error::invalid_argument(E_PRICE_MUST_BE_POSITIVE));
        let seller_addr = signer::address_of(seller);
        assert!(object::is_owner(artwork_obj, seller_addr), error::permission_denied(E_NOT_OWNER));

        let id = provenance::counters::next_listing_id();
        let constructor_ref = object::create_object(seller_addr);
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let object_signer = object::generate_signer(&constructor_ref);
        let obj = object::object_from_constructor_ref<Listing>(&constructor_ref);

        move_to(&object_signer, Listing {
            id,
            artwork: artwork_obj,
            seller: seller_addr,
            price_uinit,
            expires_at,
            active: true,
            created_at: timestamp::now_seconds(),
            extend_ref,
        });

        let artwork_id = artwork::id_of(artwork_obj);
        event::emit(ListingCreatedEvent { id, artwork_id, seller: seller_addr, price_uinit, expires_at });
        obj
    }

    #[test_only]
    public fun make_offer_for_test(
        bidder: &signer,
        artwork_obj: Object<Artwork>,
        price_uinit: u64,
        expires_at: u64,
        escrow: Coin<AptosCoin>,
    ): Object<Offer> {
        assert!(price_uinit > 0, error::invalid_argument(E_PRICE_MUST_BE_POSITIVE));
        assert!(coin::value(&escrow) >= price_uinit, error::invalid_argument(E_INSUFFICIENT_PAYMENT));
        let bidder_addr = signer::address_of(bidder);

        let id = provenance::counters::next_offer_id();
        let constructor_ref = object::create_object(bidder_addr);
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let object_signer = object::generate_signer(&constructor_ref);
        let obj = object::object_from_constructor_ref<Offer>(&constructor_ref);
        let artwork_id = artwork::id_of(artwork_obj);

        move_to(&object_signer, Offer {
            id, artwork: artwork_obj, bidder: bidder_addr,
            price_uinit, expires_at, escrow, extend_ref,
        });
        event::emit(OfferCreatedEvent { id, artwork_id, bidder: bidder_addr, price_uinit, expires_at });
        obj
    }
}
