/**
 * Wallet Configuration for Enhanced Slush Wallet Support
 * This file contains optimized wallet connection settings for better Slush compatibility
 */

export interface WalletAdapter {
  name: string;
  url: string;
  icon: string;
  downloadUrl: string;
  isInstalled?: boolean;
}

/**
 * Slush wallet detection utility
 */
export const detectSlushWallet = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check for Slush wallet in window object
  return !!(
    (window as any).slush ||
    (window as any).suiWallet?.name?.toLowerCase().includes('slush') ||
    // Check for standard wallet adapter pattern
    (window as any).wallet?.adapter?.name?.toLowerCase().includes('slush')
  );
};

/**
 * Enhanced wallet detection for all Sui wallets
 */
export const detectAvailableWallets = (): WalletAdapter[] => {
  const wallets: WalletAdapter[] = [
    {
      name: 'Slush',
      url: 'https://slush.app',
      icon: '🌊',
      downloadUrl: 'https://chrome.google.com/webstore/detail/slush-wallet/bbeknkkjjhjnomcaihjdlhbcjjcgglko',
      isInstalled: detectSlushWallet()
    },
    {
      name: 'Sui Wallet',
      url: 'https://sui.io/wallet',
      icon: '🔷',
      downloadUrl: 'https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil',
      isInstalled: !!(window as any).suiWallet
    },
    {
      name: 'Suiet',
      url: 'https://suiet.app',
      icon: '🦄',
      downloadUrl: 'https://chrome.google.com/webstore/detail/suiet-sui-wallet/khpkpbbcccdmmclmpigdgddabeilkdpd',
      isInstalled: !!(window as any).suiet
    },
    {
      name: 'Ethos Wallet',
      url: 'https://ethoswallet.xyz',
      icon: '⚡',
      downloadUrl: 'https://chrome.google.com/webstore/detail/ethos-sui-wallet/mcbigmjiafegjnnogedioegffbooigli',
      isInstalled: !!(window as any).ethosWallet
    }
  ];

  return wallets;
};

/**
 * Wallet connection configuration optimized for Slush
 */
export const walletConnectionConfig = {
  // Prioritize Slush wallet
  preferredWallets: ['Slush', 'Sui Wallet', 'Suiet', 'Ethos Wallet'],
  
  // Auto-connect settings
  autoConnect: false, // Let user explicitly choose for better UX
  
  // Connection timeout settings
  connectionTimeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 2000, // 2 seconds
  
  // Required features for DAO functionality
  requiredFeatures: [
    'sui:signAndExecuteTransactionBlock',
    'sui:signTransactionBlock',
    'standard:connect',
    'standard:disconnect'
  ],
  
  // Network configuration
  supportedNetworks: ['sui:testnet', 'sui:mainnet', 'sui:devnet'],
  defaultNetwork: 'sui:testnet',
  
  // Slush-specific configuration
  slushConfig: {
    // Slush wallet specific connection parameters
    chainId: 'sui:testnet',
    rpcUrl: 'https://fullnode.testnet.sui.io:443',
    
    // Connection options
    options: {
      readonlyMode: false,
      preferredWalletType: 'extension',
      
      // Enhanced error handling for Slush
      onError: (error: any) => {
        console.error('Slush wallet connection error:', error);
        
        // Common Slush wallet error codes and their meanings
        const errorMappings: Record<string, string> = {
          'WALLET_NOT_FOUND': 'Slush wallet extension not found. Please install it first.',
          'USER_REJECTED': 'Connection request was rejected. Please try again.',
          'NETWORK_MISMATCH': 'Please switch to the correct network in your Slush wallet.',
          'WALLET_LOCKED': 'Please unlock your Slush wallet and try again.',
          'INSUFFICIENT_PERMISSIONS': 'Please enable dApp permissions in your Slush wallet.',
          'CONNECTION_TIMEOUT': 'Connection timed out. Please check your wallet and try again.',
        };
        
        return errorMappings[error.code] || error.message || 'Failed to connect to Slush wallet';
      }
    }
  }
};

