import { useState, useEffect } from 'react';
import { useSuiClient, useCurrentAccount } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

// Contract configuration - Updated to new deployed contract with Table storage
export const PACKAGE_ID = '0x2cb4feb7b43c3717b5d7b3b9410719e02adf43ff74e2d8c22595ddf16b8e4ed3';
export const MODULE_NAME = 'dao_treasury';

// Types
export interface Proposal {
  id: number;
  title: string;
  description: string;
  amount: string;
  recipient: string;
  proposer: string;
  createdAt: string;
  votingEndTime: string;
  yesVotes: string;
  noVotes: string;
  status: number;
}

export interface TreasuryState {
  balance: string;
  proposals: Proposal[];
  members: string[];
  isLoading: boolean;
  error: string | null;
}

export const useTreasury = (treasuryId?: string) => {
  const suiClient = useSuiClient();
  const account = useCurrentAccount();
  
  const [state, setState] = useState<TreasuryState>({
    balance: '0',
    proposals: [],
    members: [],
    isLoading: false,
    error: null
  });

  // Fetch treasury balance
  const fetchBalance = async (treasuryObjectId: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Get the treasury object
      const treasuryObject = await suiClient.getObject({
        id: treasuryObjectId,
        options: {
          showContent: true,
          showType: true
        }
      });

      if (treasuryObject.data?.content && 'fields' in treasuryObject.data.content) {
        const fields = treasuryObject.data.content.fields as any;
        const balance = fields.balance?.fields?.value || '0';
        
        setState(prev => ({ 
          ...prev, 
          balance,
          isLoading: false 
        }));
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to fetch treasury balance',
        isLoading: false 
      }));
    }
  };

  // Fetch proposals - Updated for Table storage
  const fetchProposals = async (treasuryObjectId: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Get the treasury object
      const treasuryObject = await suiClient.getObject({
        id: treasuryObjectId,
        options: {
          showContent: true,
          showType: true
        }
      });

      if (treasuryObject.data?.content && 'fields' in treasuryObject.data.content) {
        const fields = treasuryObject.data.content.fields as any;
        
        // With Table storage, we need to get next_proposal_id to know how many proposals exist
        const nextProposalId = parseInt(fields.next_proposal_id || '0');
        const proposals: Proposal[] = [];
        
        // Fetch individual proposals using get_proposal function for O(1) access
        for (let i = 0; i < nextProposalId; i++) {
          try {
            // Call the contract's get_proposal function for each proposal ID
            const result = await suiClient.devInspectTransactionBlock({
              transactionBlock: (() => {
                const tx = new Transaction();
                tx.moveCall({
                  target: `${PACKAGE_ID}::${MODULE_NAME}::get_proposal`,
                  arguments: [
                    tx.object(treasuryObjectId),
                    tx.pure.u64(i),
                  ],
                });
                return tx;
              })(),
              sender: account?.address || '0x0000000000000000000000000000000000000000000000000000000000000000'
            });

            if (result.results?.[0]?.returnValues) {
              const returnValues = result.results[0].returnValues;
              // Parse the returned values: (title, description, amount, recipient, proposer, created_at, voting_end_time, yes_votes, no_votes, status)
              if (returnValues.length >= 10) {
                const proposal: Proposal = {
                  id: i,
                  title: new TextDecoder().decode(new Uint8Array(returnValues[0][0])),
                  description: new TextDecoder().decode(new Uint8Array(returnValues[1][0])),
                  amount: returnValues[2][0].toString(),
                  recipient: `0x${Buffer.from(returnValues[3][0]).toString('hex')}`,
                  proposer: `0x${Buffer.from(returnValues[4][0]).toString('hex')}`,
                  createdAt: returnValues[5][0].toString(),
                  votingEndTime: returnValues[6][0].toString(),
                  yesVotes: returnValues[7][0].toString(),
                  noVotes: returnValues[8][0].toString(),
                  status: parseInt(returnValues[9][0].toString())
                };
                proposals.push(proposal);
              }
            }
          } catch (proposalError) {
            // Proposal might not exist or be accessible, skip it
            console.warn(`Could not fetch proposal ${i}:`, proposalError);
          }
        }

        setState(prev => ({ 
          ...prev, 
          proposals,
          isLoading: false 
        }));
      }
    } catch (error) {
      console.error('Error fetching proposals:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to fetch proposals',
        isLoading: false 
      }));
    }
  };

  // Fetch members
  const fetchMembers = async (treasuryObjectId: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Get the treasury object
      const treasuryObject = await suiClient.getObject({
        id: treasuryObjectId,
        options: {
          showContent: true,
          showType: true
        }
      });

      if (treasuryObject.data?.content && 'fields' in treasuryObject.data.content) {
        const fields = treasuryObject.data.content.fields as any;
        const members = fields.members || [];
        
        setState(prev => ({ 
          ...prev, 
          members,
          isLoading: false 
        }));
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to fetch members',
        isLoading: false 
      }));
    }
  };

  // Create proposal transaction
  const createProposalTx = (
    treasuryObjectId: string,
    title: string,
    description: string,
    amount: string,
    recipient: string
  ) => {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${PACKAGE_ID}::${MODULE_NAME}::create_proposal`,
      arguments: [
        tx.object(treasuryObjectId),
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(title))),
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(description))),
        tx.pure.u64(amount),
        tx.pure.address(recipient),
        tx.object('0x6'), // clock object
      ],
    });

    return tx;
  };

  // Vote on proposal transaction
  const voteOnProposalTx = (
    treasuryObjectId: string,
    proposalId: number,
    vote: boolean
  ) => {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${PACKAGE_ID}::${MODULE_NAME}::vote_on_proposal`,
      arguments: [
        tx.object(treasuryObjectId),
        tx.pure.u64(proposalId),
        tx.pure.bool(vote),
        tx.object('0x6'), // clock object
      ],
    });

    return tx;
  };

  // Execute proposal transaction
  const executeProposalTx = (
    treasuryObjectId: string,
    proposalId: number
  ) => {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${PACKAGE_ID}::${MODULE_NAME}::execute_proposal`,
      arguments: [
        tx.object(treasuryObjectId),
        tx.pure.u64(proposalId),
        tx.object('0x6'), // clock object
      ],
    });

    return tx;
  };

  // NEW: Finalize expired proposal transaction - addresses the orphaned active proposals issue
  const finalizeExpiredProposalTx = (
    treasuryObjectId: string,
    proposalId: number
  ) => {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${PACKAGE_ID}::${MODULE_NAME}::finalize_expired_proposal`,
      arguments: [
        tx.object(treasuryObjectId),
        tx.pure.u64(proposalId),
        tx.object('0x6'), // clock object
      ],
    });

    return tx;
  };

  // Deposit funds transaction
  const depositFundsTx = (
    treasuryObjectId: string,
    coinObjectId: string
  ) => {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${PACKAGE_ID}::${MODULE_NAME}::deposit_funds`,
      arguments: [
        tx.object(treasuryObjectId),
        tx.object(coinObjectId),
      ],
    });

    return tx;
  };

  // Refresh all data
  const refreshData = async (treasuryObjectId: string) => {
    if (!treasuryObjectId) return;
    
    await Promise.all([
      fetchBalance(treasuryObjectId),
      fetchProposals(treasuryObjectId),
      fetchMembers(treasuryObjectId)
    ]);
  };

  // Auto-refresh when account or treasuryId changes
  useEffect(() => {
    if (account && treasuryId) {
      refreshData(treasuryId);
    }
  }, [account, treasuryId]);

  return {
    ...state,
    refreshData,
    createProposalTx,
    voteOnProposalTx,
    executeProposalTx,
    finalizeExpiredProposalTx, // NEW: Export the finalization function
    depositFundsTx,
    fetchBalance,
    fetchProposals,
    fetchMembers
  };
};