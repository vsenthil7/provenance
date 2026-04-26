#[test_only]
module provenance::test_utils {
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    use std::option;
    use aptos_framework::account;
    use aptos_framework::aptos_coin::{Self, AptosCoin};
    use aptos_framework::coin::{Self, Coin, BurnCapability, MintCapability};
    use aptos_framework::object::{Self, Object};
    use aptos_framework::timestamp;
    use aptos_framework::event;

    use provenance::counters;
    use provenance::collection::{Self, Collection};
    use provenance::artwork::{Self, Artwork};

    /// Sets up clock + counters + AptosCoin mint cap. Caller is responsible
    /// for cleaning up the caps via `cleanup_caps`.
    public fun setup(framework: &signer, deployer: &signer): (BurnCapability<AptosCoin>, MintCapability<AptosCoin>) {
        timestamp::set_time_has_started_for_testing(framework);
        let deployer_addr = signer::address_of(deployer);
        if (!account::exists_at(deployer_addr)) {
            account::create_account_for_test(deployer_addr);
        };
        counters::init_for_test(deployer);
        let (burn, mint) = aptos_coin::initialize_for_test(framework);
        (burn, mint)
    }

    /// Create an account at `addr`, register an AptosCoin store, deposit
    /// `amount` uinit. Idempotent on existing accounts.
    public fun fund(addr: address, amount: u64, mint_cap: &MintCapability<AptosCoin>) {
        if (!account::exists_at(addr)) {
            account::create_account_for_test(addr);
        };
        if (!coin::is_account_registered<AptosCoin>(addr)) {
            let acct = account::create_signer_for_test(addr);
            coin::register<AptosCoin>(&acct);
        };
        if (amount > 0) {
            let coins = coin::mint<AptosCoin>(amount, mint_cap);
            coin::deposit(addr, coins);
        }
    }

    /// Mint a coin of exact value without depositing.
    public fun mint_coin(amount: u64, mint_cap: &MintCapability<AptosCoin>): Coin<AptosCoin> {
        coin::mint<AptosCoin>(amount, mint_cap)
    }

    /// 32-byte deterministic content hash for tests.
    public fun valid_hash(): vector<u8> {
        let v = vector::empty<u8>();
        let i = 0;
        while (i < 32) {
            vector::push_back(&mut v, (i as u8));
            i = i + 1;
        };
        v
    }

    /// 31-byte hash — used to test the I-ART-2 "must be 32 bytes" branch.
    public fun bad_hash(): vector<u8> {
        let v = vector::empty<u8>();
        let i = 0;
        while (i < 31) {
            vector::push_back(&mut v, (i as u8));
            i = i + 1;
        };
        v
    }

    /// Build a string that exceeds artwork::MAX_TITLE_LEN (256). Used to
    /// trigger the E_TITLE_TOO_LONG branch.
    public fun too_long_title(): String {
        let v = vector::empty<u8>();
        let i = 0;
        while (i < 257) {
            vector::push_back(&mut v, 65u8); // 'A'
            i = i + 1;
        };
        string::utf8(v)
    }

    /// Build a symbol string that exceeds collection::MAX_SYMBOL_LEN (8).
    public fun too_long_symbol(): String {
        string::utf8(b"NINELONG9")
    }

    /// Create a collection + an artwork in one call.
    public fun mint_artwork_for(
        artist: &signer, royalty_bps: u64,
    ): (Object<Collection>, Object<Artwork>) {
        let col = collection::create_collection_for_test(artist, royalty_bps);
        let art = artwork::mint_for_test(artist, col, string::utf8(b"Untitled"), valid_hash());
        (col, art)
    }

    /// Create a collection where mutable_metadata = true. Used by tests that
    /// exercise set_metadata_uri.
    public fun mutable_collection(artist: &signer): Object<Collection> {
        collection::create_collection_with_options_for_test(
            artist,
            500,
            string::utf8(b"Mutable Collection"),
            string::utf8(b"MUT"),
            option::none<u64>(),
            string::utf8(b"https://r2.example/v1.json"),
            true, // mutable_metadata
        )
    }

    /// Create a collection with a supply cap. Used by tests that exhaust supply.
    public fun capped_collection(artist: &signer, cap: u64): Object<Collection> {
        collection::create_collection_with_options_for_test(
            artist,
            500,
            string::utf8(b"Capped Collection"),
            string::utf8(b"CAP"),
            option::some(cap),
            string::utf8(b"https://r2.example/cap.json"),
            false,
        )
    }

    public fun cleanup_caps(burn: BurnCapability<AptosCoin>, mint: MintCapability<AptosCoin>) {
        coin::destroy_burn_cap(burn);
        coin::destroy_mint_cap(mint);
    }

    /// Treasury address used by royalty::settle. Tests must register it
    /// before calling settle.
    public fun treasury_addr(): address { @0xFEE }

    /// Advance the test clock by `secs` seconds.
    public fun forward_secs(secs: u64) {
        let now = timestamp::now_seconds();
        timestamp::update_global_time_for_test_secs(now + secs);
    }

    // Touch event::emitted_events so the unused-import warning under #[test_only]
    // is suppressed when callers don't yet read events.
    #[test_only]
    public fun event_count<T: drop + store>(): u64 {
        (vector::length(&event::emitted_events<T>()) as u64)
    }
}
