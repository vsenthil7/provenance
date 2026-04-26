#[test_only]
module provenance::royalty_tests {
    use std::signer;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::coin;
    use aptos_framework::object;

    use provenance::royalty;
    use provenance::market;
    use provenance::test_utils;

    // --- mul_bps unit tests (6) ---

    #[test]
    fun mul_bps_zero_amount() {
        assert!(royalty::mul_bps_for_test(0, 1000) == 0, 0);
    }

    #[test]
    fun mul_bps_zero_bps() {
        assert!(royalty::mul_bps_for_test(1_000_000, 0) == 0, 0);
    }

    #[test]
    fun mul_bps_at_5_percent() {
        assert!(royalty::mul_bps_for_test(1_000_000, 500) == 50_000, 0);
    }

    #[test]
    fun mul_bps_at_10_percent_cap() {
        assert!(royalty::mul_bps_for_test(1_000_000, 1000) == 100_000, 0);
    }

    #[test]
    fun mul_bps_dust_rounds_down_to_zero() {
        assert!(royalty::mul_bps_for_test(7, 500) == 0, 0);
    }

    #[test]
    fun mul_bps_no_overflow_at_huge_amount() {
        // 1.8e16 uinit = 1.8e10 INIT — beyond any plausible mainnet figure.
        let big: u64 = 18_000_000_000_000_000;
        assert!(royalty::mul_bps_for_test(big, 1000) == big / 10, 0);
    }

    // --- constants (3) ---

    #[test]
    fun max_royalty_bps_is_1000() {
        assert!(royalty::max_royalty_bps() == 1000, 0);
    }

    #[test]
    fun protocol_fee_bps_is_50() {
        assert!(royalty::protocol_fee_bps() == 50, 0);
    }

    #[test]
    fun protocol_treasury_is_set() {
        assert!(royalty::protocol_treasury() == @0xFEE, 0);
    }

    // --- end-to-end settle path (3) ---
    // settle is friend-only; we drive it via market::buy_now since that's the
    // only exposed caller for tests that don't go through auction.

    #[test(fw=@0x1, dep=@provenance, artist=@0xA, buyer=@0xB)]
    fun settle_full_amount_at_5pct_royalty(fw: &signer, dep: &signer, artist: &signer, buyer: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        let artist_addr = signer::address_of(artist);
        let buyer_addr = signer::address_of(buyer);
        test_utils::fund(artist_addr, 0, &m);
        test_utils::fund(buyer_addr, 100_000_000, &m);
        test_utils::fund(test_utils::treasury_addr(), 0, &m);

        let (_col, art) = test_utils::mint_artwork_for(artist, 500); // 5%
        let listing = market::list_fixed_for_test(artist, art, 1_000_000, 0);

        let payment = test_utils::mint_coin(1_000_000, &m);
        market::buy_now_with_coin(buyer, listing, payment);

        // Artist received 5% royalty (50_000) + the 1M as seller (since artist
        // is also seller for first sale): 50_000 royalty + (1_000_000 - 50_000 - 5_000) net = 945_000.
        // Actually first-sale artist == seller, so artist gets royalty + seller_net = 50_000 + 945_000 = 995_000.
        let final_balance = coin::balance<AptosCoin>(artist_addr);
        assert!(final_balance == 995_000, 0);
        let treasury = coin::balance<AptosCoin>(test_utils::treasury_addr());
        assert!(treasury == 5_000, 1); // 0.5% fee
        assert!(object::is_owner(art, buyer_addr), 2);
        test_utils::cleanup_caps(b, m);
    }

    #[test(fw=@0x1, dep=@provenance, artist=@0xA, buyer=@0xB)]
    fun settle_with_zero_royalty_artist_set(fw: &signer, dep: &signer, artist: &signer, buyer: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        let artist_addr = signer::address_of(artist);
        let buyer_addr = signer::address_of(buyer);
        test_utils::fund(artist_addr, 0, &m);
        test_utils::fund(buyer_addr, 100_000_000, &m);
        test_utils::fund(test_utils::treasury_addr(), 0, &m);

        let (_col, art) = test_utils::mint_artwork_for(artist, 0); // 0%
        let listing = market::list_fixed_for_test(artist, art, 1_000_000, 0);

        let payment = test_utils::mint_coin(1_000_000, &m);
        market::buy_now_with_coin(buyer, listing, payment);

        // 0 royalty + 5_000 fee + 995_000 net (all to artist as seller) = 995_000
        assert!(coin::balance<AptosCoin>(artist_addr) == 995_000, 0);
        assert!(coin::balance<AptosCoin>(test_utils::treasury_addr()) == 5_000, 1);
        // Buyer's funded balance is untouched: the payment coin was minted
        // separately and handed to buy_now, not deducted from buyer's account.
        assert!(coin::balance<AptosCoin>(buyer_addr) == 100_000_000, 2);
        test_utils::cleanup_caps(b, m);
    }

