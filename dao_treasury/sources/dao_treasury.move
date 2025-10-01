/// A decentralized autonomous organization (DAO) treasury contract for Sui
/// Enables transparent management of shared funds with proposal-based voting
module dao_treasury::dao_treasury {
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::clock::{Self, Clock};
    use std::vector;
    use std::string::{Self, String};

    // Error codes
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_INSUFFICIENT_FUNDS: u64 = 2;
    const E_PROPOSAL_NOT_FOUND: u64 = 3;
    const E_ALREADY_VOTED: u64 = 4;
    const E_PROPOSAL_NOT_PASSED: u64 = 5;
    const E_PROPOSAL_ALREADY_EXECUTED: u64 = 6;
    const E_VOTING_PERIOD_ENDED: u64 = 7;
    const E_MEMBER_ALREADY_EXISTS: u64 = 8;
    const E_NO_MEMBERS_IN_DAO: u64 = 9;
    const E_ARITHMETIC_OVERFLOW: u64 = 10;
    const E_MEMBER_NOT_FOUND: u64 = 11;
    const E_CANNOT_REMOVE_LAST_MEMBER: u64 = 12;
    const E_INVALID_ADMIN_TRANSFER: u64 = 13;
    const E_INSUFFICIENT_QUORUM: u64 = 14;
    const E_PROPOSAL_ALREADY_FINALIZED: u64 = 15;

    // Constants
    const VOTING_PERIOD_MS: u64 = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    const MIN_APPROVAL_PERCENTAGE: u64 = 51; // 51% approval required
    const MIN_QUORUM_PERCENTAGE: u64 = 33; // 33% minimum quorum required

    // Proposal status
    const STATUS_ACTIVE: u8 = 0;
    const STATUS_PASSED: u8 = 1;
    const STATUS_REJECTED: u8 = 2;
    const STATUS_EXECUTED: u8 = 3;

    /// Main DAO Treasury object
    public struct Treasury has key {
        id: UID,
        balance: Balance<SUI>,
        members: vector<address>,
        next_proposal_id: u64,
        proposals: vector<Proposal>,
    }

    /// Individual proposal structure
    public struct Proposal has store {
        id: u64,
        title: String,
        description: String,
        amount: u64,
        recipient: address,
        proposer: address,
        created_at: u64,
        voting_end_time: u64,
        yes_votes: u64,
        no_votes: u64,
        voters: vector<address>,
        status: u8,
    }

    /// Admin capability for treasury management
    public struct AdminCap has key {
        id: UID,
    }

    // Events
    public struct TreasuryCreated has copy, drop {
        treasury_id: address,
        creator: address,
    }

    public struct MemberAdded has copy, drop {
        treasury_id: address,
        member: address,
    }

    public struct MemberRemoved has copy, drop {
        treasury_id: address,
        member: address,
    }

    public struct FundsDeposited has copy, drop {
        treasury_id: address,
        amount: u64,
        depositor: address,
    }

    public struct ProposalCreated has copy, drop {
        treasury_id: address,
        proposal_id: u64,
        title: String,
        amount: u64,
        proposer: address,
    }

    public struct VoteCast has copy, drop {
        treasury_id: address,
        proposal_id: u64,
        voter: address,
        vote: bool, // true for yes, false for no
    }

    public struct ProposalExecuted has copy, drop {
        treasury_id: address,
        proposal_id: u64,
        amount: u64,
        recipient: address,
    }

    /// Initialize a new DAO Treasury
    public fun create_treasury(ctx: &mut TxContext): (Treasury, AdminCap) {
        let treasury_id = object::new(ctx);
        let treasury_address = object::uid_to_address(&treasury_id);
        
        let treasury = Treasury {
            id: treasury_id,
            balance: balance::zero(),
            members: vector::empty(),
            next_proposal_id: 0,
            proposals: vector::empty(),
        };

        let admin_cap = AdminCap {
            id: object::new(ctx),
        };

        event::emit(TreasuryCreated {
            treasury_id: treasury_address,
            creator: tx_context::sender(ctx),
        });

        (treasury, admin_cap)
    }

    /// Add a member to the DAO
    public fun add_member(
        treasury: &mut Treasury,
        _admin_cap: &AdminCap,
        member: address,
        _ctx: &mut TxContext
    ) {
        // Check if member already exists to prevent duplicates
        assert!(!vector::contains(&treasury.members, &member), E_MEMBER_ALREADY_EXISTS);
        
        vector::push_back(&mut treasury.members, member);
        
        event::emit(MemberAdded {
            treasury_id: object::uid_to_address(&treasury.id),
            member,
        });
    }

