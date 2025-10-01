import React, { useState, useEffect } from 'react';
import { 
  useCurrentAccount, 
  useSignAndExecuteTransaction,
  ConnectButton,
  useSuiClient 
} from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { 
  Wallet, 
  Plus, 
  Vote, 
  Clock, 
  CheckCircle, 
  XCircle,
  ArrowUpRight,
  Users,
  DollarSign
} from 'lucide-react';

// Contract configuration
const PACKAGE_ID = '0x0ae29b6c03c9151219c92a18e34561b47493f384ec479aa47bcc988ca7b40952';
const MODULE_NAME = 'dao_treasury';

interface Proposal {
  id: number;
  title: string;
  description: string;
  amount: number;
  recipient: string;
  proposer: string;
  createdAt: number;
  votingEndTime: number;
  yesVotes: number;
  noVotes: number;
  status: number;
}

const DAOTreasury: React.FC = () => {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  const [treasuryBalance, setTreasuryBalance] = useState<number>(0);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [members, setMembers] = useState<string[]>([]);
  const [showCreateProposal, setShowCreateProposal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Mock treasury object ID - in real app, this would be fetched from contract events
  const TREASURY_ID = '0x1234567890abcdef'; // Placeholder

  // Create proposal form state
  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
    amount: '',
    recipient: ''
  });

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return 'Active';
      case 1: return 'Passed';
      case 2: return 'Rejected';
      case 3: return 'Executed';
      default: return 'Unknown';
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return 'text-blue-600 bg-blue-100';
      case 1: return 'text-green-600 bg-green-100';
      case 2: return 'text-red-600 bg-red-100';
      case 3: return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatSUI = (amount: number) => {
    return (amount / 1_000_000_000).toFixed(4);
  };

  const createProposal = async () => {
    if (!account) return;

    setLoading(true);
    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::create_proposal`,
        arguments: [
          tx.object(TREASURY_ID), // treasury object
          tx.pure.string(newProposal.title),
          tx.pure.string(newProposal.description),
          tx.pure.u64(parseFloat(newProposal.amount) * 1_000_000_000), // Convert to MIST
          tx.pure.address(newProposal.recipient),
          tx.object('0x6'), // clock object
        ],
      });

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log('Proposal created:', result);
            setShowCreateProposal(false);
            setNewProposal({ title: '', description: '', amount: '', recipient: '' });
            // Refresh proposals
            fetchProposals();
          },
          onError: (error) => {
            console.error('Error creating proposal:', error);
          },
        }
      );
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const voteOnProposal = async (proposalId: number, vote: boolean) => {
    if (!account) return;

    setLoading(true);
    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::vote_on_proposal`,
        arguments: [
          tx.object(TREASURY_ID), // treasury object
          tx.pure.u64(proposalId),
          tx.pure.bool(vote),
          tx.object('0x6'), // clock object
        ],
      });

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log('Vote cast:', result);
            // Refresh proposals
            fetchProposals();
          },
          onError: (error) => {
            console.error('Error voting:', error);
          },
        }
      );
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeProposal = async (proposalId: number) => {
    if (!account) return;

    setLoading(true);
    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::execute_proposal`,
        arguments: [
          tx.object(TREASURY_ID), // treasury object
          tx.pure.u64(proposalId),
          tx.object('0x6'), // clock object
        ],
      });

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log('Proposal executed:', result);
            // Refresh proposals and balance
            fetchProposals();
            fetchTreasuryBalance();
          },
          onError: (error) => {
            console.error('Error executing proposal:', error);
          },
        }
      );
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTreasuryBalance = async () => {
    // In a real app, this would fetch the actual treasury balance
    // For demo purposes, we'll use a mock value
    setTreasuryBalance(5000000000000); // 5000 SUI in MIST
  };

  const fetchProposals = async () => {
    // In a real app, this would fetch actual proposals from the contract
    // For demo purposes, we'll use mock data
    const mockProposals: Proposal[] = [
      {
        id: 0,
        title: "Repair the elevator",
        description: "Fix the broken elevator in the main building",
        amount: 500000000000, // 500 SUI in MIST
        recipient: "0x1234567890abcdef1234567890abcdef12345678",
        proposer: "0xabcdef1234567890abcdef1234567890abcdef12",
        createdAt: Date.now() - 86400000, // 1 day ago
        votingEndTime: Date.now() + 518400000, // 6 days from now
        yesVotes: 3,
        noVotes: 1,
        status: 0 // Active
      },
      {
        id: 1,
        title: "Community event funding",
        description: "Fund the upcoming community meetup event",
        amount: 200000000000, // 200 SUI in MIST
        recipient: "0xabcdef1234567890abcdef1234567890abcdef12",
        proposer: "0x1234567890abcdef1234567890abcdef12345678",
        createdAt: Date.now() - 172800000, // 2 days ago
        votingEndTime: Date.now() + 432000000, // 5 days from now
        yesVotes: 5,
        noVotes: 0,
        status: 1 // Passed
      }
    ];
    setProposals(mockProposals);
  };

  const fetchMembers = async () => {
    // In a real app, this would fetch actual members from the contract
    const mockMembers = [
      "0xf1a6cc3e4ae2609dbd6fd79499803ad59322d114be93111d8f46c8a47b988d92",
      "0x1234567890abcdef1234567890abcdef12345678",
      "0xabcdef1234567890abcdef1234567890abcdef12"
    ];
    setMembers(mockMembers);
  };

  useEffect(() => {
    if (account) {
      fetchTreasuryBalance();
      fetchProposals();
      fetchMembers();
    }
  }, [account]);

  if (!account) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <Wallet className="mx-auto h-12 w-12 text-blue-600 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              DAO Treasury Demo
            </h1>
            <p className="text-gray-600 mb-6">
              Connect your Sui wallet to access the decentralized treasury management system.
            </p>
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">DAO Treasury</h1>
              <p className="text-gray-600 mt-1">
                Transparent community fund management on Sui
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <ConnectButton />
            </div>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Treasury Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatSUI(treasuryBalance)} SUI
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <Vote className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Proposals</p>
                <p className="text-2xl font-bold text-gray-900">
                  {proposals.filter(p => p.status === 0).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">DAO Members</p>
                <p className="text-2xl font-bold text-gray-900">{members.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Proposals Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Proposals</h2>
            <button
              onClick={() => setShowCreateProposal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create Proposal</span>
            </button>
          </div>

          <div className="space-y-4">
            {proposals.map((proposal) => (
              <div key={proposal.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {proposal.title}
                    </h3>
                    <p className="text-gray-600 mt-1">{proposal.description}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(proposal.status)}`}>
                    {getStatusText(proposal.status)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Amount</p>
                    <p className="font-semibold">{formatSUI(proposal.amount)} SUI</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Recipient</p>
                    <p className="font-mono text-xs">{proposal.recipient.slice(0, 10)}...</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Voting</p>
                    <p className="font-semibold text-green-600">
                      {proposal.yesVotes} Yes / {proposal.noVotes} No
                    </p>
                  </div>
                </div>

                {proposal.status === 0 && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => voteOnProposal(proposal.id, true)}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center space-x-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Vote Yes</span>
                    </button>
                    <button
                      onClick={() => voteOnProposal(proposal.id, false)}
                      disabled={loading}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center space-x-2"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Vote No</span>
                    </button>
                  </div>
                )}

                {proposal.status === 1 && (
                  <button
                    onClick={() => executeProposal(proposal.id)}
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded flex items-center space-x-2"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    <span>Execute Proposal</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Create Proposal Modal */}
        {showCreateProposal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Create New Proposal</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newProposal.title}
                    onChange={(e) => setNewProposal({...newProposal, title: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g., Repair the elevator"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newProposal.description}
                    onChange={(e) => setNewProposal({...newProposal, description: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    rows={3}
                    placeholder="Detailed description of the proposal"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (SUI)
                  </label>
                  <input
                    type="number"
                    value={newProposal.amount}
                    onChange={(e) => setNewProposal({...newProposal, amount: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="500"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient Address
                  </label>
                  <input
                    type="text"
                    value={newProposal.recipient}
                    onChange={(e) => setNewProposal({...newProposal, recipient: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="0x..."
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={createProposal}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
                >
                  {loading ? 'Creating...' : 'Create Proposal'}
                </button>
                <button
                  onClick={() => setShowCreateProposal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DAOTreasury;