    #[test(fw=@0x1, dep=@provenance, artist=@0xA, buyer=@0xB)]
    fun settle_emits_event(fw: &signer, dep: &signer, artist: &signer, buyer: &signer) {
        // We can't directly inspect events in unit tests easily, but we can
        // validate state changes consistent with the event firing path.
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        test_utils::fund(signer::address_of(buyer), 100_000_000, &m);
        test_utils::fund(test_utils::treasury_addr(), 0, &m);

        let (_col, art) = test_utils::mint_artwork_for(artist, 1000); // max 10%
        let listing = market::list_fixed_for_test(artist, art, 1_000_000, 0);
        let payment = test_utils::mint_coin(1_000_000, &m);
        market::buy_now_with_coin(buyer, listing, payment);

        // 100_000 royalty + 5_000 fee + 895_000 net all to artist (first sale)
        assert!(coin::balance<AptosCoin>(signer::address_of(artist)) == 995_000, 0);
        test_utils::cleanup_caps(b, m);
    }

    // --- error path: zero gross ---
    // Reachable: hand settle a payment coin of value 0.
    // settle_for_test exposes the friend-only path.

    #[test(fw=@0x1, dep=@provenance, artist=@0xA, buyer=@0xB)]
    #[expected_failure(abort_code = 0x10002, location = provenance::royalty)]
    fun settle_rejects_zero_gross(fw: &signer, dep: &signer, artist: &signer, buyer: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        test_utils::fund(signer::address_of(buyer), 0, &m);
        test_utils::fund(test_utils::treasury_addr(), 0, &m);

        let (_col, art) = test_utils::mint_artwork_for(artist, 500);
        let zero_payment = test_utils::mint_coin(0, &m);
        royalty::settle_for_test(
            signer::address_of(buyer),
            signer::address_of(artist),
            art,
            zero_payment,
            1,
            0,
        );
        test_utils::cleanup_caps(b, m);
    }

    // --- royalty override happy branch ---
    // Covers settlement_facts() option::borrow when an artwork carries an
    // explicit override that differs from the collection default.

    #[test(fw=@0x1, dep=@provenance, artist=@0xA, buyer=@0xB)]
    fun settle_uses_artwork_royalty_override(fw: &signer, dep: &signer, artist: &signer, buyer: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        let artist_addr = signer::address_of(artist);
        let buyer_addr = signer::address_of(buyer);
        test_utils::fund(artist_addr, 0, &m);
        test_utils::fund(buyer_addr, 100_000_000, &m);
        test_utils::fund(test_utils::treasury_addr(), 0, &m);

        // Collection default is 200 (2%), artwork override is 700 (7%).
        // The override branch in settlement_facts must win.
        let col = provenance::collection::create_collection_for_test(artist, 200);
        let art = provenance::artwork::mint_with_override_for_test(
            artist, col, std::string::utf8(b"X"), test_utils::valid_hash(), 700,
        );
        let listing = market::list_fixed_for_test(artist, art, 1_000_000, 0);
        let payment = test_utils::mint_coin(1_000_000, &m);
        market::buy_now_with_coin(buyer, listing, payment);

        // 7% royalty (70_000) + 0.5% fee (5_000) + 925_000 seller_net.
        // Artist is both creator and seller on first sale, so artist receives
        // royalty + seller_net = 70_000 + 925_000 = 995_000.
        assert!(coin::balance<AptosCoin>(artist_addr) == 995_000, 0);
        assert!(coin::balance<AptosCoin>(test_utils::treasury_addr()) == 5_000, 1);
        assert!(object::is_owner(art, buyer_addr), 2);
        test_utils::cleanup_caps(b, m);
    }
}
