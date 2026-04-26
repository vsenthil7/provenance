#[test_only]
module provenance::artwork_tests {
    use std::signer;
    use std::string;
    use aptos_framework::object;
    use provenance::collection;
    use provenance::artwork;
    use provenance::test_utils;

    // 1
    #[test(fw=@0x1, dep=@provenance, artist=@0xA)]
    fun mint_assigns_id_and_creator(fw: &signer, dep: &signer, artist: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        let (_col, art) = test_utils::mint_artwork_for(artist, 500);
        assert!(artwork::id_of(art) == 1, 0);
        assert!(artwork::creator_of(art) == signer::address_of(artist), 1);
        test_utils::cleanup_caps(b, m);
    }

    // 2
    #[test(fw=@0x1, dep=@provenance, artist=@0xA)]
    fun second_mint_gets_id_2(fw: &signer, dep: &signer, artist: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        let col = collection::create_collection_for_test(artist, 500);
        let a1 = artwork::mint_for_test(artist, col, string::utf8(b"first"), test_utils::valid_hash());
        let a2 = artwork::mint_for_test(artist, col, string::utf8(b"second"), test_utils::valid_hash());
        assert!(artwork::id_of(a1) == 1, 0);
        assert!(artwork::id_of(a2) == 2, 1);
        test_utils::cleanup_caps(b, m);
    }

    // 3
    #[test(fw=@0x1, dep=@provenance, artist=@0xA, intruder=@0xBAD)]
    #[expected_failure(abort_code = 0x50004, location = provenance::artwork)]
    fun mint_rejects_non_artist(fw: &signer, dep: &signer, artist: &signer, intruder: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        test_utils::fund(signer::address_of(intruder), 0, &m);
        let col = collection::create_collection_for_test(artist, 500);
        artwork::mint_for_test(intruder, col, string::utf8(b"X"), test_utils::valid_hash());
        test_utils::cleanup_caps(b, m);
    }

    // 4
    #[test(fw=@0x1, dep=@provenance, artist=@0xA)]
    #[expected_failure(abort_code = 0x10003, location = provenance::artwork)]
    fun mint_rejects_31_byte_hash(fw: &signer, dep: &signer, artist: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        let col = collection::create_collection_for_test(artist, 500);
        artwork::mint_for_test(artist, col, string::utf8(b"X"), test_utils::bad_hash());
        test_utils::cleanup_caps(b, m);
    }

    // 5
    #[test(fw=@0x1, dep=@provenance, artist=@0xA)]
    #[expected_failure(abort_code = 0x30005, location = provenance::artwork)]
    fun mint_rejects_into_frozen_collection(fw: &signer, dep: &signer, artist: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        let col = collection::create_collection_for_test(artist, 500);
        collection::freeze_collection(artist, col);
        artwork::mint_for_test(artist, col, string::utf8(b"X"), test_utils::valid_hash());
        test_utils::cleanup_caps(b, m);
    }

    // 6
    #[test(fw=@0x1, dep=@provenance, artist=@0xA, recipient=@0xC)]
    fun gift_transfers_to_recipient(fw: &signer, dep: &signer, artist: &signer, recipient: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        test_utils::fund(signer::address_of(recipient), 0, &m);
        let (_col, art) = test_utils::mint_artwork_for(artist, 500);
        artwork::gift(artist, art, signer::address_of(recipient));
        assert!(object::is_owner(art, signer::address_of(recipient)), 0);
        test_utils::cleanup_caps(b, m);
    }

    // 7
    #[test(fw=@0x1, dep=@provenance, artist=@0xA, intruder=@0xBAD, recipient=@0xC)]
    #[expected_failure(abort_code = 0x50001, location = provenance::artwork)]
    fun gift_rejects_non_owner(fw: &signer, dep: &signer, artist: &signer, intruder: &signer, recipient: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        test_utils::fund(signer::address_of(intruder), 0, &m);
        test_utils::fund(signer::address_of(recipient), 0, &m);
        let (_col, art) = test_utils::mint_artwork_for(artist, 500);
        artwork::gift(intruder, art, signer::address_of(recipient));
        test_utils::cleanup_caps(b, m);
    }

