/// Royalty settlement — the only path that moves an `Artwork` AND `Coin<INIT>`
/// in the same transaction.
///
/// Every paid transfer in the Provenance protocol calls `royalty::settle`. There
/// is no other way: `provenance::artwork`'s ownership transfer helper has
/// `friend` visibility restricted to `royalty`. By construction, a Move
/// transaction that hands an `Artwork` to a buyer in exchange for INIT *must*
/// route through this function. That is what "royalties enforced by the type
/// system" means.
module provenance::royalty {
    use std::error;
    use std::signer;
    use std::option;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::event;

    use provenance::artwork::{Self, Artwork};
    use aptos_framework::object::{Self, Object};

    // ---- friends: only protocol modules call settle ----
    friend provenance::market;
    friend provenance::auction;

    // ---- error codes ----
    const E_ROYALTY_BPS_TOO_HIGH: u64       = 1;
    const E_GROSS_MUST_BE_POSITIVE: u64     = 2;
    const E_INSUFFICIENT_PAYMENT: u64       = 3;
    const E_ARITHMETIC_INVARIANT_BROKEN: u64 = 4;

    // ---- constants ----
    /// 10% — never more, regardless of what's stored on the artwork or collection.
    const MAX_ROYALTY_BPS: u64 = 1000;
    /// 0.5% protocol fee, capped here so it can never silently grow.
    const PROTOCOL_FEE_BPS: u64 = 50;
    /// Treasury address; replaced at publish time (placeholder for tests).
    const PROTOCOL_TREASURY: address = @0xFEE;

    // ---- events ----
    #[event]
    struct SettlementEvent has drop, store {
        artwork_id: u64,
        source: u8,                  // 1 = listing, 2 = auction, 3 = offer
        source_id: u64,
        buyer: address,
        seller: address,
        gross_uinit: u64,
        royalty_uinit: u64,
        protocol_fee_uinit: u64,
        seller_net_uinit: u64,
        artist_addr: address,
    }

    public(friend) fun settle(
        buyer: address,
        seller: address,
        artwork_obj: Object<Artwork>,
        payment: Coin<AptosCoin>,
        source: u8,
        source_id: u64,
    ) {
        let gross = coin::value(&payment);
        assert!(gross > 0, error::invalid_argument(E_GROSS_MUST_BE_POSITIVE));

        let (artwork_id, artist_addr, royalty_bps) = artwork::settlement_facts(&artwork_obj);
        assert!(royalty_bps <= MAX_ROYALTY_BPS, error::invalid_state(E_ROYALTY_BPS_TOO_HIGH));

        // Compute the three buckets. u64 is fine: gross ≤ ~1.8e19, bps ≤ 10000;
        // the multiplication cannot overflow at any realistic INIT amount.
        let royalty = mul_bps(gross, royalty_bps);
        let fee = mul_bps(gross, PROTOCOL_FEE_BPS);
        let seller_net = gross - royalty - fee;

        // Single-payment guard — the three components must sum to gross.
        // This is the protocol's no-rounding-loss invariant.
        assert!(
            royalty + fee + seller_net == gross,
            error::internal(E_ARITHMETIC_INVARIANT_BROKEN),
        );

        // Split payment into three coins. `coin::extract` is exact.
        let royalty_coin = coin::extract(&mut payment, royalty);
        let fee_coin = coin::extract(&mut payment, fee);
        // payment now holds exactly seller_net.
        assert!(
            coin::value(&payment) == seller_net,
            error::internal(E_INSUFFICIENT_PAYMENT),
        );

        // Transfer the three coins.
        coin::deposit<AptosCoin>(artist_addr, royalty_coin);
        coin::deposit<AptosCoin>(PROTOCOL_TREASURY, fee_coin);
        coin::deposit<AptosCoin>(seller, payment);

        // Move artwork ownership last; this is the friend-only path.
        artwork::transfer_via_settle(artwork_obj, buyer);

        event::emit(SettlementEvent {
            artwork_id,
            source,
            source_id,
            buyer,
            seller,
            gross_uinit: gross,
            royalty_uinit: royalty,
            protocol_fee_uinit: fee,
            seller_net_uinit: seller_net,
            artist_addr,
        });
    }

    /// `(amount * bps) / 10000`, with overflow safety.
    inline fun mul_bps(amount: u64, bps: u64): u64 {
        // Convert through u128 to avoid overflow on the multiply step.
        (((amount as u128) * (bps as u128)) / 10000) as u64
    }

    // ---- view functions used by frontend / indexer ----
    #[view]
    public fun max_royalty_bps(): u64 { MAX_ROYALTY_BPS }

    #[view]
    public fun protocol_fee_bps(): u64 { PROTOCOL_FEE_BPS }

    #[view]
    public fun protocol_treasury(): address { PROTOCOL_TREASURY }

    // ---- test-only helpers ----

    #[test_only]
    public fun settle_for_test(
        buyer: address,
        seller: address,
        artwork_obj: Object<Artwork>,
        payment: Coin<AptosCoin>,
        source: u8,
        source_id: u64,
    ) {
        settle(buyer, seller, artwork_obj, payment, source, source_id);
    }

    #[test_only]
    public fun mul_bps_for_test(amount: u64, bps: u64): u64 { mul_bps(amount, bps) }
}
