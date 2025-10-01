import React, { useState, useEffect } from 'react';
import { 
  useCurrentAccount, 
  useSignAndExecuteTransaction,
  ConnectButton,
  useSuiClient 
} from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { 
  Plus, 
  Vote, 
  CheckCircle, 
  XCircle,
  ArrowUpRight,
  Users,
  DollarSign
} from 'lucide-react';
import { PACKAGE_ID, MODULE_NAME } from '../utils/suiUtils';

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

interface DAOTreasuryProps {
  treasuryId: string;
}

const DAOTreasury: React.FC<DAOTreasuryProps> = ({ treasuryId }) => {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  const [treasuryBalance, setTreasuryBalance] = useState<number>(0);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [members, setMembers] = useState<string[]>([]);
  const [showCreateProposal, setShowCreateProposal] = useState(false);
  const [loading, setLoading] = useState(false);

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
          tx.object(treasuryId),
          tx.pure.string(newProposal.title),
          tx.pure.string(newProposal.description),
          tx.pure.u64(BigInt(parseFloat(newProposal.amount) * 1_000_000_000)),
          tx.pure.address(newProposal.recipient),
          tx.object('0x6'),
        ],
      });
      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log('Proposal created:', result);
            setShowCreateProposal(false);
            setNewProposal({ title: '', description: '', amount: '', recipient: '' });
            fetchTreasuryData();
          },
          onError: (error) => console.error('Error creating proposal:', error),
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
          tx.object(treasuryId),
          tx.pure(proposalId),
          tx.pure(vote),
          tx.object('0x6'),
        ],
      });
      signAndExecute({ transaction: tx }, {
        onSuccess: (result) => {
          console.log('Vote cast:', result);
          fetchTreasuryData();
        },
        onError: (error) => console.error('Error voting:', error),
      });
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
          tx.object(treasuryId),
          tx.pure(proposalId),
          tx.object('0x6'),
        ],
      });
      signAndExecute({ transaction: tx }, {
        onSuccess: (result) => {
          console.log('Proposal executed:', result);
          fetchTreasuryData();
        },
        onError: (error) => console.error('Error executing proposal:', error),
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTreasuryData = async () => {
    setLoading(true);
    try {
      const treasuryObject = await suiClient.getObject({
        id: treasuryId,
        options: { showContent: true },
      });

      if (treasuryObject.data?.content?.dataType === 'moveObject') {
        const fields = treasuryObject.data.content.fields as any;
        setTreasuryBalance(parseInt(fields.balance));
        setMembers(fields.members);

        const proposalTableId = fields.proposals.fields.id.id;
        const proposalIds = await suiClient.getDynamicFields({ parentId: proposalTableId });
        const proposalObjects = await suiClient.multiGetObjects({
          ids: proposalIds.data.map(obj => obj.objectId),
          options: { showContent: true },
        });

        const fetchedProposals = proposalObjects.map(obj => {
          const content = obj.data?.content as any;
          return {
            ...content.fields.value.fields,
            id: parseInt(content.fields.name),
          };
        }).sort((a, b) => a.id - b.id);
        
        setProposals(fetchedProposals);
      }
    } catch (error) {
      console.error('Error fetching treasury data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (treasuryId) {
      fetchTreasuryData();
    }
  }, [treasuryId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">DAO Treasury</h1>
              <p className="text-gray-600 mt-1">
                A decentralized treasury management system on Sui.
              </p>
            </div>
            <ConnectButton />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <DollarSign className="h-8 w-8 text-green-500 mb-2" />
            <p className="text-sm font-medium text-gray-500">Treasury Balance</p>
            <p className="text-2xl font-semibold text-gray-800">
              {formatSUI(treasuryBalance)} SUI
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <Vote className="h-8 w-8 text-blue-500 mb-2" />
            <p className="text-sm font-medium text-gray-500">Active Proposals</p>
            <p className="text-2xl font-semibold text-gray-800">
              {proposals.filter(p => p.status === 0).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <Users className="h-8 w-8 text-purple-500 mb-2" />
            <p className="text-sm font-medium text-gray-500">DAO Members</p>
            <p className="text-2xl font-semibold text-gray-800">{members.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Proposals</h2>
            <button
              onClick={() => setShowCreateProposal(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>New Proposal</span>
            </button>
          </div>
          <div className="space-y-4">
            {proposals.map((proposal) => (
              <div key={proposal.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {proposal.title}
                    </h3>
                    <p className="text-gray-600 mt-1">{proposal.description}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(proposal.status)}`}>
                    {getStatusText(proposal.status)}
                  </span>
                </div>
                {proposal.status === 0 && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => voteOnProposal(proposal.id, true)}
                      disabled={loading}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Vote Yes</span>
                    </button>
                    <button
                      onClick={() => voteOnProposal(proposal.id, false)}
                      disabled={loading}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
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
                    className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    <span>Execute Proposal</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {showCreateProposal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Create a New Proposal</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  value={newProposal.title}
                  onChange={(e) => setNewProposal({...newProposal, title: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Title"
                />
                <textarea
                  value={newProposal.description}
                  onChange={(e) => setNewProposal({...newProposal, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Description"
                />
                <input
                  type="number"
                  value={newProposal.amount}
                  onChange={(e) => setNewProposal({...newProposal, amount: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Amount (SUI)"
                  step="0.1"
                />
                <input
                  type="text"
                  value={newProposal.recipient}
                  onChange={(e) => setNewProposal({...newProposal, recipient: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Recipient Address"
                />
              </div>
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={createProposal}
                  disabled={loading}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg"
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
                <button
                  onClick={() => setShowCreateProposal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg"
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