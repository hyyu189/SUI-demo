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
import { 
  findTreasuryObjectsByEvent, 
  createTreasuryTx 
} from '../utils/suiUtils';
import DAOTreasury from './DAOTreasury';

const TreasuryManager: React.FC = () => {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  const [treasuryObjects, setTreasuryObjects] = useState<any[]>([]);
  const [selectedTreasury, setSelectedTreasury] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError('Failed to load treasury objects.');
      console.error('Error loading treasuries:', err);
    } finally {
      setLoading(false);
    }
  };

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
            setTimeout(() => {
              loadTreasuryObjects();
            }, 2000);
          },
          onError: (error) => {
            console.error('Error creating treasury:', error);
            setError('Failed to create treasury.');
          },
        }
      );
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to create treasury.');
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
    return null;
  }

  if (selectedTreasury) {
    return (
      <DAOTreasury 
        treasuryId={selectedTreasury}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-gray-800 mb-2">
              Treasury Manager
            </h1>
            <p className="text-gray-600">
              Select or create a treasury to continue.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Existing Treasuries
            </h2>
            {/* Treasury list rendering */}
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Create New Treasury
            </h2>
            <p className="text-gray-600 mb-4">
              Deploy a new DAO treasury contract.
            </p>
            <button
              onClick={createNewTreasury}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>{loading ? 'Creating...' : 'Create Treasury'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TreasuryManager;