/**
 * Slush wallet connection helper
 */
export const connectSlushWallet = async (): Promise<{
  success: boolean;
  account?: string;
  error?: string;
}> => {
  try {
    // Check if Slush is available
    if (!detectSlushWallet()) {
      return {
        success: false,
        error: 'Slush wallet not found. Please install the Slush wallet extension.'
      };
    }

    // Get Slush wallet instance
    const slushWallet = (window as any).slush || (window as any).suiWallet;
    
    if (!slushWallet) {
      return {
        success: false,
        error: 'Unable to access Slush wallet. Please refresh the page and try again.'
      };
    }

    // Request connection with timeout
    const connectionPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, walletConnectionConfig.connectionTimeout);

      slushWallet.connect()
        .then((result: any) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((error: any) => {
          clearTimeout(timeout);
          reject(error);
        });
    });

    const result = await connectionPromise;
    
    // Extract account information
    const account = (result as any)?.accounts?.[0] || (result as any)?.address;
    
    if (!account) {
      return {
        success: false,
        error: 'No account found. Please ensure your Slush wallet is properly set up.'
      };
    }

    return {
      success: true,
      account: account
    };

  } catch (error: any) {
    console.error('Slush wallet connection failed:', error);
    
    // Enhanced error handling
    let errorMessage = 'Failed to connect to Slush wallet';
    
    if (error.message?.includes('User rejected')) {
      errorMessage = 'Connection request was rejected. Please accept the connection in your Slush wallet.';
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Connection timed out. Please ensure your Slush wallet is unlocked and try again.';
    } else if (error.message?.includes('network')) {
      errorMessage = 'Network error. Please check your internet connection and wallet network settings.';
    } else if (error.code) {
      errorMessage = walletConnectionConfig.slushConfig.options.onError(error);
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Utility to check wallet compatibility
 */
export const checkWalletCompatibility = (walletName: string): {
  isCompatible: boolean;
  issues: string[];
  recommendations: string[];
} => {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check for Slush-specific compatibility
  if (walletName.toLowerCase().includes('slush')) {
    if (!detectSlushWallet()) {
      issues.push('Slush wallet extension not detected');
      recommendations.push('Install Slush wallet from the Chrome Web Store');
    }

    // Check browser compatibility
    const isChrome = navigator.userAgent.includes('Chrome');
    const isFirefox = navigator.userAgent.includes('Firefox');
    
    if (!isChrome && !isFirefox) {
      issues.push('Browser may not be fully supported');
      recommendations.push('Use Chrome or Firefox for best compatibility');
    }
  }

  return {
    isCompatible: issues.length === 0,
    issues,
    recommendations
  };
};

/**
 * Network configuration for different environments
 */
export const networkConfigs = {
  testnet: {
    chainId: 'sui:testnet',
    rpcUrl: 'https://fullnode.testnet.sui.io:443',
    faucetUrl: 'https://faucet.testnet.sui.io',
    explorerUrl: 'https://suiexplorer.com/?network=testnet'
  },
  mainnet: {
    chainId: 'sui:mainnet',
    rpcUrl: 'https://fullnode.mainnet.sui.io:443',
    faucetUrl: null,
    explorerUrl: 'https://suiexplorer.com/?network=mainnet'
  },
  devnet: {
    chainId: 'sui:devnet',
    rpcUrl: 'https://fullnode.devnet.sui.io:443',
    faucetUrl: 'https://faucet.devnet.sui.io',
    explorerUrl: 'https://suiexplorer.com/?network=devnet'
  }
};

export default {
  detectSlushWallet,
  detectAvailableWallets,
  walletConnectionConfig,
  connectSlushWallet,
  checkWalletCompatibility,
  networkConfigs
};