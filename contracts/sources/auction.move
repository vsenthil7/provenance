/// Reserve auctions with anti-snipe extension.
///
/// `place_bid` is the only entry function this protocol grants to the wallet's
/// autosign authz scope. The scope is `provenance::auction::place_bid` —
/// scoping the authz to anything broader would let a session sign arbitrary
/// marketplace actions, which is a security regression.
module provenance::auction {
    use std::error;
    use std::signer;
    use std::option::{Self, Option};
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::object::{Self, Object, ExtendRef, TransferRef};
    use aptos_framework::event;
    use aptos_framework::timestamp;

    use provenance::artwork::{Self, Artwork};
    use provenance::royalty;

    // ---- error codes ----
    const E_NOT_OWNER: u64               = 1;
    const E_BAD_INCREMENT_BPS: u64       = 2;
    const E_BAD_RESERVE: u64             = 3;
    const E_AUCTION_ENDED: u64           = 4;
    const E_BID_BELOW_MIN: u64           = 5;
    const E_AUCTION_NOT_ENDED: u64       = 6;
    const E_AUCTION_FINALIZED: u64       = 7;
    const E_DURATION_TOO_SHORT: u64      = 8;

    const SOURCE_AUCTION: u8 = 2;

    const MIN_INCREMENT_BPS_FLOOR: u64 = 100;     // 1%
    const MIN_INCREMENT_BPS_CEIL: u64  = 5000;    // 50%
    const MIN_DURATION_SECS: u64 = 60;            // 1 minute floor; demo-friendly

    struct Auction has key {
        id: u64,
        artwork: Object<Artwork>,
        seller: address,
        reserve_uinit: u64,
        current_bid_uinit: u64,
        current_bidder: Option<address>,
        current_escrow: Coin<AptosCoin>,
        min_increment_bps: u64,
        ends_at: u64,
        extension_secs: u64,
        finalized: bool,
        artwork_transfer_ref: TransferRef,
        extend_ref: ExtendRef,
    }

