#[test_only]
module provenance::auction_tests {
    use std::signer;
    use std::option;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::coin;
    use aptos_framework::object;
    use provenance::auction;
    use provenance::test_utils;

    const ART: address = @0xA;

    // 1
    #[test(fw=@0x1, dep=@provenance, artist=@0xA, bidder=@0xC)]
    fun create_auction_takes_custody_of_artwork(fw: &signer, dep: &signer, artist: &signer, bidder: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        test_utils::fund(signer::address_of(bidder), 0, &m);
        let (_col, art) = test_utils::mint_artwork_for(artist, 500);
        let _auc = auction::create_auction_for_test(artist, art, 1_000_000, 600, 200, 120);
        // Artist no longer owns the artwork; the auction object does.
        assert!(!object::is_owner(art, signer::address_of(artist)), 0);
        test_utils::cleanup_caps(b, m);
    }

    // 2
    #[test(fw=@0x1, dep=@provenance, artist=@0xA, bidder=@0xC)]
    fun first_bid_at_reserve_succeeds(fw: &signer, dep: &signer, artist: &signer, bidder: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        test_utils::fund(signer::address_of(bidder), 0, &m);
        let (_col, art) = test_utils::mint_artwork_for(artist, 500);
        let auc = auction::create_auction_for_test(artist, art, 1_000_000, 600, 200, 120);
        let bid = test_utils::mint_coin(1_000_000, &m);
        auction::place_bid_with_coin(bidder, auc, bid);
        test_utils::cleanup_caps(b, m);
    }

    // 3
    #[test(fw=@0x1, dep=@provenance, artist=@0xA, bidder=@0xC)]
    #[expected_failure(abort_code = 0x10005, location = provenance::auction)]
    fun bid_below_reserve_fails(fw: &signer, dep: &signer, artist: &signer, bidder: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        test_utils::fund(signer::address_of(bidder), 0, &m);
        let (_col, art) = test_utils::mint_artwork_for(artist, 500);
        let auc = auction::create_auction_for_test(artist, art, 1_000_000, 600, 200, 120);
        let bid = test_utils::mint_coin(500_000, &m);
        auction::place_bid_with_coin(bidder, auc, bid);
        test_utils::cleanup_caps(b, m);
    }

    // 4
    #[test(fw=@0x1, dep=@provenance, artist=@0xA, b1=@0xC, b2=@0xD)]
    fun second_bid_must_meet_increment(fw: &signer, dep: &signer, artist: &signer, b1: &signer, b2: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        test_utils::fund(signer::address_of(b1), 0, &m);
        test_utils::fund(signer::address_of(b2), 0, &m);
        let (_col, art) = test_utils::mint_artwork_for(artist, 500);
        let auc = auction::create_auction_for_test(artist, art, 1_000_000, 600, 200, 120);
        auction::place_bid_with_coin(b1, auc, test_utils::mint_coin(1_000_000, &m));
        // Second bid must be at least 1_020_000 (1M + 2%).
        auction::place_bid_with_coin(b2, auc, test_utils::mint_coin(1_020_000, &m));
        test_utils::cleanup_caps(b, m);
    }

    // 5
    #[test(fw=@0x1, dep=@provenance, artist=@0xA, b1=@0xC, b2=@0xD)]
    #[expected_failure(abort_code = 0x10005, location = provenance::auction)]
    fun second_bid_below_increment_fails(fw: &signer, dep: &signer, artist: &signer, b1: &signer, b2: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        test_utils::fund(signer::address_of(b1), 0, &m);
        test_utils::fund(signer::address_of(b2), 0, &m);
        let (_col, art) = test_utils::mint_artwork_for(artist, 500);
        let auc = auction::create_auction_for_test(artist, art, 1_000_000, 600, 200, 120);
        auction::place_bid_with_coin(b1, auc, test_utils::mint_coin(1_000_000, &m));
        // Increment is 2% → 1_020_000 required. 1_010_000 is too small.
        auction::place_bid_with_coin(b2, auc, test_utils::mint_coin(1_010_000, &m));
        test_utils::cleanup_caps(b, m);
    }

    // 6
    #[test(fw=@0x1, dep=@provenance, artist=@0xA, b1=@0xC, b2=@0xD)]
    fun outbid_refunds_previous_bidder(fw: &signer, dep: &signer, artist: &signer, b1: &signer, b2: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        test_utils::fund(signer::address_of(b1), 0, &m);
        test_utils::fund(signer::address_of(b2), 0, &m);
        let (_col, art) = test_utils::mint_artwork_for(artist, 500);
        let auc = auction::create_auction_for_test(artist, art, 1_000_000, 600, 200, 120);
        auction::place_bid_with_coin(b1, auc, test_utils::mint_coin(1_000_000, &m));
        // b1 now has 0; b1 is escrowed in the auction.
        auction::place_bid_with_coin(b2, auc, test_utils::mint_coin(1_020_000, &m));
        // After b2 outbids, b1 should be refunded.
        assert!(coin::balance<AptosCoin>(signer::address_of(b1)) == 1_000_000, 0);
        test_utils::cleanup_caps(b, m);
    }

