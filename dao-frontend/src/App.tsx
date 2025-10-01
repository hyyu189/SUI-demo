import React from 'react';
import '@mysten/dapp-kit/dist/index.css';
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TreasuryManager from './components/TreasuryManager';
import WalletConnection from './components/WalletConnection';
import './App.css';

const queryClient = new QueryClient();

const networks = {
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
};

function App() {
  return (
    <div className="App">
      <QueryClientProvider client={queryClient}>
        <SuiClientProvider networks={networks} defaultNetwork="testnet">
          <WalletProvider>
            <WalletConnection>
              <TreasuryManager />
            </WalletConnection>
          </WalletProvider>
        </SuiClientProvider>
      </QueryClientProvider>
    </div>
  );
}

export default App;