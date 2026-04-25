#[test_only]
module provenance::test_utils {
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    use aptos_framework::account;
    use aptos_framework::aptos_coin::{Self, AptosCoin};
    use aptos_framework::coin::{Self, Coin, BurnCapability, MintCapability};
    use aptos_framework::object::Object;
    use aptos_framework::timestamp;

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

    /// Create a collection + an artwork in one call.
    public fun mint_artwork_for(
        artist: &signer, royalty_bps: u64,
    ): (Object<Collection>, Object<Artwork>) {
        let col = collection::create_collection_for_test(artist, royalty_bps);
        let art = artwork::mint_for_test(artist, col, string::utf8(b"Untitled"), valid_hash());
        (col, art)
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
}
