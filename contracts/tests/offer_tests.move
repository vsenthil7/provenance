#[test_only]
module provenance::offer_tests {
    use std::signer;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::coin;
    use aptos_framework::object;
    use provenance::market;
    use provenance::test_utils;

    // 1
    #[test(fw=@0x1, dep=@provenance, artist=@0xA, bidder=@0xC)]
    fun make_and_accept_offer_pays_royalty(fw: &signer, dep: &signer, artist: &signer, bidder: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        test_utils::fund(signer::address_of(bidder), 0, &m);
        test_utils::fund(test_utils::treasury_addr(), 0, &m);
        let (_col, art) = test_utils::mint_artwork_for(artist, 500);

        let escrow = test_utils::mint_coin(1_000_000, &m);
        let offer = market::make_offer_for_test(bidder, art, 1_000_000, 0, escrow);

        market::accept_offer(artist, offer);
        assert!(object::is_owner(art, signer::address_of(bidder)), 0);
        assert!(coin::balance<AptosCoin>(test_utils::treasury_addr()) == 5_000, 1);
        test_utils::cleanup_caps(b, m);
    }

    // 2
    #[test(fw=@0x1, dep=@provenance, artist=@0xA, bidder=@0xC)]
    fun cancel_offer_returns_escrow(fw: &signer, dep: &signer, artist: &signer, bidder: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        test_utils::fund(signer::address_of(bidder), 0, &m);
        let (_col, art) = test_utils::mint_artwork_for(artist, 500);
        let escrow = test_utils::mint_coin(1_000_000, &m);
        let offer = market::make_offer_for_test(bidder, art, 1_000_000, 0, escrow);
        market::cancel_offer(bidder, offer);
        assert!(coin::balance<AptosCoin>(signer::address_of(bidder)) == 1_000_000, 0);
        test_utils::cleanup_caps(b, m);
    }

    // 3
    #[test(fw=@0x1, dep=@provenance, artist=@0xA, bidder=@0xC, intruder=@0xBAD)]
    #[expected_failure(abort_code = 0x50009, location = provenance::market)]
    fun cancel_offer_rejects_non_bidder(fw: &signer, dep: &signer, artist: &signer, bidder: &signer, intruder: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        test_utils::fund(signer::address_of(bidder), 0, &m);
        test_utils::fund(signer::address_of(intruder), 0, &m);
        let (_col, art) = test_utils::mint_artwork_for(artist, 500);
        let escrow = test_utils::mint_coin(1_000_000, &m);
        let offer = market::make_offer_for_test(bidder, art, 1_000_000, 0, escrow);
        market::cancel_offer(intruder, offer);
        test_utils::cleanup_caps(b, m);
    }

    // 4
    #[test(fw=@0x1, dep=@provenance, artist=@0xA, bidder=@0xC)]
    #[expected_failure(abort_code = 0x10007, location = provenance::market)]
    fun make_offer_with_insufficient_escrow_fails(fw: &signer, dep: &signer, artist: &signer, bidder: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        test_utils::fund(signer::address_of(bidder), 0, &m);
        let (_col, art) = test_utils::mint_artwork_for(artist, 500);
        let escrow = test_utils::mint_coin(500_000, &m); // less than price
        market::make_offer_for_test(bidder, art, 1_000_000, 0, escrow);
        test_utils::cleanup_caps(b, m);
    }

    // 5
    #[test(fw=@0x1, dep=@provenance, artist=@0xA, bidder=@0xC)]
    #[expected_failure(abort_code = 0x30008, location = provenance::market)]
    fun accept_expired_offer_fails(fw: &signer, dep: &signer, artist: &signer, bidder: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        test_utils::fund(signer::address_of(bidder), 0, &m);
        test_utils::fund(test_utils::treasury_addr(), 0, &m);
        let (_col, art) = test_utils::mint_artwork_for(artist, 500);
        let escrow = test_utils::mint_coin(1_000_000, &m);
        // expires_at = 1 (very early); advance time past it before accept.
        let offer = market::make_offer_for_test(bidder, art, 1_000_000, 1, escrow);
        test_utils::forward_secs(10_000);
        market::accept_offer(artist, offer);
        test_utils::cleanup_caps(b, m);
    }

    // 6
    #[test(fw=@0x1, dep=@provenance, artist=@0xA, bidder=@0xC)]
    #[expected_failure(abort_code = 0x10006, location = provenance::market)]
    fun make_offer_with_zero_price_fails(fw: &signer, dep: &signer, artist: &signer, bidder: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        test_utils::fund(signer::address_of(bidder), 0, &m);
        let (_col, art) = test_utils::mint_artwork_for(artist, 500);
        let escrow = test_utils::mint_coin(1_000_000, &m);
        market::make_offer_for_test(bidder, art, 0, 0, escrow);
        test_utils::cleanup_caps(b, m);
    }
}
