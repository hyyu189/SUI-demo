import React from 'react';
import { useCurrentAccount, ConnectButton } from '@mysten/dapp-kit';
import { Wallet } from 'lucide-react';

interface WalletConnectionProps {
  children: React.ReactNode;
}

const WalletConnection: React.FC<WalletConnectionProps> = ({ children }) => {
  const account = useCurrentAccount();

  if (!account) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-sm w-full mx-4">
          <div className="text-center">
            <Wallet className="mx-auto h-12 w-12 text-blue-500 mb-4" />
            <h1 className="text-2xl font-semibold text-gray-800 mb-2">
              Connect Wallet
            </h1>
            <p className="text-gray-600 mb-6">
              Please connect your Sui wallet to continue.
            </p>
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default WalletConnection;