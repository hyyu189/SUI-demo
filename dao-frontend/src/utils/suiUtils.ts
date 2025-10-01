import { SuiClient } from '@mysten/sui/client';

// Contract configuration
export const PACKAGE_ID = '0xbcdb693ee0c3a3b66f0c302d1cb2ecf3606398380907409b92133c29eeca3c24';
export const MODULE_NAME = 'dao_treasury';

// Utility functions for Sui contract interactions

/**
 * Finds treasury objects by querying for the TreasuryCreated event.
 * @param suiClient - The SuiClient instance.
 * @returns A promise that resolves to an array of treasury objects.
 */
export const findTreasuryObjectsByEvent = async (suiClient: SuiClient) => {
  try {
    const events = await suiClient.queryEvents({
      query: {
        MoveEventType: `${PACKAGE_ID}::${MODULE_NAME}::TreasuryCreated`,
      },
      order: 'descending',
    });

    const treasuryIds = events.data.map(event => event.parsedJson?.treasury_id);
    return await getTreasuryObjectsByIds(suiClient, treasuryIds);
  } catch (error) {
    console.error('Error finding treasury objects by event:', error);
    return [];
  }
};

/**
 * Gets treasury objects by their IDs.
 * @param suiClient - The SuiClient instance.
 * @param objectIds - An array of object IDs to fetch.
 * @returns A promise that resolves to an array of treasury objects.
 */
export const getTreasuryObjectsByIds = async (suiClient: SuiClient, objectIds: string[]) => {
  if (objectIds.length === 0) {
    return [];
  }
  
  try {
    const objects = await suiClient.multiGetObjects({
      ids: objectIds,
      options: {
        showContent: true,
        showType: true,
        showOwner: true,
      },
    });
    return objects.filter(obj => obj.data?.type?.includes(`${PACKAGE_ID}::${MODULE_NAME}::Treasury`));
  } catch (error) {
    console.error('Error fetching treasury objects:', error);
    return [];
  }
};

/**
 * Create a new treasury instance
 */
export const createTreasuryTx = () => {
  const tx = new (require('@mysten/sui/transactions').Transaction)();
  
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::init_and_share_treasury`,
    arguments: [],
  });

  return tx;
};

/**
 * Format SUI amount from MIST to readable format
 */
export const formatSUI = (amountInMist: string | number): string => {
  const amount = typeof amountInMist === 'string' ? 
    parseInt(amountInMist) : amountInMist;
  return (amount / 1_000_000_000).toFixed(4);
};

/**
 * Convert SUI to MIST
 */
export const suiToMist = (suiAmount: string | number): string => {
  const amount = typeof suiAmount === 'string' ? 
    parseFloat(suiAmount) : suiAmount;
  return Math.floor(amount * 1_000_000_000).toString();
};

/**
 * Format address for display
 */
export const formatAddress = (address: string, length: number = 10): string => {
  if (!address) return '';
  if (address.length <= length * 2) return address;
  return `${address.slice(0, length)}...${address.slice(-length)}`;
};

/**
 * Get status text for proposal
 */
export const getProposalStatusText = (status: number): string => {
  switch (status) {
    case 0: return 'Active';
    case 1: return 'Passed';
    case 2: return 'Rejected';
    case 3: return 'Executed';
    default: return 'Unknown';
  }
};

/**
 * Get status color for proposal
 */
export const getProposalStatusColor = (status: number): string => {
  switch (status) {
    case 0: return 'text-blue-600 bg-blue-100';
    case 1: return 'text-green-600 bg-green-100';
    case 2: return 'text-red-600 bg-red-100';
    case 3: return 'text-purple-600 bg-purple-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};

/**
 * Check if user is a member of the DAO
 */
export const isMember = (userAddress: string, members: string[]): boolean => {
  return members.includes(userAddress);
};

/**
 * Calculate voting percentage
 */
export const calculateVotingPercentage = (yesVotes: string, noVotes: string): number => {
  const yes = parseInt(yesVotes);
  const no = parseInt(noVotes);
  const total = yes + no;
  
  if (total === 0) return 0;
  return Math.round((yes / total) * 100);
};

/**
 * Check if proposal voting period has ended
 */
export const isVotingPeriodEnded = (votingEndTime: string): boolean => {
  const endTime = parseInt(votingEndTime);
  return Date.now() > endTime;
};

/**
 * Get time remaining for voting
 */
export const getTimeRemaining = (votingEndTime: string): string => {
  const endTime = parseInt(votingEndTime);
  const now = Date.now();
  const remaining = endTime - now;
  
  if (remaining <= 0) return 'Voting ended';
  
  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days}d ${hours}h remaining`;
  return `${hours}h remaining`;
};