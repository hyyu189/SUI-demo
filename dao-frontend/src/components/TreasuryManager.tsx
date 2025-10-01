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
  RefreshCw
} from 'lucide-react';
import { findTreasuryObjects, createTreasuryTx, PACKAGE_ID } from '../utils/suiUtils';
import DAOTreasuryInterface from './DAOTreasuryInterface';

const TreasuryManager: React.FC = () => {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  const [treasuryObjects, setTreasuryObjects] = useState<any[]>([]);
  const [selectedTreasury, setSelectedTreasury] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchId, setSearchId] = useState('');

  // Load existing treasury objects
  const loadTreasuryObjects = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const objects = await findTreasuryObjects(suiClient);
      setTreasuryObjects(objects);
      
      // Auto-select first treasury if available
      if (objects.length > 0 && !selectedTreasury) {
        setSelectedTreasury(objects[0].data?.objectId || null);
      }
    } catch (err) {
      setError('Failed to load treasury objects');
      console.error('Error loading treasuries:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create new treasury
  const createNewTreasury = async () => {
    if (!account) return;

    try {
      setLoading(true);
      setError(null);

      const tx = createTreasuryTx();

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log('Treasury created:', result);
            // Reload treasury objects after creation
            setTimeout(() => {
              loadTreasuryObjects();
            }, 2000);
          },
          onError: (error) => {
            console.error('Error creating treasury:', error);
            setError('Failed to create treasury');
          },
        }
      );
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to create treasury');
    } finally {
      setLoading(false);
    }
  };

  // Search for treasury by ID
  const searchTreasuryById = async () => {
    if (!searchId.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const object = await suiClient.getObject({
        id: searchId.trim(),
        options: {
          showContent: true,
          showType: true,
          showOwner: true
        }
      });

      if (object.data?.type?.includes('Treasury')) {
        setSelectedTreasury(searchId.trim());
        // Add to treasury objects if not already there
        const exists = treasuryObjects.find(obj => obj.data?.objectId === searchId.trim());
        if (!exists) {
          setTreasuryObjects(prev => [...prev, object]);
        }
      } else {
        setError('Object is not a valid Treasury');
      }
    } catch (err) {
      setError('Treasury not found or invalid ID');
      console.error('Error searching treasury:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (account) {
      loadTreasuryObjects();
    }
  }, [account]);

  if (!account) {
    return null; // This will be handled by parent component
  }

  // If a treasury is selected, show the interface
  if (selectedTreasury) {
    return (
      <DAOTreasuryInterface 
        treasuryId={selectedTreasury}
        onBack={() => setSelectedTreasury(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              DAO Treasury Manager
            </h1>
            <p className="text-gray-600">
              Select an existing treasury or create a new one
            </p>
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

        {/* Search Treasury */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Search Treasury by ID
          </h2>
          <div className="flex space-x-2">
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Enter treasury object ID (0x...)"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
            />
            <button
              onClick={searchTreasuryById}
              disabled={loading || !searchId.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              <span>Search</span>
            </button>
          </div>
        </div>

        {/* Existing Treasuries */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Existing Treasuries
            </h2>
            <button
              onClick={loadTreasuryObjects}
              disabled={loading}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {loading && treasuryObjects.length === 0 ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Loading treasuries...</p>
            </div>
          ) : treasuryObjects.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No treasuries found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {treasuryObjects.map((treasury) => (
                <div
                  key={treasury.data?.objectId}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer"
                  onClick={() => setSelectedTreasury(treasury.data?.objectId || '')}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">
                        Treasury #{treasury.data?.objectId?.slice(-8)}
                      </p>
                      <p className="text-sm text-gray-500 font-mono">
                        {treasury.data?.objectId}
                      </p>
                      <p className="text-sm text-gray-500">
                        Owner: {treasury.data?.owner && typeof treasury.data.owner === 'object' && 'AddressOwner' in treasury.data.owner 
                          ? treasury.data.owner.AddressOwner 
                          : 'Shared'}
                      </p>
                    </div>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                      Select
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create New Treasury */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Create New Treasury
          </h2>
          <p className="text-gray-600 mb-4">
            Deploy a new DAO treasury contract. This will create a shared object that multiple users can interact with.
          </p>
          <button
            onClick={createNewTreasury}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 disabled:opacity-50"
          >
            <Plus className="h-5 w-5" />
            <span>{loading ? 'Creating...' : 'Create New Treasury'}</span>
          </button>
        </div>

        {/* Contract Info */}
        <div className="bg-gray-50 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Contract Information
          </h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Package ID:</strong> <code className="bg-gray-200 px-1 rounded">{PACKAGE_ID}</code></p>
            <p><strong>Network:</strong> Sui Testnet</p>
            <p><strong>Module:</strong> dao_treasury</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TreasuryManager;