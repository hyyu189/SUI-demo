import { useState, useEffect, useCallback } from 'react';
import { useSuiClient, useCurrentAccount } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

// Contract configuration
export const PACKAGE_ID = '0xbcdb693ee0c3a3b66f0c302d1cb2ecf3606398380907409b92133c29eeca3c24';
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
    isLoading: true, // Start with loading true
    error: null
  });

  const fetchTreasuryData = useCallback(async (treasuryObjectId: string) => {
    if (!account) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // 1. Get the treasury object which contains balance, members, and next_proposal_id
      const treasuryObject = await suiClient.getObject({
        id: treasuryObjectId,
        options: {
          showContent: true,
        }
      });

      if (!treasuryObject.data?.content || !('fields' in treasuryObject.data.content)) {
        throw new Error('Invalid treasury object content');
      }

      const fields = treasuryObject.data.content.fields as any;
      const balance = fields.balance?.fields?.value || '0';
      const members = fields.members || [];
      const nextProposalId = parseInt(fields.next_proposal_id || '0');
      
      // 2. Fetch all proposals in parallel
      const proposalPromises = [];
      for (let i = 0; i < nextProposalId; i++) {
        proposalPromises.push(
          suiClient.devInspectTransactionBlock({
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
            sender: account.address
          })
        );
      }

      const proposalResults = await Promise.all(proposalPromises);
      
      const proposals: Proposal[] = proposalResults.map((result, i) => {
        if (result.results?.[0]?.returnValues && result.results[0].returnValues.length >= 10) {
          const returnValues = result.results[0].returnValues;
          return {
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
            status: parseInt(Buffer.from(returnValues[9][0]).toString())
          };
        }
        return null;
      }).filter((p): p is Proposal => p !== null);

      // 3. Update state once with all new data
      setState({
        balance,
        members,
        proposals,
        isLoading: false,
        error: null
      });

    } catch (error) {
      console.error('Error fetching treasury data:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to fetch treasury data',
        isLoading: false 
      }));
    }
  }, [suiClient, account]);

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
        tx.pure.string(title),
        tx.pure.string(description),
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

  // Finalize expired proposal transaction
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
  const refreshData = (treasuryObjectId: string) => {
    if (treasuryObjectId) {
      fetchTreasuryData(treasuryObjectId);
    }
  };

  // Auto-refresh when account or treasuryId changes
  useEffect(() => {
    if (account && treasuryId) {
      fetchTreasuryData(treasuryId);
    }
  }, [account, treasuryId, fetchTreasuryData]);

  return {
    ...state,
    refreshData,
    createProposalTx,
    voteOnProposalTx,
    executeProposalTx,
    finalizeExpiredProposalTx,
    depositFundsTx,
  };
};