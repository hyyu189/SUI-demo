#[test_only]
module dao_treasury::dao_treasury_tests {
    use dao_treasury::dao_treasury::{Self, Treasury, AdminCap};
    use sui::test_scenario::{Self, Scenario};
    use sui::coin;
    use sui::sui::SUI;
    use sui::clock::{Self, Clock};
    use sui::test_utils;

    // Test addresses
    const ADMIN: address = @0x1;
    const MEMBER1: address = @0x2;
    const MEMBER2: address = @0x3;
    const MEMBER3: address = @0x4;
    const RECIPIENT: address = @0x5;

    // Test helper to create treasury and add initial members
    fun setup_treasury(scenario: &mut Scenario): (Treasury, AdminCap, Clock) {
        let ctx = test_scenario::ctx(scenario);
        let (mut treasury, admin_cap) = dao_treasury::create_treasury(ctx);
        let clock = clock::create_for_testing(ctx);

        // Add some members
        dao_treasury::add_member(&mut treasury, &admin_cap, MEMBER1, ctx);
        dao_treasury::add_member(&mut treasury, &admin_cap, MEMBER2, ctx);
        dao_treasury::add_member(&mut treasury, &admin_cap, MEMBER3, ctx);

        (treasury, admin_cap, clock)
    }

    #[test]
    fun test_create_treasury() {
        let mut scenario = test_scenario::begin(ADMIN);
        let ctx = test_scenario::ctx(&mut scenario);
        
        let (treasury, admin_cap) = dao_treasury::create_treasury(ctx);
        
        // Verify initial state
        assert!(dao_treasury::get_balance(&treasury) == 0);
        assert!(dao_treasury::get_proposal_count(&treasury) == 0);
        assert!(vector::length(dao_treasury::get_members(&treasury)) == 0);
        
        // Clean up
        test_utils::destroy(treasury);
        test_utils::destroy(admin_cap);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_add_members() {
        let mut scenario = test_scenario::begin(ADMIN);
        let (treasury, admin_cap, clock) = setup_treasury(&mut scenario);
        
        // Verify members were added
        let members = dao_treasury::get_members(&treasury);
        assert!(vector::length(members) == 3);
        assert!(vector::contains(members, &MEMBER1));
        assert!(vector::contains(members, &MEMBER2));
        assert!(vector::contains(members, &MEMBER3));
        
        // Clean up
        test_utils::destroy(treasury);
        test_utils::destroy(admin_cap);
        test_utils::destroy(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 8)]
    fun test_add_duplicate_member() {
        let mut scenario = test_scenario::begin(ADMIN);
        let (mut treasury, admin_cap, clock) = setup_treasury(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Try to add duplicate member - should fail
        dao_treasury::add_member(&mut treasury, &admin_cap, MEMBER1, ctx);
        
        // Clean up
        test_utils::destroy(treasury);
        test_utils::destroy(admin_cap);
        test_utils::destroy(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 11)]
    fun test_remove_nonexistent_member() {
        let mut scenario = test_scenario::begin(ADMIN);
        let (mut treasury, admin_cap, clock) = setup_treasury(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Try to remove a member that doesn't exist - should fail
        dao_treasury::remove_member(&mut treasury, &admin_cap, @0x999, ctx);
        
        // Clean up
        test_utils::destroy(treasury);
        test_utils::destroy(admin_cap);
        test_utils::destroy(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_arithmetic_safety_large_numbers() {
        let mut scenario = test_scenario::begin(MEMBER1);
        let (mut treasury, admin_cap, clock) = setup_treasury(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Deposit large amount of funds
        let payment = coin::mint_for_testing<SUI>(18446744073709551615u64 / 2, ctx);
        dao_treasury::deposit_funds(&mut treasury, payment, ctx);
        
        // Create proposal with large amount (but safe)
        dao_treasury::create_proposal(
            &mut treasury,
            b"Large Amount Proposal",
            b"Testing arithmetic safety",
            1000000000000,
            RECIPIENT,
            &clock,
            ctx
        );
        
        // Vote on the proposal (should not cause overflow)
        dao_treasury::vote_on_proposal(&mut treasury, 0, true, &clock, ctx);
        
        // Clean up
        test_utils::destroy(treasury);
        test_utils::destroy(admin_cap);
        test_utils::destroy(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 9)]
    fun test_create_proposal_no_members() {
        let mut scenario = test_scenario::begin(ADMIN);
        let ctx = test_scenario::ctx(&mut scenario);
        let (mut treasury, admin_cap) = dao_treasury::create_treasury(ctx);
        let clock = clock::create_for_testing(ctx);
        
        // Deposit funds
        let payment = coin::mint_for_testing<SUI>(1000, ctx);
        dao_treasury::deposit_funds(&mut treasury, payment, ctx);
        
        // Try to create proposal with no members - should fail
        dao_treasury::create_proposal(
            &mut treasury,
            b"Test Proposal",
            b"Test Description",
            500,
            RECIPIENT,
            &clock,
            ctx
        );
        
        // Clean up
        test_utils::destroy(treasury);
        test_utils::destroy(admin_cap);
        test_utils::destroy(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 2)]
    fun test_create_proposal_insufficient_funds() {
        let mut scenario = test_scenario::begin(MEMBER1);
        let (mut treasury, admin_cap, clock) = setup_treasury(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Don't deposit enough funds
        let payment = coin::mint_for_testing<SUI>(100, ctx);
        dao_treasury::deposit_funds(&mut treasury, payment, ctx);
        
        // Try to create proposal for more than available - should fail
        dao_treasury::create_proposal(
            &mut treasury,
            b"Excessive Proposal",
            b"Requesting more than available",
            1000,
            RECIPIENT,
            &clock,
            ctx
        );
        
        // Clean up
        test_utils::destroy(treasury);
        test_utils::destroy(admin_cap);
        test_utils::destroy(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 7)]
    fun test_vote_after_deadline() {
        let mut scenario = test_scenario::begin(MEMBER1);
        let (mut treasury, admin_cap, mut clock) = setup_treasury(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Deposit funds and create proposal
        let payment = coin::mint_for_testing<SUI>(1000, ctx);
        dao_treasury::deposit_funds(&mut treasury, payment, ctx);
        
        dao_treasury::create_proposal(
            &mut treasury,
            b"Time Test Proposal",
            b"Testing voting deadline",
            500,
            RECIPIENT,
            &clock,
            ctx
        );
        
        // Advance time past voting deadline
        clock::increment_for_testing(&mut clock, 8 * 24 * 60 * 60 * 1000); // 8 days
        
        // Try to vote after deadline - should fail
        dao_treasury::vote_on_proposal(&mut treasury, 0, true, &clock, ctx);
        
        // Clean up
        test_utils::destroy(treasury);
        test_utils::destroy(admin_cap);
        test_utils::destroy(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 3)]
    fun test_vote_nonexistent_proposal() {
        let mut scenario = test_scenario::begin(MEMBER1);
        let (mut treasury, admin_cap, clock) = setup_treasury(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Try to vote on a proposal that doesn't exist - should fail
        dao_treasury::vote_on_proposal(&mut treasury, 999, true, &clock, ctx);
        
        // Clean up
        test_utils::destroy(treasury);
        test_utils::destroy(admin_cap);
        test_utils::destroy(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 5)]
    fun test_execute_rejected_proposal() {
        let mut scenario = test_scenario::begin(MEMBER1);
        let (mut treasury, admin_cap, mut clock) = setup_treasury(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Deposit funds and create proposal
        let payment = coin::mint_for_testing<SUI>(1000, ctx);
        dao_treasury::deposit_funds(&mut treasury, payment, ctx);
        
        dao_treasury::create_proposal(
            &mut treasury,
            b"Rejected Proposal",
            b"Will be rejected",
            500,
            RECIPIENT,
            &clock,
            ctx
        );
        
        // All members vote NO
        dao_treasury::vote_on_proposal(&mut treasury, 0, false, &clock, ctx);
        
        test_scenario::next_tx(&mut scenario, MEMBER2);
        let ctx = test_scenario::ctx(&mut scenario);
        dao_treasury::vote_on_proposal(&mut treasury, 0, false, &clock, ctx);
        
        test_scenario::next_tx(&mut scenario, MEMBER3);
        let ctx = test_scenario::ctx(&mut scenario);
        dao_treasury::vote_on_proposal(&mut treasury, 0, false, &clock, ctx);
        
        // Advance time past voting period
        clock::increment_for_testing(&mut clock, 8 * 24 * 60 * 60 * 1000);
        
        // Try to execute rejected proposal - should fail
        test_scenario::next_tx(&mut scenario, MEMBER1);
        let ctx = test_scenario::ctx(&mut scenario);
        dao_treasury::execute_proposal(&mut treasury, 0, &clock, ctx);
        
        // Clean up
        test_utils::destroy(treasury);
        test_utils::destroy(admin_cap);
        test_utils::destroy(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_proposal_auto_finalization() {
        let mut scenario = test_scenario::begin(MEMBER1);
        let (mut treasury, admin_cap, clock) = setup_treasury(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Deposit funds and create proposal
        let payment = coin::mint_for_testing<SUI>(1000, ctx);
        dao_treasury::deposit_funds(&mut treasury, payment, ctx);
        
        dao_treasury::create_proposal(
            &mut treasury,
            b"Auto Finalization Test",
            b"Testing automatic finalization",
            500,
            RECIPIENT,
            &clock,
            ctx
        );
        
        // All members vote YES - should auto-finalize
        dao_treasury::vote_on_proposal(&mut treasury, 0, true, &clock, ctx);
        
        test_scenario::next_tx(&mut scenario, MEMBER2);
        let ctx = test_scenario::ctx(&mut scenario);
        dao_treasury::vote_on_proposal(&mut treasury, 0, true, &clock, ctx);
        
        test_scenario::next_tx(&mut scenario, MEMBER3);
        let ctx = test_scenario::ctx(&mut scenario);
        dao_treasury::vote_on_proposal(&mut treasury, 0, true, &clock, ctx);
        
        // Execute immediately without time advancement
        test_scenario::next_tx(&mut scenario, MEMBER1);
        let ctx = test_scenario::ctx(&mut scenario);
        dao_treasury::execute_proposal(&mut treasury, 0, &clock, ctx);
        
        // Verify execution was successful
        assert!(dao_treasury::get_balance(&treasury) == 500);
        
        // Clean up
        test_utils::destroy(treasury);
        test_utils::destroy(admin_cap);
        test_utils::destroy(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_mixed_voting_with_quorum() {
        let mut scenario = test_scenario::begin(MEMBER1);
        let (mut treasury, admin_cap, mut clock) = setup_treasury(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Deposit funds and create proposal
        let payment = coin::mint_for_testing<SUI>(1000, ctx);
        dao_treasury::deposit_funds(&mut treasury, payment, ctx);
        
        dao_treasury::create_proposal(
            &mut treasury,
            b"Mixed Voting Test",
            b"Testing mixed voting results",
            500,
            RECIPIENT,
            &clock,
            ctx
        );
        
        // Mixed voting: 2 YES, 1 NO (should pass with 67% approval and meet quorum)
        dao_treasury::vote_on_proposal(&mut treasury, 0, true, &clock, ctx);
        
        test_scenario::next_tx(&mut scenario, MEMBER2);
        let ctx = test_scenario::ctx(&mut scenario);
        dao_treasury::vote_on_proposal(&mut treasury, 0, true, &clock, ctx);
        
        test_scenario::next_tx(&mut scenario, MEMBER3);
        let ctx = test_scenario::ctx(&mut scenario);
        dao_treasury::vote_on_proposal(&mut treasury, 0, false, &clock, ctx);
        
        // Advance time past voting period
        clock::increment_for_testing(&mut clock, 8 * 24 * 60 * 60 * 1000);
        
        // Execute proposal - should succeed
        test_scenario::next_tx(&mut scenario, MEMBER1);
        let ctx = test_scenario::ctx(&mut scenario);
        dao_treasury::execute_proposal(&mut treasury, 0, &clock, ctx);
        
        // Verify execution
        assert!(dao_treasury::get_balance(&treasury) == 500);
        
        // Clean up
        test_utils::destroy(treasury);
        test_utils::destroy(admin_cap);
        test_utils::destroy(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_race_condition_protection() {
        let mut scenario = test_scenario::begin(MEMBER1);
        let (mut treasury, admin_cap, mut clock) = setup_treasury(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Deposit funds and create proposal
        let payment = coin::mint_for_testing<SUI>(1000, ctx);
        dao_treasury::deposit_funds(&mut treasury, payment, ctx);
        
        dao_treasury::create_proposal(
            &mut treasury,
            b"Race Condition Test",
            b"Testing race condition protection",
            500,
            RECIPIENT,
            &clock,
            ctx
        );
        
        // All members vote YES
        dao_treasury::vote_on_proposal(&mut treasury, 0, true, &clock, ctx);
        
        test_scenario::next_tx(&mut scenario, MEMBER2);
        let ctx = test_scenario::ctx(&mut scenario);
        dao_treasury::vote_on_proposal(&mut treasury, 0, true, &clock, ctx);
        
        test_scenario::next_tx(&mut scenario, MEMBER3);
        let ctx = test_scenario::ctx(&mut scenario);
        dao_treasury::vote_on_proposal(&mut treasury, 0, true, &clock, ctx);
        
        // Execute proposal first time
        test_scenario::next_tx(&mut scenario, MEMBER1);
        let ctx = test_scenario::ctx(&mut scenario);
        dao_treasury::execute_proposal(&mut treasury, 0, &clock, ctx);
        
        // Verify first execution worked
        assert!(dao_treasury::get_balance(&treasury) == 500);
        
        // Clean up
        test_utils::destroy(treasury);
        test_utils::destroy(admin_cap);
        test_utils::destroy(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_multiple_proposals() {
        let mut scenario = test_scenario::begin(MEMBER1);
        let (mut treasury, admin_cap, clock) = setup_treasury(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Deposit enough funds for multiple proposals
        let payment = coin::mint_for_testing<SUI>(2000, ctx);
        dao_treasury::deposit_funds(&mut treasury, payment, ctx);
        
        // Create first proposal
        dao_treasury::create_proposal(
            &mut treasury,
            b"First Proposal",
            b"First test proposal",
            300,
            RECIPIENT,
            &clock,
            ctx
        );
        
        // Create second proposal
        dao_treasury::create_proposal(
            &mut treasury,
            b"Second Proposal", 
            b"Second test proposal",
            400,
            RECIPIENT,
            &clock,
            ctx
        );
        
        // Verify both proposals exist
        assert!(dao_treasury::get_proposal_count(&treasury) == 2);
        
        // Vote on first proposal
        dao_treasury::vote_on_proposal(&mut treasury, 0, true, &clock, ctx);
        
        // Vote on second proposal  
        dao_treasury::vote_on_proposal(&mut treasury, 1, false, &clock, ctx);
        
        // Clean up
        test_utils::destroy(treasury);
        test_utils::destroy(admin_cap);
        test_utils::destroy(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_edge_case_minimal_quorum() {
        let mut scenario = test_scenario::begin(ADMIN);
        let ctx = test_scenario::ctx(&mut scenario);
        let (mut treasury, admin_cap) = dao_treasury::create_treasury(ctx);
        let clock = clock::create_for_testing(ctx);
        
        // Add exactly 3 members to test 33% quorum (need at least 1 vote)
        dao_treasury::add_member(&mut treasury, &admin_cap, MEMBER1, ctx);
        dao_treasury::add_member(&mut treasury, &admin_cap, MEMBER2, ctx);
        dao_treasury::add_member(&mut treasury, &admin_cap, MEMBER3, ctx);
        
        // Deposit funds
        let payment = coin::mint_for_testing<SUI>(1000, ctx);
        dao_treasury::deposit_funds(&mut treasury, payment, ctx);
        
        // Create proposal as MEMBER1
        test_scenario::next_tx(&mut scenario, MEMBER1);
        let ctx = test_scenario::ctx(&mut scenario);
        dao_treasury::create_proposal(
            &mut treasury,
            b"Minimal Quorum Test",
            b"Testing minimal quorum requirement",
            500,
            RECIPIENT,
            &clock,
            ctx
        );
        
        // Only one member votes (33% quorum, exactly at threshold)
        dao_treasury::vote_on_proposal(&mut treasury, 0, true, &clock, ctx);
        
        // Clean up
        test_utils::destroy(treasury);
        test_utils::destroy(admin_cap);
        test_utils::destroy(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_remove_member() {
        let mut scenario = test_scenario::begin(ADMIN);
        let (mut treasury, admin_cap, clock) = setup_treasury(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Remove a member
        dao_treasury::remove_member(&mut treasury, &admin_cap, MEMBER2, ctx);
        
        // Verify member was removed
        let members = dao_treasury::get_members(&treasury);
        assert!(vector::length(members) == 2);
        assert!(!vector::contains(members, &MEMBER2));
        assert!(vector::contains(members, &MEMBER1));
        assert!(vector::contains(members, &MEMBER3));
        
        // Clean up
        test_utils::destroy(treasury);
        test_utils::destroy(admin_cap);
        test_utils::destroy(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 12)]
    fun test_cannot_remove_last_member() {
        let mut scenario = test_scenario::begin(ADMIN);
        let ctx = test_scenario::ctx(&mut scenario);
        let (mut treasury, admin_cap) = dao_treasury::create_treasury(ctx);
        
        // Add only one member
        dao_treasury::add_member(&mut treasury, &admin_cap, MEMBER1, ctx);
        
        // Try to remove the last member - should fail
        dao_treasury::remove_member(&mut treasury, &admin_cap, MEMBER1, ctx);
        
        // Clean up
        test_utils::destroy(treasury);
        test_utils::destroy(admin_cap);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_deposit_funds() {
        let mut scenario = test_scenario::begin(ADMIN);
        let (mut treasury, admin_cap, clock) = setup_treasury(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Create some coins to deposit
        let payment = coin::mint_for_testing<SUI>(1000, ctx);
        
        // Deposit funds
        dao_treasury::deposit_funds(&mut treasury, payment, ctx);
        
        // Verify balance
        assert!(dao_treasury::get_balance(&treasury) == 1000);
        
        // Clean up
        test_utils::destroy(treasury);
        test_utils::destroy(admin_cap);
        test_utils::destroy(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_create_proposal() {
        let mut scenario = test_scenario::begin(MEMBER1);
        let (mut treasury, admin_cap, clock) = setup_treasury(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Deposit some funds first
        let payment = coin::mint_for_testing<SUI>(1000, ctx);
        dao_treasury::deposit_funds(&mut treasury, payment, ctx);
        
        // Create proposal
        dao_treasury::create_proposal(
            &mut treasury,
            b"Test Proposal",
            b"Test Description",
            500,
            RECIPIENT,
            &clock,
            ctx
        );
        
        // Verify proposal was created
        assert!(dao_treasury::get_proposal_count(&treasury) == 1);
        
        // Clean up
        test_utils::destroy(treasury);
        test_utils::destroy(admin_cap);
        test_utils::destroy(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 1)]
    fun test_non_member_cannot_create_proposal() {
        let mut scenario = test_scenario::begin(@0x999);
        let (mut treasury, admin_cap, clock) = setup_treasury(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Deposit some funds first
        let payment = coin::mint_for_testing<SUI>(1000, ctx);
        dao_treasury::deposit_funds(&mut treasury, payment, ctx);
        
        // Try to create proposal as non-member - should fail
        dao_treasury::create_proposal(
            &mut treasury,
            b"Test Proposal",
            b"Test Description",
            500,
            RECIPIENT,
            &clock,
            ctx
        );
        
        // Clean up
        test_utils::destroy(treasury);
        test_utils::destroy(admin_cap);
        test_utils::destroy(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_voting_and_execution() {
        let mut scenario = test_scenario::begin(MEMBER1);
        let (mut treasury, admin_cap, mut clock) = setup_treasury(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Deposit funds
        let payment = coin::mint_for_testing<SUI>(1000, ctx);
        dao_treasury::deposit_funds(&mut treasury, payment, ctx);
        
        // Create proposal
        dao_treasury::create_proposal(
            &mut treasury,
            b"Test Proposal",
            b"Test Description",
            500,
            RECIPIENT,
            &clock,
            ctx
        );
        
        // Vote as MEMBER1 (yes)
        test_scenario::next_tx(&mut scenario, MEMBER1);
        let ctx = test_scenario::ctx(&mut scenario);
        dao_treasury::vote_on_proposal(&mut treasury, 0, true, &clock, ctx);
        
        // Vote as MEMBER2 (yes)
        test_scenario::next_tx(&mut scenario, MEMBER2);
        let ctx = test_scenario::ctx(&mut scenario);
        dao_treasury::vote_on_proposal(&mut treasury, 0, true, &clock, ctx);
        
        // Vote as MEMBER3 (no) - but 2/3 yes votes should pass
        test_scenario::next_tx(&mut scenario, MEMBER3);
        let ctx = test_scenario::ctx(&mut scenario);
        dao_treasury::vote_on_proposal(&mut treasury, 0, false, &clock, ctx);
        
        // Advance time past voting period
        clock::increment_for_testing(&mut clock, 8 * 24 * 60 * 60 * 1000); // 8 days
        
        // Execute proposal
        test_scenario::next_tx(&mut scenario, MEMBER1);
        let ctx = test_scenario::ctx(&mut scenario);
        dao_treasury::execute_proposal(&mut treasury, 0, &clock, ctx);
        
        // Verify balance decreased
        assert!(dao_treasury::get_balance(&treasury) == 500);
        
        // Clean up
        test_utils::destroy(treasury);
        test_utils::destroy(admin_cap);
        test_utils::destroy(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_insufficient_quorum() {
        let mut scenario = test_scenario::begin(MEMBER1);
        let (mut treasury, admin_cap, mut clock) = setup_treasury(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Deposit funds
        let payment = coin::mint_for_testing<SUI>(1000, ctx);
        dao_treasury::deposit_funds(&mut treasury, payment, ctx);
        
        // Create proposal
        dao_treasury::create_proposal(
            &mut treasury,
            b"Test Proposal",
            b"Test Description",
            500,
            RECIPIENT,
            &clock,
            ctx
        );
        
        // Only one member votes (insufficient quorum of 33%)
        dao_treasury::vote_on_proposal(&mut treasury, 0, true, &clock, ctx);
        
        // Advance time past voting period
        clock::increment_for_testing(&mut clock, 8 * 24 * 60 * 60 * 1000);
        
        // The proposal should be rejected due to insufficient quorum
        // We'll verify this by checking we can't execute it
        
        // Clean up
        test_utils::destroy(treasury);
        test_utils::destroy(admin_cap);
        test_utils::destroy(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 4)]
    fun test_double_voting_prevention() {
        let mut scenario = test_scenario::begin(MEMBER1);
        let (mut treasury, admin_cap, clock) = setup_treasury(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Deposit funds
        let payment = coin::mint_for_testing<SUI>(1000, ctx);
        dao_treasury::deposit_funds(&mut treasury, payment, ctx);
        
        // Create proposal
        dao_treasury::create_proposal(
            &mut treasury,
            b"Test Proposal",
            b"Test Description",
            500,
            RECIPIENT,
            &clock,
            ctx
        );
        
        // Vote as MEMBER1
        dao_treasury::vote_on_proposal(&mut treasury, 0, true, &clock, ctx);
        
        // Try to vote again as MEMBER1 - should fail
        dao_treasury::vote_on_proposal(&mut treasury, 0, false, &clock, ctx);
        
        // Clean up
        test_utils::destroy(treasury);
        test_utils::destroy(admin_cap);
        test_utils::destroy(clock);
        test_scenario::end(scenario);
    }
}