    #[event] struct AuctionCreatedEvent has drop, store {
        id: u64, artwork_id: u64, seller: address, reserve_uinit: u64,
        ends_at: u64, min_increment_bps: u64, extension_secs: u64,
    }
    #[event] struct BidPlacedEvent has drop, store {
        auction_id: u64, bidder: address, amount_uinit: u64, new_ends_at: u64,
    }
    #[event] struct AuctionFinalizedEvent has drop, store {
        auction_id: u64,
        winner_some: bool,
        winner: address,
        final_price_uinit: u64,
    }

    public entry fun create_auction(
        seller: &signer,
        artwork_obj: Object<Artwork>,
        reserve_uinit: u64,
        duration_secs: u64,
        min_increment_bps: u64,
        extension_secs: u64,
    ) {
        assert!(reserve_uinit > 0, error::invalid_argument(E_BAD_RESERVE));
        assert!(
            min_increment_bps >= MIN_INCREMENT_BPS_FLOOR && min_increment_bps <= MIN_INCREMENT_BPS_CEIL,
            error::invalid_argument(E_BAD_INCREMENT_BPS),
        );
        assert!(duration_secs >= MIN_DURATION_SECS, error::invalid_argument(E_DURATION_TOO_SHORT));

        let seller_addr = signer::address_of(seller);
        assert!(object::is_owner(artwork_obj, seller_addr), error::permission_denied(E_NOT_OWNER));

        let id = provenance::counters::next_auction_id();
        let constructor_ref = object::create_object(seller_addr);
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let object_signer = object::generate_signer(&constructor_ref);
        let auction_addr = object::address_from_constructor_ref(&constructor_ref);

        // Move artwork into auction custody; seller no longer owns it until finalize.
        // We retain a transfer ref so finalize can hand it to the winner (or back to seller).
        let artwork_transfer_ref = object::generate_transfer_ref(&constructor_ref);
        object::transfer(seller, artwork_obj, auction_addr);

        let now = timestamp::now_seconds();
        let ends_at = now + duration_secs;

        move_to(&object_signer, Auction {
            id,
            artwork: artwork_obj,
            seller: seller_addr,
            reserve_uinit,
            current_bid_uinit: 0,
            current_bidder: option::none<address>(),
            current_escrow: coin::zero<AptosCoin>(),
            min_increment_bps,
            ends_at,
            extension_secs,
            finalized: false,
            artwork_transfer_ref,
            extend_ref,
        });

        let artwork_id = artwork::id_of(artwork_obj);
        event::emit(AuctionCreatedEvent {
            id, artwork_id, seller: seller_addr, reserve_uinit, ends_at, min_increment_bps, extension_secs,
        });
    }

    /// THE autosign target. Bid increments are bps-relative to current bid.
    public entry fun place_bid(bidder: &signer, auction_obj: Object<Auction>, bid: Coin<AptosCoin>) acquires Auction {
        let auction = borrow_global_mut<Auction>(object::object_address(&auction_obj));
        assert!(!auction.finalized, error::invalid_state(E_AUCTION_FINALIZED));
        let now = timestamp::now_seconds();
        assert!(now < auction.ends_at, error::invalid_state(E_AUCTION_ENDED));

        let amount = coin::value(&bid);
        let min_required = if (auction.current_bid_uinit == 0) {
            auction.reserve_uinit
        } else {
            // increment = current * bps / 10000
            let inc = (((auction.current_bid_uinit as u128) * (auction.min_increment_bps as u128)) / 10000) as u64;
            auction.current_bid_uinit + inc
        };
        assert!(amount >= min_required, error::invalid_argument(E_BID_BELOW_MIN));

        // Refund previous bidder atomically before locking new escrow.
        if (option::is_some(&auction.current_bidder)) {
            let prev_addr = *option::borrow(&auction.current_bidder);
            let prev_escrow = coin::extract_all(&mut auction.current_escrow);
            coin::deposit<AptosCoin>(prev_addr, prev_escrow);
        };

        // Lock new escrow.
        coin::merge(&mut auction.current_escrow, bid);
        auction.current_bid_uinit = amount;
        auction.current_bidder = option::some(signer::address_of(bidder));

        // Anti-snipe: if the bid lands within `extension_secs` of `ends_at`,
        // extend the end by `extension_secs`.
        if (auction.ends_at - now <= auction.extension_secs) {
            auction.ends_at = now + auction.extension_secs;
        };

        event::emit(BidPlacedEvent {
            auction_id: auction.id,
            bidder: signer::address_of(bidder),
            amount_uinit: amount,
            new_ends_at: auction.ends_at,
        });
    }

    public entry fun finalize_auction(_caller: &signer, auction_obj: Object<Auction>) acquires Auction {
        let auction = borrow_global_mut<Auction>(object::object_address(&auction_obj));
        assert!(!auction.finalized, error::invalid_state(E_AUCTION_FINALIZED));
        assert!(timestamp::now_seconds() >= auction.ends_at, error::invalid_state(E_AUCTION_NOT_ENDED));

        auction.finalized = true;

        if (option::is_none(&auction.current_bidder)) {
            // No bids: return artwork to seller. No money to move.
            let linear = object::generate_linear_transfer_ref(&auction.artwork_transfer_ref);
            object::transfer_with_ref(linear, auction.seller);
            event::emit(AuctionFinalizedEvent {
                auction_id: auction.id,
                winner_some: false,
                winner: @0x0,
                final_price_uinit: 0,
            });
            return
        };

        let winner = *option::borrow(&auction.current_bidder);
        let final_price = auction.current_bid_uinit;
        let escrow = coin::extract_all(&mut auction.current_escrow);

        royalty::settle(winner, auction.seller, auction.artwork, escrow, SOURCE_AUCTION, auction.id);

        event::emit(AuctionFinalizedEvent {
            auction_id: auction.id,
            winner_some: true,
            winner,
            final_price_uinit: final_price,
        });
    }

    // ---- test-only helper that returns the Object<Auction> handle ----

    #[test_only]
    public fun create_auction_for_test(
        seller: &signer,
        artwork_obj: Object<Artwork>,
        reserve_uinit: u64,
        duration_secs: u64,
        min_increment_bps: u64,
        extension_secs: u64,
    ): Object<Auction> {
        assert!(reserve_uinit > 0, error::invalid_argument(E_BAD_RESERVE));
        assert!(
            min_increment_bps >= MIN_INCREMENT_BPS_FLOOR && min_increment_bps <= MIN_INCREMENT_BPS_CEIL,
            error::invalid_argument(E_BAD_INCREMENT_BPS),
        );
        assert!(duration_secs >= MIN_DURATION_SECS, error::invalid_argument(E_DURATION_TOO_SHORT));

        let seller_addr = signer::address_of(seller);
        assert!(object::is_owner(artwork_obj, seller_addr), error::permission_denied(E_NOT_OWNER));

        let id = provenance::counters::next_auction_id();
        let constructor_ref = object::create_object(seller_addr);
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let object_signer = object::generate_signer(&constructor_ref);
        let obj = object::object_from_constructor_ref<Auction>(&constructor_ref);
        let auction_addr = object::address_from_constructor_ref(&constructor_ref);

        let artwork_transfer_ref = object::generate_transfer_ref(&constructor_ref);
        object::transfer(seller, artwork_obj, auction_addr);

        let now = timestamp::now_seconds();
        let ends_at = now + duration_secs;

        move_to(&object_signer, Auction {
            id, artwork: artwork_obj, seller: seller_addr,
            reserve_uinit, current_bid_uinit: 0,
            current_bidder: option::none<address>(),
            current_escrow: coin::zero<AptosCoin>(),
            min_increment_bps, ends_at, extension_secs,
            finalized: false, artwork_transfer_ref, extend_ref,
        });

        let artwork_id = artwork::id_of(artwork_obj);
        event::emit(AuctionCreatedEvent {
            id, artwork_id, seller: seller_addr,
            reserve_uinit, ends_at, min_increment_bps, extension_secs,
        });
        obj
    }
}