    /// Remove a member from the DAO (with access control safeguards)
    public fun remove_member(
        treasury: &mut Treasury,
        _admin_cap: &AdminCap,
        member: address,
        _ctx: &mut TxContext
    ) {
        // Ensure member exists
        assert!(vector::contains(&treasury.members, &member), E_MEMBER_NOT_FOUND);
        
        // Prevent removing the last member to avoid DAO lockout
        assert!(vector::length(&treasury.members) > 1, E_CANNOT_REMOVE_LAST_MEMBER);
        
        // Find and remove the member
        let mut i = 0;
        let len = vector::length(&treasury.members);
        while (i < len) {
            if (*vector::borrow(&treasury.members, i) == member) {
                vector::remove(&mut treasury.members, i);
                break
            };
            i = i + 1;
        };
        
        event::emit(MemberRemoved {
            treasury_id: object::uid_to_address(&treasury.id),
            member,
        });
    }

    /// Deposit funds to the treasury
    public fun deposit_funds(
        treasury: &mut Treasury,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let amount = coin::value(&payment);
        let balance_to_add = coin::into_balance(payment);
        balance::join(&mut treasury.balance, balance_to_add);

        event::emit(FundsDeposited {
            treasury_id: object::uid_to_address(&treasury.id),
            amount,
            depositor: tx_context::sender(ctx),
        });
    }

    /// Create a new proposal
    public fun create_proposal(
        treasury: &mut Treasury,
        title: vector<u8>,
        description: vector<u8>,
        amount: u64,
        recipient: address,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(is_member(treasury, sender), E_NOT_AUTHORIZED);
        assert!(amount <= balance::value(&treasury.balance), E_INSUFFICIENT_FUNDS);
        assert!(vector::length(&treasury.members) > 0, E_NO_MEMBERS_IN_DAO);

        // Convert strings once to avoid moved value error
        let title_str = string::utf8(title);
        let description_str = string::utf8(description);

        let current_time = clock::timestamp_ms(clock);
        let proposal = Proposal {
            id: treasury.next_proposal_id,
            title: title_str,
            description: description_str,
            amount,
            recipient,
            proposer: sender,
            created_at: current_time,
            voting_end_time: current_time + VOTING_PERIOD_MS,
            yes_votes: 0,
            no_votes: 0,
            voters: vector::empty(),
            status: STATUS_ACTIVE,
        };

        vector::push_back(&mut treasury.proposals, proposal);

        // Get the title from the stored proposal to avoid moved value error
        let stored_proposal = vector::borrow(&treasury.proposals, vector::length(&treasury.proposals) - 1);
        // Create a copy of the string using substring to get the full string
        let event_title = string::substring(&stored_proposal.title, 0, string::length(&stored_proposal.title));

        event::emit(ProposalCreated {
            treasury_id: object::uid_to_address(&treasury.id),
            proposal_id: treasury.next_proposal_id,
            title: event_title,
            amount,
            proposer: sender,
        });

        treasury.next_proposal_id = treasury.next_proposal_id + 1;
    }

    /// Cast a vote on a proposal
    /// Cast a vote on a proposal
    public fun vote_on_proposal(
        treasury: &mut Treasury,
        proposal_id: u64,
        vote: bool, // true for yes, false for no
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(is_member(treasury, sender), E_NOT_AUTHORIZED);

        let total_members = vector::length(&treasury.members);
        let treasury_id = object::uid_to_address(&treasury.id);

        let proposal = get_proposal_mut(treasury, proposal_id);
        assert!(clock::timestamp_ms(clock) <= proposal.voting_end_time, E_VOTING_PERIOD_ENDED);
        assert!(!vector::contains(&proposal.voters, &sender), E_ALREADY_VOTED);

        vector::push_back(&mut proposal.voters, sender);

        if (vote) {
            proposal.yes_votes = proposal.yes_votes + 1;
        } else {
            proposal.no_votes = proposal.no_votes + 1;
        };

        // Check if proposal should be finalized
        let total_votes = proposal.yes_votes + proposal.no_votes;
        
        if (total_votes == total_members) {
            // All members have voted, finalize the proposal
            finalize_proposal(proposal, total_members);
        };

        event::emit(VoteCast {
            treasury_id,
            proposal_id,
            voter: sender,
            vote,
        });
    }

