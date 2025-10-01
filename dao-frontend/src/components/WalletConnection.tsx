import React, { useState, useEffect } from 'react';
import { 
  useCurrentAccount, 
  ConnectButton, 
  useConnectWallet,
  useWallets,
  useDisconnectWallet
} from '@mysten/dapp-kit';
import { Wallet, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn, layoutClasses, cardVariants, buttonVariants } from '../utils/styles';

interface WalletConnectionProps {
  children: React.ReactNode;
}

const WalletConnection: React.FC<WalletConnectionProps> = ({ children }) => {
  const account = useCurrentAccount();
  const wallets = useWallets();
  const { mutate: connect } = useConnectWallet();
  const { mutate: disconnect } = useDisconnectWallet();
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Check for Slush wallet availability
  const slushWallet = wallets.find(wallet => 
    wallet.name.toLowerCase().includes('slush') || 
    wallet.name === 'Slush'
  );
  
  const suiWallet = wallets.find(wallet => 
    wallet.name.toLowerCase().includes('sui wallet') || 
    wallet.name === 'Sui Wallet'
  );

  const handleWalletConnect = async (walletName: string) => {
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      const targetWallet = wallets.find(w => w.name === walletName);
      if (!targetWallet) {
        throw new Error(`${walletName} wallet not found. Please install it first.`);
      }

      connect(
        { wallet: targetWallet },
        {
          onSuccess: () => {
            toast.success(`Successfully connected to ${walletName}!`);
            setRetryCount(0);
          },
          onError: (error) => {
            console.error('Wallet connection error:', error);
            const errorMessage = error.message || `Failed to connect to ${walletName}`;
            setConnectionError(errorMessage);
            toast.error(errorMessage);
            
            // Increment retry count for analytics
            setRetryCount(prev => prev + 1);
          }
        }
      );
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown connection error';
      setConnectionError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRetryConnection = () => {
    if (slushWallet) {
      handleWalletConnect('Slush');
    } else if (suiWallet) {
      handleWalletConnect('Sui Wallet');
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast.success('Wallet disconnected');
  };

  // Auto-retry connection for Slush wallet if it becomes available
  useEffect(() => {
    if (slushWallet && !account && retryCount > 0 && retryCount < 3) {
      const timer = setTimeout(() => {
        handleWalletConnect('Slush');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [slushWallet, account, retryCount]);

  if (!account) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className={cn(cardVariants.primary, "p-8 max-w-md w-full mx-4 animate-fade-in")}>
          <div className="text-center">
            <div className="relative mb-6">
              <Wallet className="mx-auto h-16 w-16 text-primary-600 mb-2" />
              {isConnecting && (
                <RefreshCw className="absolute top-0 right-0 h-6 w-6 text-primary-500 animate-spin" />
              )}
            </div>
            
            <h1 className="text-heading-2 text-gray-900 mb-3">
              Connect Your Wallet
            </h1>
            
            <p className="text-body text-gray-600 mb-8">
              Connect your Sui wallet to access the DAO Treasury.
              {slushWallet ? ' Slush wallet detected!' : ' Please install Slush or another Sui wallet.'}
            </p>

            {/* Connection Error Display */}
            {connectionError && (
              <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-xl">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-error-600 mr-2 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-error-800">Connection Failed</p>
                    <p className="text-sm text-error-600 mt-1">{connectionError}</p>
                  </div>
                </div>
                
                {retryCount > 0 && (
                  <button
                    onClick={handleRetryConnection}
                    className={cn(buttonVariants.secondary, "mt-3 text-sm")}
                    disabled={isConnecting}
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-2", isConnecting && "animate-spin")} />
                    Retry Connection
                  </button>
                )}
              </div>
            )}

            {/* Wallet Options */}
            <div className="space-y-3 mb-6">
              {/* Slush Wallet - Priority */}
              {slushWallet && (
                <button
                  onClick={() => handleWalletConnect('Slush')}
                  disabled={isConnecting}
                  className={cn(
                    buttonVariants.primary,
                    "w-full justify-between group",
                    isConnecting && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                      <CheckCircle className="h-4 w-4 text-primary-600" />
                    </div>
                    Connect with Slush
                  </div>
                  <span className="text-sm opacity-75">Recommended</span>
                </button>
              )}

              {/* Fallback: Default Connect Button */}
              {!slushWallet && (
                <div className="space-y-3">
                  <ConnectButton className="w-full" />
                  
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-2">
                      Don't have Slush wallet installed?
                    </p>
                    <a
                      href="https://slush.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Download Slush Wallet →
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Wallet Status Indicators */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <div className={cn(
                    "w-2 h-2 rounded-full mr-2",
                    slushWallet ? "bg-success-500" : "bg-gray-300"
                  )} />
                  Slush {slushWallet ? 'Available' : 'Not Installed'}
                </div>
                <div className="flex items-center">
                  <div className={cn(
                    "w-2 h-2 rounded-full mr-2",
                    wallets.length > 0 ? "bg-success-500" : "bg-gray-300"
                  )} />
                  {wallets.length} Wallet{wallets.length !== 1 ? 's' : ''} Detected
                </div>
              </div>
            </div>

            {/* Troubleshooting Tips */}
            {retryCount > 2 && (
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Having trouble connecting?
                </h3>
                <ul className="text-sm text-gray-600 space-y-1 text-left">
                  <li>• Make sure your wallet extension is enabled</li>
                  <li>• Try refreshing the page</li>
                  <li>• Check if your wallet is unlocked</li>
                  <li>• Ensure you're on the correct network (Testnet)</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      
      {/* Connected Wallet Status (Optional - for debugging) */}
      {process.env.NODE_ENV === 'development' && account && (
        <div className="fixed bottom-4 left-4 p-3 bg-success-50 border border-success-200 rounded-xl">
          <div className="flex items-center text-sm">
            <CheckCircle className="h-4 w-4 text-success-600 mr-2" />
            <span className="text-success-800">
              Connected: {account.address.slice(0, 6)}...{account.address.slice(-4)}
            </span>
            <button
              onClick={handleDisconnect}
              className="ml-3 text-success-600 hover:text-success-700 font-medium"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default WalletConnection;