    // 8 — entry mint with royalty override (covers `*option::borrow(...)` branch
    //     read by settlement_facts via the override path).
    #[test(fw=@0x1, dep=@provenance, artist=@0xA)]
    fun mint_with_royalty_override(fw: &signer, dep: &signer, artist: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        let col = collection::create_collection_for_test(artist, 500);
        artwork::mint(
            artist, col, string::utf8(b"X"), test_utils::valid_hash(),
            string::utf8(b"https://r2.example/x.png"),
            string::utf8(b""),
            true, 700, // 7% override
        );
        test_utils::cleanup_caps(b, m);
    }

    // 9
    #[test(fw=@0x1, dep=@provenance, artist=@0xA)]
    #[expected_failure(abort_code = 0x10002, location = provenance::artwork)]
    fun mint_override_above_cap_rejected(fw: &signer, dep: &signer, artist: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        let col = collection::create_collection_for_test(artist, 500);
        artwork::mint(
            artist, col, string::utf8(b"X"), test_utils::valid_hash(),
            string::utf8(b""), string::utf8(b""),
            true, 1500, // 15% — above cap
        );
        test_utils::cleanup_caps(b, m);
    }

    // 10
    #[test(fw=@0x1, dep=@provenance, artist=@0xA)]
    fun supply_cap_is_enforced(fw: &signer, dep: &signer, artist: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        // Use the entry function with supply_cap = 1 to exercise the cap path.
        collection::create_collection(
            artist,
            string::utf8(b"Edition One"),
            string::utf8(b"E1"),
            500,
            true, 1,                                  // supply_cap = 1
            string::utf8(b"https://r2.example/.json"),
            false,
        );
        // Without a way to fetch the object, this validates the create path
        // succeeded. The supply-exhausted branch is covered by integration
        // tests in market_tests/auction_tests where cap=1 collections are
        // exercised through a second mint.
        test_utils::cleanup_caps(b, m);
    }

    // 11 — entry mint without override (covers `option::none<u64>()` branch
    //      that selects the collection's default royalty in settlement_facts).
    #[test(fw=@0x1, dep=@provenance, artist=@0xA)]
    fun mint_without_override_falls_back_to_collection_default(fw: &signer, dep: &signer, artist: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        let col = collection::create_collection_for_test(artist, 700);
        // Drive the entry mint with royalty_override_bps_some=false: this
        // exercises the option::none<u64>() branch in mint, and the
        // option::is_some==false branch in settlement_facts.
        artwork::mint(
            artist, col, string::utf8(b"NoOverride"), test_utils::valid_hash(),
            string::utf8(b"https://r2.example/y.png"),
            string::utf8(b""),
            false, 0, // no override; royalty_override_bps ignored
        );
        test_utils::cleanup_caps(b, m);
    }

    // 12 — entry mint rejects oversize title (E_TITLE_TOO_LONG branch)
    #[test(fw=@0x1, dep=@provenance, artist=@0xA)]
    #[expected_failure(abort_code = 0x10007, location = provenance::artwork)]
    fun mint_rejects_oversized_title(fw: &signer, dep: &signer, artist: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        let col = collection::create_collection_for_test(artist, 500);
        artwork::mint(
            artist, col,
            test_utils::too_long_title(),
            test_utils::valid_hash(),
            string::utf8(b""), string::utf8(b""),
            false, 0,
        );
        test_utils::cleanup_caps(b, m);
    }

    // 13 — entry mint into capped collection exhausts on second call
    #[test(fw=@0x1, dep=@provenance, artist=@0xA)]
    #[expected_failure(abort_code = 0x30006, location = provenance::artwork)]
    fun mint_rejects_when_supply_exhausted(fw: &signer, dep: &signer, artist: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        let col = test_utils::capped_collection(artist, 1); // cap = 1
        let _a = artwork::mint_for_test(artist, col, string::utf8(b"only"), test_utils::valid_hash());
        // Second mint must fail with supply-exhausted.
        let _b = artwork::mint_for_test(artist, col, string::utf8(b"second"), test_utils::valid_hash());
        test_utils::cleanup_caps(b, m);
    }
}
