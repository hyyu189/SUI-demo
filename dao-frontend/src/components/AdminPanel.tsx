import React, { useState, useEffect } from 'react';
import { 
  useCurrentAccount, 
  useSignAndExecuteTransaction,
  useSuiClient 
} from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { 
  UserPlus, 
  UserMinus, 
  DollarSign, 
  Settings,
  AlertCircle,
  CheckCircle,
  Users,
  Wallet
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  PACKAGE_ID, 
  MODULE_NAME,
  addMemberTx,
  removeMemberTx,
  depositFundsTx,
  suiToMist 
} from '../utils/suiUtils';

interface AdminPanelProps {
  treasuryId: string;
  adminCapId: string;
  onMembersUpdated: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  treasuryId, 
  adminCapId, 
  onMembersUpdated 
}) => {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  const [newMemberAddress, setNewMemberAddress] = useState('');
  const [removeMemberAddress, setRemoveMemberAddress] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentMembers, setCurrentMembers] = useState<string[]>([]);

  const fetchMembers = async () => {
    try {
      const treasuryObject = await suiClient.getObject({
        id: treasuryId,
        options: { showContent: true },
      });

      if (treasuryObject.data?.content?.dataType === 'moveObject') {
        const fields = treasuryObject.data.content.fields as any;
        setCurrentMembers(fields.members || []);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const addMember = async () => {
    if (!account || !newMemberAddress.trim()) return;

    setLoading(true);
    try {
      const tx = addMemberTx(treasuryId, adminCapId, newMemberAddress.trim());
      
      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log('Member added:', result);
            toast.success('Member added successfully!');
            setNewMemberAddress('');
            fetchMembers();
            onMembersUpdated();
          },
          onError: (error) => {
            console.error('Error adding member:', error);
            toast.error('Failed to add member. Please try again.');
          },
        }
      );
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to add member. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async () => {
    if (!account || !removeMemberAddress.trim()) return;

    setLoading(true);
    try {
      const tx = removeMemberTx(treasuryId, adminCapId, removeMemberAddress.trim());
      
      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log('Member removed:', result);
            toast.success('Member removed successfully!');
            setRemoveMemberAddress('');
            fetchMembers();
            onMembersUpdated();
          },
          onError: (error) => {
            console.error('Error removing member:', error);
            toast.error('Failed to remove member. Please try again.');
          },
        }
      );
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to remove member. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const depositFunds = async () => {
    if (!account || !depositAmount.trim()) return;

    setLoading(true);
    try {
      const amountInMist = suiToMist(depositAmount);
      const tx = depositFundsTx(treasuryId, amountInMist);
      
      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log('Funds deposited:', result);
            toast.success(`${depositAmount} SUI deposited successfully!`);
            setDepositAmount('');
            onMembersUpdated(); // This will refresh all data
          },
          onError: (error) => {
            console.error('Error depositing funds:', error);
            toast.error('Failed to deposit funds. Please try again.');
          },
        }
      );
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to deposit funds. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (treasuryId) {
      fetchMembers();
    }
  }, [treasuryId]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Settings className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-900">Admin Panel</h2>
      </div>

      {/* Current Members Display */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2 mb-3">
          <Users className="h-5 w-5 text-gray-600" />
          <span className="font-semibold text-gray-900">Current Members ({currentMembers.length})</span>
        </div>
        {currentMembers.length > 0 ? (
          <div className="space-y-2">
            {currentMembers.map((member, index) => (
              <div key={index} className="flex items-center justify-between bg-white p-2 rounded">
                <span className="font-mono text-sm text-gray-600">
                  {member.slice(0, 8)}...{member.slice(-6)}
                </span>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-gray-600">No members added yet</p>
            <p className="text-sm text-gray-500">Add the first member to start DAO governance</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Add Member Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <UserPlus className="h-5 w-5 mr-2 text-green-600" />
            Add Member
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              value={newMemberAddress}
              onChange={(e) => setNewMemberAddress(e.target.value)}
              placeholder="Enter member address (0x...)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
            />
            <button
              onClick={addMember}
              disabled={loading || !newMemberAddress.trim()}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <UserPlus className="h-4 w-4" />
              <span>{loading ? 'Adding...' : 'Add Member'}</span>
            </button>
          </div>
        </div>

        {/* Remove Member Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <UserMinus className="h-5 w-5 mr-2 text-red-600" />
            Remove Member
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              value={removeMemberAddress}
              onChange={(e) => setRemoveMemberAddress(e.target.value)}
              placeholder="Enter member address (0x...)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
            />
            <button
              onClick={removeMember}
              disabled={loading || !removeMemberAddress.trim() || currentMembers.length <= 1}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <UserMinus className="h-4 w-4" />
              <span>{loading ? 'Removing...' : 'Remove Member'}</span>
            </button>
            {currentMembers.length <= 1 && (
              <p className="text-xs text-red-500">Cannot remove the last member</p>
            )}
          </div>
        </div>
      </div>

      {/* Deposit Funds Section */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
          <DollarSign className="h-5 w-5 mr-2 text-blue-600" />
          Fund Treasury
        </h3>
        <div className="flex space-x-3">
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="Amount in SUI (e.g., 10.5)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
            step="0.1"
            min="0"
          />
          <button
            onClick={depositFunds}
            disabled={loading || !depositAmount.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 flex items-center space-x-2"
          >
            <Wallet className="h-4 w-4" />
            <span>{loading ? 'Depositing...' : 'Deposit'}</span>
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Funds will be added to the DAO treasury for proposals
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-md font-semibold text-gray-900 mb-3">Quick Actions</h4>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              if (account?.address) {
                setNewMemberAddress(account.address);
              }
            }}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg text-sm"
          >
            Add Myself as Member
          </button>
          <button
            onClick={fetchMembers}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg text-sm"
          >
            Refresh Members
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;