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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <Wallet className="mx-auto h-12 w-12 text-blue-600 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              DAO Treasury Demo
            </h1>
            <p className="text-gray-600 mb-6">
              Connect your Sui wallet to access the decentralized treasury management system on testnet.
            </p>
            <div className="mb-6">
              <ConnectButton />
            </div>
            <div className="text-sm text-gray-500 space-y-2">
              <p><strong>Network:</strong> Sui Testnet</p>
              <p><strong>Package ID:</strong></p>
              <p className="font-mono text-xs break-all bg-gray-100 p-2 rounded">
                0x0ae29b6c03c9151219c92a18e34561b47493f384ec479aa47bcc988ca7b40952
              </p>
              <p className="mt-4">
                Need testnet SUI? Visit{' '}
                <a 
                  href="https://faucet.sui.io" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  faucet.sui.io
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default WalletConnection;