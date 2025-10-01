import React from 'react';
import '@mysten/dapp-kit/dist/index.css';
import { 
  SuiClientProvider, 
  WalletProvider,
  createNetworkConfig
} from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import TreasuryManager from './components/TreasuryManager';
import WalletConnection from './components/WalletConnection';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

// Enhanced network configuration for better wallet compatibility
const { networkConfig } = createNetworkConfig({
  localnet: { url: getFullnodeUrl('localnet') },
  devnet: { url: getFullnodeUrl('devnet') },
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
});

// Wallet configuration optimized for Slush and other Sui wallets
const walletConfig = {
  // Enable auto-connect for better UX
  autoConnect: true,
  // Set preferred wallet order (Slush first if available)
  preferredWallets: ['Slush', 'Sui Wallet', 'Suiet', 'Ethos Wallet'],
  // Additional wallet connection options
  requiredFeatures: ['sui:signAndExecuteTransactionBlock'],
  // Network compatibility settings
  chains: ['sui:testnet', 'sui:mainnet', 'sui:devnet'],
};

function App() {
  return (
    <div className="App">
      <QueryClientProvider client={queryClient}>
        <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
          <WalletProvider 
            autoConnect={walletConfig.autoConnect}
            preferredWallets={walletConfig.preferredWallets}
          >
            <WalletConnection>
              <TreasuryManager />
            </WalletConnection>
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#fff',
                  color: '#374151',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                },
                success: {
                  iconTheme: {
                    primary: '#22c55e',
                    secondary: '#fff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </WalletProvider>
        </SuiClientProvider>
      </QueryClientProvider>
    </div>
  );
}

export default App;