    // 7
    #[test(fw=@0x1, dep=@provenance, artist=@0xA, bidder=@0xC)]
    fun anti_snipe_extends_end_time(fw: &signer, dep: &signer, artist: &signer, bidder: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        test_utils::fund(signer::address_of(bidder), 0, &m);
        let (_col, art) = test_utils::mint_artwork_for(artist, 500);
        // duration = 200s; extension = 120s.
        let auc = auction::create_auction_for_test(artist, art, 1_000_000, 200, 200, 120);
        // Advance to just before end (199s from now).
        test_utils::forward_secs(100); // now 100s remaining
        // 100 <= 120 → bid extends ends_at by 120 from now.
        auction::place_bid_with_coin(bidder, auc, test_utils::mint_coin(1_000_000, &m));
        test_utils::cleanup_caps(b, m);
    }

    // 8
    #[test(fw=@0x1, dep=@provenance, artist=@0xA, bidder=@0xC)]
    #[expected_failure(abort_code = 0x30004, location = provenance::auction)]
    fun bid_after_end_fails(fw: &signer, dep: &signer, artist: &signer, bidder: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        test_utils::fund(signer::address_of(bidder), 0, &m);
        let (_col, art) = test_utils::mint_artwork_for(artist, 500);
        let auc = auction::create_auction_for_test(artist, art, 1_000_000, 60, 200, 30);
        test_utils::forward_secs(120); // past end
        auction::place_bid_with_coin(bidder, auc, test_utils::mint_coin(1_000_000, &m));
        test_utils::cleanup_caps(b, m);
    }

    // 9
    #[test(fw=@0x1, dep=@provenance, artist=@0xA)]
    #[expected_failure(abort_code = 0x10002, location = provenance::auction)]
    fun create_with_invalid_increment_fails(fw: &signer, dep: &signer, artist: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        let (_col, art) = test_utils::mint_artwork_for(artist, 500);
        // 5001 bps = 50.01% — above the 50% ceiling.
        auction::create_auction_for_test(artist, art, 1_000_000, 600, 5001, 120);
        test_utils::cleanup_caps(b, m);
    }

    // 10
    #[test(fw=@0x1, dep=@provenance, artist=@0xA, bidder=@0xC)]
    fun finalize_with_winner_pays_royalty(fw: &signer, dep: &signer, artist: &signer, bidder: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        test_utils::fund(signer::address_of(bidder), 0, &m);
        test_utils::fund(test_utils::treasury_addr(), 0, &m);
        let (_col, art) = test_utils::mint_artwork_for(artist, 500);
        let auc = auction::create_auction_for_test(artist, art, 1_000_000, 60, 200, 30);
        auction::place_bid_with_coin(bidder, auc, test_utils::mint_coin(1_000_000, &m));
        test_utils::forward_secs(120);
        auction::finalize_auction(artist, auc);
        assert!(object::is_owner(art, signer::address_of(bidder)), 0);
        // 0.5% fee → 5_000 to treasury
        assert!(coin::balance<AptosCoin>(test_utils::treasury_addr()) == 5_000, 1);
        test_utils::cleanup_caps(b, m);
    }

    // 11
    #[test(fw=@0x1, dep=@provenance, artist=@0xA)]
    fun finalize_with_no_bids_returns_artwork(fw: &signer, dep: &signer, artist: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        let (_col, art) = test_utils::mint_artwork_for(artist, 500);
        let auc = auction::create_auction_for_test(artist, art, 1_000_000, 60, 200, 30);
        test_utils::forward_secs(120);
        auction::finalize_auction(artist, auc);
        // Artwork returned to the seller (artist) since there were no bids.
        assert!(object::is_owner(art, signer::address_of(artist)), 0);
        test_utils::cleanup_caps(b, m);
    }

    // 12
    #[test(fw=@0x1, dep=@provenance, artist=@0xA, bidder=@0xC)]
    #[expected_failure(abort_code = 0x30006, location = provenance::auction)]
    fun finalize_before_end_fails(fw: &signer, dep: &signer, artist: &signer, bidder: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        test_utils::fund(signer::address_of(bidder), 0, &m);
        let (_col, art) = test_utils::mint_artwork_for(artist, 500);
        let auc = auction::create_auction_for_test(artist, art, 1_000_000, 600, 200, 30);
        auction::place_bid_with_coin(bidder, auc, test_utils::mint_coin(1_000_000, &m));
        // Don't advance time — auction still live.
        auction::finalize_auction(artist, auc);
        test_utils::cleanup_caps(b, m);
    }
}
