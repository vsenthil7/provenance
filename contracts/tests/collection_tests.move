#[test_only]
module provenance::collection_tests {
    use std::signer;
    use std::string;
    use std::option;
    use provenance::collection;
    use provenance::test_utils;

    // 1
    #[test(fw=@0x1, dep=@provenance, artist=@0xA)]
    fun create_collection_records_artist(fw: &signer, dep: &signer, artist: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        let col = collection::create_collection_for_test(artist, 500);
        assert!(collection::artist_of(col) == signer::address_of(artist), 0);
        test_utils::cleanup_caps(b, m);
    }

    // 2
    #[test(fw=@0x1, dep=@provenance, artist=@0xA)]
    fun new_collection_starts_unfrozen(fw: &signer, dep: &signer, artist: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        let col = collection::create_collection_for_test(artist, 500);
        assert!(!collection::is_frozen(col), 0);
        test_utils::cleanup_caps(b, m);
    }

    // 3
    #[test(fw=@0x1, dep=@provenance, artist=@0xA)]
    fun freeze_collection_marks_it_frozen(fw: &signer, dep: &signer, artist: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        let col = collection::create_collection_for_test(artist, 500);
        collection::freeze_collection(artist, col);
        assert!(collection::is_frozen(col), 0);
        test_utils::cleanup_caps(b, m);
    }

    // 4
    #[test(fw=@0x1, dep=@provenance, artist=@0xA, intruder=@0xBAD)]
    #[expected_failure(abort_code = 0x50002, location = provenance::collection)]
    fun freeze_rejects_non_artist(fw: &signer, dep: &signer, artist: &signer, intruder: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        test_utils::fund(signer::address_of(intruder), 0, &m);
        let col = collection::create_collection_for_test(artist, 500);
        collection::freeze_collection(intruder, col);
        test_utils::cleanup_caps(b, m);
    }

    // 5
    #[test(fw=@0x1, dep=@provenance, artist=@0xA)]
    #[expected_failure(abort_code = 0x10001, location = provenance::collection)]
    fun create_rejects_royalty_above_cap(fw: &signer, dep: &signer, artist: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        // 1500 bps = 15% — above the 10% cap
        collection::create_collection_for_test(artist, 1500);
        test_utils::cleanup_caps(b, m);
    }

    // 6 — set_metadata_uri on a mutable collection (happy path)
    #[test(fw=@0x1, dep=@provenance, artist=@0xA)]
    fun set_metadata_uri_works_when_mutable(fw: &signer, dep: &signer, artist: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        let col = test_utils::mutable_collection(artist);
        collection::set_metadata_uri(artist, col, string::utf8(b"https://r2.example/v2.json"));
        assert!(collection::metadata_uri_of(col) == string::utf8(b"https://r2.example/v2.json"), 0);
        test_utils::cleanup_caps(b, m);
    }

    // 7 — set_metadata_uri rejected when collection is immutable
    #[test(fw=@0x1, dep=@provenance, artist=@0xA)]
    #[expected_failure(abort_code = 0x30004, location = provenance::collection)]
    fun set_metadata_uri_rejects_immutable(fw: &signer, dep: &signer, artist: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        let col = collection::create_collection_for_test(artist, 500); // mutable=false
        collection::set_metadata_uri(artist, col, string::utf8(b"https://r2.example/v2.json"));
        test_utils::cleanup_caps(b, m);
    }

    // 8 — set_metadata_uri rejected when caller is not the artist
    #[test(fw=@0x1, dep=@provenance, artist=@0xA, intruder=@0xBAD)]
    #[expected_failure(abort_code = 0x50002, location = provenance::collection)]
    fun set_metadata_uri_rejects_non_artist(fw: &signer, dep: &signer, artist: &signer, intruder: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        test_utils::fund(signer::address_of(intruder), 0, &m);
        let col = test_utils::mutable_collection(artist);
        collection::set_metadata_uri(intruder, col, string::utf8(b"https://r2.example/evil.json"));
        test_utils::cleanup_caps(b, m);
    }

    // 9 — symbol length cap is enforced (entry function path)
    #[test(fw=@0x1, dep=@provenance, artist=@0xA)]
    #[expected_failure(abort_code = 0x10006, location = provenance::collection)]
    fun create_rejects_oversized_symbol(fw: &signer, dep: &signer, artist: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        collection::create_collection_with_options_for_test(
            artist,
            500,
            string::utf8(b"X"),
            test_utils::too_long_symbol(),
            option::none<u64>(),
            string::utf8(b""),
            false,
        );
        test_utils::cleanup_caps(b, m);
    }

    // 10 — entry create_collection succeeds and sets unbounded supply by default
    #[test(fw=@0x1, dep=@provenance, artist=@0xA)]
    fun create_collection_entry_path_unbounded_supply(fw: &signer, dep: &signer, artist: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        // Drive the entry function directly with supply_cap_some=false — covers
        // the "no cap" branch of `cap = if (supply_cap_some) ...` in create_collection.
        collection::create_collection(
            artist,
            string::utf8(b"Open Edition"),
            string::utf8(b"OE"),
            500,
            false, 0,
            string::utf8(b"https://r2.example/oe.json"),
            false,
        );
        test_utils::cleanup_caps(b, m);
    }

    // 11 — supply_cap_of returns the configured cap
    #[test(fw=@0x1, dep=@provenance, artist=@0xA)]
    fun supply_cap_view_reports_configured_cap(fw: &signer, dep: &signer, artist: &signer) {
        let (b, m) = test_utils::setup(fw, dep);
        test_utils::fund(signer::address_of(artist), 0, &m);
        let col = test_utils::capped_collection(artist, 7);
        let cap = collection::supply_cap_of(col);
        assert!(option::is_some(&cap), 0);
        assert!(*option::borrow(&cap) == 7, 1);
        assert!(collection::minted_of(col) == 0, 2);
        test_utils::cleanup_caps(b, m);
    }
}
