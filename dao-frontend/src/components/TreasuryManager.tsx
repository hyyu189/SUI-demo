import React, { useState, useEffect } from 'react';
import { 
  useCurrentAccount, 
  useSignAndExecuteTransaction,
  useSuiClient 
} from '@mysten/dapp-kit';
import { 
  Plus, 
  Search, 
  AlertCircle,
  RefreshCw,
  Wallet,
  Building,
  Users,
  TrendingUp,
  ArrowRight,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  findTreasuryObjectsByEvent,
  createTreasuryTx
} from '../utils/suiUtils';
import {
  cn,
  layoutClasses,
  cardVariants,
  buttonVariants,
  typographyClasses,
  animationClasses,
  loadingClasses,
  getStaggerDelay
} from '../utils/styles';
import DAOTreasury from './DAOTreasury';
import { SuiObjectResponse } from '@mysten/sui/client';

type TreasuryObject = SuiObjectResponse;

// Helper to safely extract fields from treasury object
const getTreasuryFields = (treasury: SuiObjectResponse) => {
  if (treasury.data?.content?.dataType === 'moveObject') {
    return treasury.data.content.fields as any;
  }
  return null;
};

const TreasuryManager: React.FC = () => {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  const [treasuryObjects, setTreasuryObjects] = useState<TreasuryObject[]>([]);
  const [selectedTreasury, setSelectedTreasury] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadTreasuryObjects = async () => {
    if (!account) return;
    try {
      setLoading(true);
      setError(null);
      const objects = await findTreasuryObjectsByEvent(suiClient);
      setTreasuryObjects(objects);
      if (objects.length > 0 && !selectedTreasury) {
        setSelectedTreasury(objects[0].data?.objectId || null);
      }
    } catch (err) {
      const errorMessage = 'Failed to load treasury objects. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error loading treasuries:', err);
    } finally {
      setLoading(false);
    }
  };

  const createNewTreasury = async () => {
    if (!account) return;
    try {
      setCreating(true);
      setError(null);
      const tx = createTreasuryTx();
      
      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log('Treasury created:', result);
            toast.success('Treasury created successfully!');
            setTimeout(() => {
              loadTreasuryObjects();
            }, 2000);
          },
          onError: (error) => {
            console.error('Error creating treasury:', error);
            const errorMessage = 'Failed to create treasury. Please try again.';
            setError(errorMessage);
            toast.error(errorMessage);
          },
        }
      );
    } catch (err) {
      console.error('Error:', err);
      const errorMessage = 'Failed to create treasury. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const formatSUI = (amount: string | number): string => {
    const numAmount = typeof amount === 'string' ? parseInt(amount) : amount;
    return (numAmount / 1_000_000_000).toFixed(4);
  };

  const formatDate = (timestamp: string): string => {
    try {
      const date = new Date(parseInt(timestamp) * 1000);
      return date.toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  const filteredTreasuries = treasuryObjects.filter(treasury => 
    treasury.data?.objectId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (account) {
      loadTreasuryObjects();
    }
  }, [account]);

  if (!account) {
    return null;
  }

  if (selectedTreasury) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <DAOTreasury 
          treasuryId={selectedTreasury}
          onBack={() => setSelectedTreasury(null)}
        />
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className={layoutClasses.container}>
        {/* Header Section */}
        <motion.div 
          className="treasury-header animate-fade-in"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="treasury-title">
                DAO Treasury Manager
              </h1>
              <p className="treasury-subtitle">
                Manage your decentralized autonomous organization treasuries with ease.
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Wallet className="h-4 w-4 mr-1" />
                  Connected
                </div>
                <div className="flex items-center">
                  <Building className="h-4 w-4 mr-1" />
                  {treasuryObjects.length} Treasur{treasuryObjects.length !== 1 ? 'ies' : 'y'}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <div className="bg-error-50 border border-error-200 rounded-xl p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-error-600 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-error-800">Error</p>
                    <p className="text-sm text-error-600 mt-1">{error}</p>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="ml-auto text-error-500 hover:text-error-700"
                  >
                    ×
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Existing Treasuries Section */}
          <motion.div 
            className="lg:col-span-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className={cn(cardVariants.default, "p-6")}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={typographyClasses.h2}>Existing Treasuries</h2>
                <button
                  onClick={loadTreasuryObjects}
                  disabled={loading}
                  className={cn(buttonVariants.ghost, "btn-sm")}
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                  Refresh
                </button>
              </div>

              {/* Search Bar */}
              {treasuryObjects.length > 0 && (
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search treasury by ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="form-input pl-10"
                  />
                </div>
              )}

              {/* Treasury List */}
              <div className="space-y-4">
                {loading ? (
                  /* Loading State */
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="skeleton h-24 rounded-xl" />
                    ))}
                  </div>
                ) : filteredTreasuries.length > 0 ? (
                  /* Treasury Cards */
                  <AnimatePresence>
                    {filteredTreasuries.map((treasury, index) => (
                      <motion.div
                        key={treasury.data?.objectId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        style={getStaggerDelay(index)}
                        className={cn(cardVariants.interactive, "p-4 hover:bg-gray-50")}
                        onClick={() => setSelectedTreasury(treasury.data?.objectId || null)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <Building className="h-5 w-5 text-primary-600" />
                              <span className="font-mono text-sm text-gray-600">
                                {treasury.data?.objectId?.slice(0, 8)}...{treasury.data?.objectId?.slice(-6)}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div className="flex items-center">
                                <TrendingUp className="h-4 w-4 text-success-500 mr-1" />
                                <span className="text-gray-600">
                                  {formatSUI(getTreasuryFields(treasury)?.balance || '0')} SUI
                                </span>
                              </div>
                              <div className="flex items-center">
                                <Users className="h-4 w-4 text-primary-500 mr-1" />
                                <span className="text-gray-600">
                                  {getTreasuryFields(treasury)?.member_count || '0'} members
                                </span>
                              </div>
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 text-gray-400 mr-1" />
                                <span className="text-gray-600">
                                  {formatDate(getTreasuryFields(treasury)?.created_at || '0')}
                                </span>
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                ) : (
                  /* Empty State */
                  <div className="text-center py-12">
                    <Building className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className={cn(typographyClasses.h3, "text-gray-600 mb-2")}>
                      No Treasuries Found
                    </h3>
                    <p className="text-gray-500 mb-6">
                      {searchTerm ? 
                        'No treasuries match your search criteria.' : 
                        'Create your first DAO treasury to get started.'
                      }
                    </p>
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className={cn(buttonVariants.secondary, "btn-sm")}
                      >
                        Clear Search
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Create Treasury Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className={cn(cardVariants.primary, "p-6 sticky top-6")}>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto bg-primary-100 rounded-2xl flex items-center justify-center mb-4">
                  <Plus className="h-8 w-8 text-primary-600" />
                </div>
                <h2 className={cn(typographyClasses.h3, "text-gray-900 mb-3")}>
                  Create New Treasury
                </h2>
                <p className="text-body text-gray-600 mb-6">
                  Deploy a new DAO treasury contract to start managing funds collectively.
                </p>
                
                <button
                  onClick={createNewTreasury}
                  disabled={creating || loading}
                  className={cn(
                    buttonVariants.primary,
                    "w-full mb-4",
                    (creating || loading) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {creating ? (
                    <>
                      <div className={loadingClasses.spinner} />
                      <span>Creating Treasury...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5 mr-2" />
                      <span>Create Treasury</span>
                    </>
                  )}
                </button>

                <div className="text-left space-y-3 pt-4 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-900 text-sm">Features included:</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mr-3" />
                      Multi-signature governance
                    </li>
                    <li className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mr-3" />
                      Proposal-based funding
                    </li>
                    <li className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mr-3" />
                      Transparent voting
                    </li>
                    <li className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mr-3" />
                      On-chain execution
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default TreasuryManager;