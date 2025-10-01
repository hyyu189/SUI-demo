import React, { useState, useEffect } from 'react';
import { 
  useCurrentAccount, 
  useSignAndExecuteTransaction,
  useSuiClient 
} from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import {
  ArrowLeft,
  Plus,
  Vote,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  Users,
  DollarSign,
  AlertCircle,
  RefreshCw,
  Wallet
} from 'lucide-react';
import ProposalTimeline from './ProposalTimeline';
import AdminPanel from './AdminPanel';
import {
  formatSUI,
  suiToMist,
  formatAddress,
  getProposalStatusText,
  getProposalStatusColor,
  isMember,
  PACKAGE_ID,
  MODULE_NAME
} from '../utils/suiUtils';

interface DAOTreasuryInterfaceProps {
  treasury: any;
  adminCap: any;
  onBack: () => void;
  refreshTreasuries: () => void;
}

const DAOTreasuryInterface: React.FC<DAOTreasuryInterfaceProps> = ({ 
  treasury,
  adminCap,
  onBack,
  refreshTreasuries
}) => {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  const treasuryId = treasury.data?.objectId;

  const [activeTab, setActiveTab] = useState('proposals');
  const [showCreateProposal, setShowCreateProposal] = useState(false);
  const [showDepositFunds, setShowDepositFunds] = useState(false);
  const [transactionLoading, setTransactionLoading] = useState(false);

  // Treasury data state
  const [balance, setBalance] = useState('0');
  const [proposals, setProposals] = useState<any[]>([]);
  const [members, setMembers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create proposal form state
  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
    amount: '',
    recipient: ''
  });

  // Deposit funds form state
  const [depositAmount, setDepositAmount] = useState('');

  const userIsMember = account ? isMember(account.address, members) : false;

  // Fetch treasury data
  const refreshData = async () => {
    if (!treasuryId) return;

    setIsLoading(true);
    setError(null);
    try {
      const treasuryObject = await suiClient.getObject({
        id: treasuryId,
        options: { showContent: true },
      });

      if (treasuryObject.data?.content?.dataType === 'moveObject') {
        const fields = treasuryObject.data.content.fields as any;
        setBalance(fields.balance || '0');

        // Ensure proposals is always an array
        const proposalsData = fields.proposals || [];
        setProposals(Array.isArray(proposalsData) ? proposalsData : []);

        // Ensure members is always an array
        const membersData = fields.members || [];
        setMembers(Array.isArray(membersData) ? membersData : []);
      }
    } catch (err) {
      console.error('Error fetching treasury data:', err);
      setError('Failed to load treasury data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (treasuryId) {
      refreshData();
    }
  }, [treasuryId]);

  const createProposal = async () => {
    if (!account || !newProposal.title || !newProposal.amount || !newProposal.recipient) return;

    setTransactionLoading(true);
    try {
      const amountInMist = suiToMist(newProposal.amount);
      const tx = new Transaction();

      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::create_proposal`,
        arguments: [
          tx.object(treasuryId),
          tx.pure.string(newProposal.title),
          tx.pure.string(newProposal.description),
          tx.pure.u64(amountInMist),
          tx.pure.address(newProposal.recipient),
          tx.object('0x6'), // Clock object
        ],
      });

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log('Proposal created:', result);
            setShowCreateProposal(false);
            setNewProposal({ title: '', description: '', amount: '', recipient: '' });
            refreshData();
          },
          onError: (error) => {
            console.error('Error creating proposal:', error);
          },
        }
      );
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setTransactionLoading(false);
    }
  };

  const voteOnProposal = async (proposalId: number, vote: boolean) => {
    if (!account) return;

    setTransactionLoading(true);
    try {
      const tx = new Transaction();

      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::vote`,
        arguments: [
          tx.object(treasuryId),
          tx.pure.u64(proposalId),
          tx.pure.bool(vote),
        ],
      });

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log('Vote cast:', result);
            refreshData();
          },
          onError: (error) => {
            console.error('Error voting:', error);
          },
        }
      );
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setTransactionLoading(false);
    }
  };

  const executeProposal = async (proposalId: number) => {
    if (!account) return;

    setTransactionLoading(true);
    try {
      const tx = new Transaction();

      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::execute_proposal`,
        arguments: [
          tx.object(treasuryId),
          tx.pure.u64(proposalId),
        ],
      });

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log('Proposal executed:', result);
            refreshData();
          },
          onError: (error) => {
            console.error('Error executing proposal:', error);
          },
        }
      );
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setTransactionLoading(false);
    }
  };

  const depositFunds = async () => {
    if (!account || !depositAmount) return;

    setTransactionLoading(true);
    try {
      const amountInMist = suiToMist(depositAmount);
      const tx = new Transaction();
      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amountInMist)]);

      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::deposit_funds`,
        arguments: [
          tx.object(treasuryId),
          coin,
        ],
      });

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log('Funds deposited:', result);
            setShowDepositFunds(false);
            setDepositAmount('');
            refreshData();
          },
          onError: (error) => {
            console.error('Error depositing funds:', error);
          },
        }
      );
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setTransactionLoading(false);
    }
  };

  if (!account) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="bg-gray-100 hover:bg-gray-200 p-2 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">DAO Treasury</h1>
                <p className="text-gray-600 mt-1">
                  ID: {formatAddress(treasuryId, 8)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={refreshData}
                disabled={isLoading}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Member Status */}
        {!userIsMember && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
              <span className="text-yellow-800">
                You are not a member of this DAO. Contact an admin to be added.
              </span>
            </div>
          </div>
        )}

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Treasury Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatSUI(balance)} SUI
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
                  {(proposals || []).filter((p: any) => p.status === 0).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">DAO Members</p>
                <p className="text-2xl font-bold text-gray-900">{(members || []).length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setShowDepositFunds(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center justify-center space-x-2"
          >
            <Wallet className="h-5 w-5" />
            <span>Deposit Funds</span>
          </button>

          {userIsMember && (
            <button
              onClick={() => setShowCreateProposal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center justify-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Create Proposal</span>
            </button>
          )}
        </div>

        {/* Main Content Grid */}
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-4" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('proposals')}
              className={`px-3 py-2 font-medium text-sm rounded-t-lg ${
                activeTab === 'proposals' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Proposals
            </button>
            {adminCap && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-2 font-medium text-sm rounded-t-lg ${
                  activeTab === 'admin' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Admin Panel
              </button>
            )}
          </nav>
        </div>

        {activeTab === 'proposals' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Proposals Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Active Proposals</h2>

              {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Loading proposals...</p>
              </div>
            ) : (proposals || []).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No proposals yet. Create the first one!</p>
              </div>
            ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {(proposals || []).map((proposal: any) => (
                    <div key={proposal.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {proposal.title}
                          </h3>
                          <p className="text-gray-600 mt-1 text-sm">{proposal.description}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getProposalStatusColor(proposal.status)}`}>
                          {getProposalStatusText(proposal.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500">Amount</p>
                          <p className="font-semibold">{formatSUI(proposal.amount)} SUI</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Voting</p>
                          <p className="font-semibold text-green-600">
                            {proposal.yesVotes} Yes / {proposal.noVotes} No
                          </p>
                        </div>
                      </div>

                      {proposal.status === 0 && userIsMember && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => voteOnProposal(proposal.id, true)}
                            disabled={transactionLoading}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                          >
                            <CheckCircle className="h-3 w-3" />
                            <span>Yes</span>
                          </button>
                          <button
                            onClick={() => voteOnProposal(proposal.id, false)}
                            disabled={transactionLoading}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                          >
                            <XCircle className="h-3 w-3" />
                            <span>No</span>
                          </button>
                        </div>
                      )}

                      {proposal.status === 1 && userIsMember && (
                        <button
                          onClick={() => executeProposal(proposal.id)}
                          disabled={transactionLoading}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                        >
                          <ArrowUpRight className="h-3 w-3" />
                          <span>Execute</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Timeline Section */}
            <div>
              <ProposalTimeline 
                treasuryId={treasuryId} 
                proposals={proposals} 
              />
            </div>
          </div>
        )}
        
        {activeTab === 'admin' && adminCap && (
          <AdminPanel
            treasuryId={treasuryId}
            adminCapId={adminCap.data.objectId}
            onMembersUpdated={refreshTreasuries}
          />
        )}

        {/* Deposit Funds Modal */}
        {showDepositFunds && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Deposit Funds</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (SUI)
                  </label>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="10.0"
                    step="0.1"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={depositFunds}
                  disabled={transactionLoading || !depositAmount}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg disabled:opacity-50"
                >
                  {transactionLoading ? 'Depositing...' : 'Deposit'}
                </button>
                <button
                  onClick={() => setShowDepositFunds(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

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
                  disabled={transactionLoading || !newProposal.title || !newProposal.amount || !newProposal.recipient}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg disabled:opacity-50"
                >
                  {transactionLoading ? 'Creating...' : 'Create Proposal'}
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

export default DAOTreasuryInterface;