    /// Execute a passed proposal with race condition protection
    public fun execute_proposal(
        treasury: &mut Treasury,
        proposal_id: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let treasury_id = object::uid_to_address(&treasury.id);
        let total_members = vector::length(&treasury.members);
        
        // First, get proposal details and update status if needed
        let (amount, recipient) = {
            let proposal = get_proposal_mut(treasury, proposal_id);
            
            // Check if voting period has ended and finalize if needed
            if (proposal.status == STATUS_ACTIVE && 
                clock::timestamp_ms(clock) > proposal.voting_end_time) {
                finalize_proposal(proposal, total_members);
            };

            // Ensure proposal is passed and not already executed
            assert!(proposal.status == STATUS_PASSED, E_PROPOSAL_NOT_PASSED);
            
            // Immediately mark as executed to prevent double execution
            proposal.status = STATUS_EXECUTED;
            
            (proposal.amount, proposal.recipient)
        };
        
        // Verify treasury has sufficient funds after marking as executed
        assert!(amount <= balance::value(&treasury.balance), E_INSUFFICIENT_FUNDS);

        // Execute the proposal
        let payment_balance = balance::split(&mut treasury.balance, amount);
        let payment_coin = coin::from_balance(payment_balance, ctx);
        
        transfer::public_transfer(payment_coin, recipient);

        event::emit(ProposalExecuted {
            treasury_id,
            proposal_id,
            amount,
            recipient,
        });
    }

    // Helper functions

    /// Check if an address is a member of the DAO
    fun is_member(treasury: &Treasury, member: address): bool {
        vector::contains(&treasury.members, &member)
    }

    /// Get a mutable reference to a proposal
    fun get_proposal_mut(treasury: &mut Treasury, proposal_id: u64): &mut Proposal {
        let mut i = 0;
        let len = vector::length(&treasury.proposals);
        while (i < len) {
            let proposal = vector::borrow_mut(&mut treasury.proposals, i);
            if (proposal.id == proposal_id) {
                return proposal
            };
            i = i + 1;
        };
        abort E_PROPOSAL_NOT_FOUND
    }

    /// Finalize a proposal based on voting results with enhanced security
    fun finalize_proposal(proposal: &mut Proposal, total_members: u64) {
        // Prevent division by zero
        assert!(total_members > 0, E_NO_MEMBERS_IN_DAO);
        
        // Prevent double finalization
        assert!(proposal.status == STATUS_ACTIVE, E_PROPOSAL_ALREADY_FINALIZED);
        
        // Calculate total votes
        let total_votes = proposal.yes_votes + proposal.no_votes;
        
        // Use ceiling arithmetic for quorum threshold to enforce true percentage
        let quorum_threshold = (total_members * MIN_QUORUM_PERCENTAGE + 99) / 100;
        
        // Instead of aborting on insufficient quorum, set status to REJECTED
        if (total_votes < quorum_threshold || total_votes == 0) {
            proposal.status = STATUS_REJECTED;
            return
        };
        
        // Use safe arithmetic to prevent overflow
        // Check if yes_votes * 100 would overflow before performing calculation
        let max_safe_votes = 18446744073709551615u64 / 100; // u64::MAX / 100
        assert!(proposal.yes_votes <= max_safe_votes, E_ARITHMETIC_OVERFLOW);
        
        // Calculate approval percentage based on total participating votes (not total members)
        let approval_percentage = (proposal.yes_votes * 100) / total_votes;
        if (approval_percentage >= MIN_APPROVAL_PERCENTAGE) {
            proposal.status = STATUS_PASSED;
        } else {
            proposal.status = STATUS_REJECTED;
        };
    }

    // Public getter functions for frontend integration

    /// Get treasury balance
    public fun get_balance(treasury: &Treasury): u64 {
        balance::value(&treasury.balance)
    }

    /// Get all members
    public fun get_members(treasury: &Treasury): &vector<address> {
        &treasury.members
    }

    /// Get proposal count
    public fun get_proposal_count(treasury: &Treasury): u64 {
        vector::length(&treasury.proposals)
    }

    /// Get proposal details
    public fun get_proposal(treasury: &Treasury, proposal_id: u64): (String, String, u64, address, address, u64, u64, u64, u64, u8) {
        let mut i = 0;
        let len = vector::length(&treasury.proposals);
        while (i < len) {
            let proposal = vector::borrow(&treasury.proposals, i);
            if (proposal.id == proposal_id) {
                return (
                    proposal.title,
                    proposal.description,
                    proposal.amount,
                    proposal.recipient,
                    proposal.proposer,
                    proposal.created_at,
                    proposal.voting_end_time,
                    proposal.yes_votes,
                    proposal.no_votes,
                    proposal.status
                )
            };
            i = i + 1;
        };
        abort E_PROPOSAL_NOT_FOUND
    }

    /// Initialize and share treasury (for deployment)
    public fun init_and_share_treasury(ctx: &mut TxContext) {
        let (treasury, admin_cap) = create_treasury(ctx);
        transfer::share_object(treasury);
        transfer::transfer(admin_cap, tx_context::sender(ctx));
    }
}