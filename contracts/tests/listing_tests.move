#[test_only]
module provenance::listing_tests {
    use std::signer;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::coin;
    use aptos_framework::object;
    use provenance::market;
    use provenance::test_utils;

    // 1
    #[test(fw=@0x1, dep=@provenance, artist=@0xA, buyer=@0xB)]
    fun list_then_buy_succeeds(fw: &signer, dep: &signer, artist: &signer, buyer: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        test_utils::fund(signer::address_of(buyer), 100_000_000, &m);
        test_utils::fund(test_utils::treasury_addr(), 0, &m);
        let (_col, art) = test_utils::mint_artwork_for(artist, 500);
        let listing = market::list_fixed_for_test(artist, art, 1_000_000, 0);
        let payment = test_utils::mint_coin(1_000_000, &m);
        market::buy_now_with_coin(buyer, listing, payment);
        assert!(object::is_owner(art, signer::address_of(buyer)), 0);
        test_utils::cleanup_caps(b, m);
    }

    // 2
    #[test(fw=@0x1, dep=@provenance, artist=@0xA)]
    fun cancel_listing_marks_inactive(fw: &signer, dep: &signer, artist: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        let (_col, art) = test_utils::mint_artwork_for(artist, 500);
        let listing = market::list_fixed_for_test(artist, art, 1_000_000, 0);
        market::cancel_listing(artist, listing);
        // Subsequent buy should fail; covered by test 3 below.
        test_utils::cleanup_caps(b, m);
    }

    // 3
    #[test(fw=@0x1, dep=@provenance, artist=@0xA, buyer=@0xB)]
    #[expected_failure(abort_code = 0x30003, location = provenance::market)]
    fun buy_on_cancelled_listing_fails(fw: &signer, dep: &signer, artist: &signer, buyer: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        test_utils::fund(signer::address_of(buyer), 100_000_000, &m);
        test_utils::fund(test_utils::treasury_addr(), 0, &m);
        let (_col, art) = test_utils::mint_artwork_for(artist, 500);
        let listing = market::list_fixed_for_test(artist, art, 1_000_000, 0);
        market::cancel_listing(artist, listing);
        let payment = test_utils::mint_coin(1_000_000, &m);
        market::buy_now_with_coin(buyer, listing, payment);
        test_utils::cleanup_caps(b, m);
    }

    // 4
    #[test(fw=@0x1, dep=@provenance, artist=@0xA, buyer=@0xB)]
    #[expected_failure(abort_code = 0x10007, location = provenance::market)]
    fun buy_with_insufficient_payment_fails(fw: &signer, dep: &signer, artist: &signer, buyer: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        test_utils::fund(signer::address_of(buyer), 100_000_000, &m);
        test_utils::fund(test_utils::treasury_addr(), 0, &m);
        let (_col, art) = test_utils::mint_artwork_for(artist, 500);
        let listing = market::list_fixed_for_test(artist, art, 1_000_000, 0);
        let payment = test_utils::mint_coin(500_000, &m); // half the price
        market::buy_now_with_coin(buyer, listing, payment);
        test_utils::cleanup_caps(b, m);
    }

    // 5
    #[test(fw=@0x1, dep=@provenance, artist=@0xA, intruder=@0xBAD)]
    #[expected_failure(abort_code = 0x50002, location = provenance::market)]
    fun cancel_rejects_non_seller(fw: &signer, dep: &signer, artist: &signer, intruder: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        test_utils::fund(signer::address_of(intruder), 0, &m);
        let (_col, art) = test_utils::mint_artwork_for(artist, 500);
        let listing = market::list_fixed_for_test(artist, art, 1_000_000, 0);
        market::cancel_listing(intruder, listing);
        test_utils::cleanup_caps(b, m);
    }

    // 6
    #[test(fw=@0x1, dep=@provenance, artist=@0xA)]
    #[expected_failure(abort_code = 0x10006, location = provenance::market)]
    fun list_with_zero_price_fails(fw: &signer, dep: &signer, artist: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        let (_col, art) = test_utils::mint_artwork_for(artist, 500);
        market::list_fixed_for_test(artist, art, 0, 0);
        test_utils::cleanup_caps(b, m);
    }

    // 7
    #[test(fw=@0x1, dep=@provenance, artist=@0xA, buyer=@0xB)]
    fun buy_with_overpayment_refunds_surplus(fw: &signer, dep: &signer, artist: &signer, buyer: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        test_utils::fund(signer::address_of(buyer), 0, &m);
        test_utils::fund(test_utils::treasury_addr(), 0, &m);
        let (_col, art) = test_utils::mint_artwork_for(artist, 500);
        let listing = market::list_fixed_for_test(artist, art, 1_000_000, 0);

        // Pay 1.5 INIT, expect 0.5 INIT refund.
        let payment = test_utils::mint_coin(1_500_000, &m);
        market::buy_now_with_coin(buyer, listing, payment);
        // The buyer was funded with 0 then the surplus (500_000) was deposited.
        assert!(coin::balance<AptosCoin>(signer::address_of(buyer)) == 500_000, 0);
        test_utils::cleanup_caps(b, m);
    }

    // 8 — listing where seller transferred via gift after listing should fail
    #[test(fw=@0x1, dep=@provenance, artist=@0xA, buyer=@0xB, recipient=@0xC)]
    #[expected_failure(abort_code = 0x30005, location = provenance::market)]
    fun stale_listing_fails_after_gift(fw: &signer, dep: &signer, artist: &signer, buyer: &signer, recipient: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        test_utils::fund(signer::address_of(buyer), 100_000_000, &m);
        test_utils::fund(signer::address_of(recipient), 0, &m);
        test_utils::fund(test_utils::treasury_addr(), 0, &m);
        let (_col, art) = test_utils::mint_artwork_for(artist, 500);
        let listing = market::list_fixed_for_test(artist, art, 1_000_000, 0);
        // Artist gifts the artwork after listing
        provenance::artwork::gift(artist, art, signer::address_of(recipient));
        // Buy attempt fails with E_LISTING_STALE
        let payment = test_utils::mint_coin(1_000_000, &m);
        market::buy_now_with_coin(buyer, listing, payment);
        test_utils::cleanup_caps(b, m);
    }
}
