import { useState, useEffect, useCallback } from 'react';
import { useSuiClient, useCurrentAccount } from '@mysten/dapp-kit';
import { SuiObjectResponse } from '@mysten/sui/client';
import { findTreasuryObjectsByEvent } from '../utils/suiUtils';
import { PACKAGE_ID, MODULE_NAME } from '../utils/suiUtils';

export const useTreasury = () => {
  const suiClient = useSuiClient();
  const account = useCurrentAccount();
  const [treasuries, setTreasuries] = useState<SuiObjectResponse[]>([]);
  const [adminCaps, setAdminCaps] = useState<any[]>([]);
  const [selectedTreasury, setSelectedTreasury] = useState<SuiObjectResponse | null>(null);
  const [selectedAdminCap, setSelectedAdminCap] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const findAdminCaps = useCallback(async (ownerAddress: string) => {
    if (!ownerAddress) return [];
    try {
      const objects = await suiClient.getOwnedObjects({
        owner: ownerAddress,
        filter: {
          StructType: `${PACKAGE_ID}::${MODULE_NAME}::AdminCap`,
        },
        options: {
          showContent: true,
          showType: true,
        },
      });
      return objects.data;
    } catch (err) {
      console.error('Error fetching AdminCaps:', err);
      return [];
    }
  }, [suiClient]);

  const loadTreasuries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const foundTreasuries = await findTreasuryObjectsByEvent(suiClient);
      setTreasuries(foundTreasuries);
      
      if (account?.address) {
        const foundAdminCaps = await findAdminCaps(account.address);
        setAdminCaps(foundAdminCaps);

        if (foundTreasuries.length > 0) {
          // Default to the first treasury
          setSelectedTreasury(foundTreasuries[0]);
          
          // Find the corresponding AdminCap for the first treasury
          // This assumes a 1:1 relationship or a specific logic to link them.
          // For now, we'll just take the first AdminCap found.
          if (foundAdminCaps.length > 0) {
            setSelectedAdminCap(foundAdminCaps[0]);
          }
        }
      }
    } catch (err) {
      console.error('Error loading treasuries:', err);
      setError('Failed to load treasuries.');
    } finally {
      setLoading(false);
    }
  }, [suiClient, account, findAdminCaps]);

  useEffect(() => {
    loadTreasuries();
  }, [loadTreasuries]);

  const refresh = () => {
    loadTreasuries();
  };

  return {
    treasuries,
    adminCaps,
    selectedTreasury,
    selectedAdminCap,
    loading,
    error,
    refresh,
    setSelectedTreasury,
  };
};