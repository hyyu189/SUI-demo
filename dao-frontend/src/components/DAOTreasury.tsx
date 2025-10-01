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
  DollarSign,
  ArrowLeft,
  Clock,
  TrendingUp,
  Activity,
  Calendar,
  Target,
  RefreshCw,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { PACKAGE_ID, MODULE_NAME } from '../utils/suiUtils';
import { 
  cn, 
  layoutClasses, 
  cardVariants, 
  buttonVariants, 
  typographyClasses,
  getProposalStatusStyle,
  getProposalCardStyle,
  getStaggerDelay,
  loadingClasses
} from '../utils/styles';

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
  onBack?: () => void;
}

const DAOTreasury: React.FC<DAOTreasuryProps> = ({ treasuryId, onBack }) => {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  const [treasuryBalance, setTreasuryBalance] = useState<number>(0);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [members, setMembers] = useState<string[]>([]);
  const [showCreateProposal, setShowCreateProposal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [votingLoading, setVotingLoading] = useState<number | null>(null);
  const [executingLoading, setExecutingLoading] = useState<number | null>(null);

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

  const formatSUI = (amount: number) => {
    return (amount / 1_000_000_000).toFixed(4);
  };

  const formatDate = (timestamp: number) => {
    try {
      const date = new Date(timestamp * 1000);
      return date.toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  const getVotingProgress = (yesVotes: number, noVotes: number) => {
    const total = yesVotes + noVotes;
    if (total === 0) return { yesPercentage: 0, noPercentage: 0 };
    return {
      yesPercentage: (yesVotes / total) * 100,
      noPercentage: (noVotes / total) * 100
    };
  };

  const createProposal = async () => {
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
            toast.success('Proposal created successfully!');
            setShowCreateProposal(false);
            setNewProposal({ title: '', description: '', amount: '', recipient: '' });
            fetchTreasuryData();
          },
          onError: (error) => {
            console.error('Error creating proposal:', error);
            toast.error('Failed to create proposal. Please try again.');
          },
        }
      );
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to create proposal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const voteOnProposal = async (proposalId: number, vote: boolean) => {
    if (!account) return;
    setVotingLoading(proposalId);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::vote_on_proposal`,
        arguments: [
          tx.object(treasuryId),
          tx.pure.u64(proposalId),
          tx.pure.bool(vote),
          tx.object('0x6'),
        ],
      });
      signAndExecute({ transaction: tx }, {
        onSuccess: (result) => {
          console.log('Vote cast:', result);
          toast.success(`Vote ${vote ? 'Yes' : 'No'} cast successfully!`);
          fetchTreasuryData();
        },
        onError: (error) => {
          console.error('Error voting:', error);
          toast.error('Failed to cast vote. Please try again.');
        },
      });
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to cast vote. Please try again.');
    } finally {
      setVotingLoading(null);
    }
  };

  const executeProposal = async (proposalId: number) => {
    if (!account) return;
    setExecutingLoading(proposalId);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::execute_proposal`,
        arguments: [
          tx.object(treasuryId),
          tx.pure.u64(proposalId),
          tx.object('0x6'),
        ],
      });
      signAndExecute({ transaction: tx }, {
        onSuccess: (result) => {
          console.log('Proposal executed:', result);
          toast.success('Proposal executed successfully!');
          fetchTreasuryData();
        },
        onError: (error) => {
          console.error('Error executing proposal:', error);
          toast.error('Failed to execute proposal. Please try again.');
        },
      });
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to execute proposal. Please try again.');
    } finally {
      setExecutingLoading(null);
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
      toast.error('Failed to load treasury data. Please refresh.');
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
    <div className="min-h-screen">
      <div className={layoutClasses.container}>
        {/* Header Section */}
        <motion.div 
          className="treasury-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className={cn(buttonVariants.ghost, "btn-sm")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </button>
              )}
              <div>
                <h1 className="treasury-title">DAO Treasury</h1>
                <p className="treasury-subtitle">
                  Decentralized treasury management on Sui blockchain.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchTreasuryData}
                disabled={loading}
                className={cn(buttonVariants.ghost, "btn-sm")}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                Refresh
              </button>
              <ConnectButton />
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="stats-card">
            <DollarSign className="h-8 w-8 text-success-600 mb-3" />
            <p className="stats-label">Treasury Balance</p>
            <p className="stats-value">
              {formatSUI(treasuryBalance)} SUI
            </p>
          </div>
          <div className="stats-card">
            <Activity className="h-8 w-8 text-primary-600 mb-3" />
            <p className="stats-label">Active Proposals</p>
            <p className="stats-value">
              {proposals.filter(p => p.status === 0).length}
            </p>
          </div>
          <div className="stats-card">
            <Users className="h-8 w-8 text-purple-600 mb-3" />
            <p className="stats-label">DAO Members</p>
            <p className="stats-value">{members.length}</p>
          </div>
        </motion.div>

        {/* Proposals Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className={cn(cardVariants.default, "p-6")}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={typographyClasses.h2}>Proposals</h2>
              <button
                onClick={() => setShowCreateProposal(true)}
                className={cn(buttonVariants.primary, "btn-sm")}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Proposal
              </button>
            </div>

            <div className="space-y-4">
              {loading ? (
                /* Loading State */
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="skeleton h-32 rounded-xl" />
                  ))}
                </div>
              ) : proposals.length > 0 ? (
                /* Proposals List */
                <AnimatePresence>
                  {proposals.map((proposal, index) => {
                    const { yesPercentage, noPercentage } = getVotingProgress(proposal.yesVotes, proposal.noVotes);
                    
                    return (
                      <motion.div
                        key={proposal.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        style={getStaggerDelay(index)}
                        className={getProposalCardStyle(proposal.status)}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className={cn(typographyClasses.h3, "text-gray-900")}>
                                {proposal.title}
                              </h3>
                              <span className={getProposalStatusStyle(proposal.status)}>
                                {getStatusText(proposal.status)}
                              </span>
                            </div>
                            <p className="text-body text-gray-600 mb-3">{proposal.description}</p>
                            
                            {/* Proposal Details */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500">
                              <div className="flex items-center">
                                <Target className="h-4 w-4 mr-1" />
                                {formatSUI(proposal.amount)} SUI
                              </div>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {formatDate(proposal.createdAt)}
                              </div>
                              <div className="flex items-center">
                                <Vote className="h-4 w-4 mr-1" />
                                {proposal.yesVotes + proposal.noVotes} votes
                              </div>
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                Ends {formatDate(proposal.votingEndTime)}
                              </div>
                            </div>

                            {/* Voting Progress */}
                            {(proposal.yesVotes > 0 || proposal.noVotes > 0) && (
                              <div className="mt-4">
                                <div className="flex justify-between text-sm text-gray-500 mb-2">
                                  <span>Yes: {proposal.yesVotes}</span>
                                  <span>No: {proposal.noVotes}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div className="flex h-2 rounded-full overflow-hidden">
                                    <div 
                                      className="bg-success-500" 
                                      style={{ width: `${yesPercentage}%` }}
                                    />
                                    <div 
                                      className="bg-error-500" 
                                      style={{ width: `${noPercentage}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex space-x-3">
                          {proposal.status === 0 && (
                            <>
                              <button
                                onClick={() => voteOnProposal(proposal.id, true)}
                                disabled={votingLoading === proposal.id}
                                className="action-btn action-btn-vote-yes"
                              >
                                {votingLoading === proposal.id ? (
                                  <div className={loadingClasses.spinner} />
                                ) : (
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                )}
                                Vote Yes
                              </button>
                              <button
                                onClick={() => voteOnProposal(proposal.id, false)}
                                disabled={votingLoading === proposal.id}
                                className="action-btn action-btn-vote-no"
                              >
                                {votingLoading === proposal.id ? (
                                  <div className={loadingClasses.spinner} />
                                ) : (
                                  <XCircle className="h-4 w-4 mr-2" />
                                )}
                                Vote No
                              </button>
                            </>
                          )}
                          {proposal.status === 1 && (
                            <button
                              onClick={() => executeProposal(proposal.id)}
                              disabled={executingLoading === proposal.id}
                              className="action-btn action-btn-execute"
                            >
                              {executingLoading === proposal.id ? (
                                <div className={loadingClasses.spinner} />
                              ) : (
                                <ArrowUpRight className="h-4 w-4 mr-2" />
                              )}
                              Execute Proposal
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              ) : (
                /* Empty State */
                <div className="text-center py-12">
                  <Vote className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className={cn(typographyClasses.h3, "text-gray-600 mb-2")}>
                    No Proposals Yet
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Create the first proposal to start DAO governance.
                  </p>
                  <button
                    onClick={() => setShowCreateProposal(true)}
                    className={cn(buttonVariants.primary, "btn-sm")}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Proposal
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Create Proposal Modal */}
        <AnimatePresence>
          {showCreateProposal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="modal-overlay"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="modal-content max-w-lg w-full mx-4 p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className={typographyClasses.h3}>Create New Proposal</h3>
                  <button
                    onClick={() => setShowCreateProposal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Proposal Title
                    </label>
                    <input
                      type="text"
                      value={newProposal.title}
                      onChange={(e) => setNewProposal({...newProposal, title: e.target.value})}
                      className="form-input"
                      placeholder="Enter proposal title..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={newProposal.description}
                      onChange={(e) => setNewProposal({...newProposal, description: e.target.value})}
                      className="form-textarea"
                      rows={4}
                      placeholder="Describe the proposal in detail..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount (SUI)
                    </label>
                    <input
                      type="number"
                      value={newProposal.amount}
                      onChange={(e) => setNewProposal({...newProposal, amount: e.target.value})}
                      className="form-input"
                      placeholder="0.0"
                      step="0.1"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Recipient Address
                    </label>
                    <input
                      type="text"
                      value={newProposal.recipient}
                      onChange={(e) => setNewProposal({...newProposal, recipient: e.target.value})}
                      className="form-input font-mono text-sm"
                      placeholder="0x..."
                    />
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={createProposal}
                    disabled={loading || !newProposal.title || !newProposal.recipient}
                    className={cn(
                      buttonVariants.primary,
                      "flex-1",
                      (loading || !newProposal.title || !newProposal.recipient) && 
                      "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {loading ? (
                      <>
                        <div className={loadingClasses.spinner} />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Proposal
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowCreateProposal(false)}
                    className={cn(buttonVariants.secondary, "flex-1")}
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DAOTreasury;