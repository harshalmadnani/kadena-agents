import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { createClient } from '@kadena/client';
import { chainId, networkId, rpcUrl } from '../services/magic';
import './WalletInfo.css';

const WalletInfo: React.FC = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<string>('0.0');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!user?.accountName) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const client = createClient(rpcUrl);
        
        const accountName = user.accountName;
        
        // Create a Pact query to get balance
        const cmd = {
          pactCode: `(coin.get-balance "${accountName}")`,
          meta: {
            chainId,
            sender: accountName,
            gasLimit: 150000,
            gasPrice: 0.00000001,
            ttl: 600,
          },
          networkId,
        };
        
        const response = await client.local(cmd);
        
        if (response.result.status === 'success') {
          setBalance(response.result.data);
        } else {
          setError('Failed to fetch balance');
        }
      } catch (err) {
        console.error('Error fetching balance:', err);
        setError('Failed to fetch balance');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalance();
  }, [user?.accountName]);

  if (!user?.accountName) {
    return null;
  }

  return (
    <div className="wallet-info">
      <h3>Kadena Wallet</h3>
      <div className="wallet-details">
        <div className="wallet-item">
          <span className="label">Account:</span>
          <span className="value account-value">{user.accountName}</span>
        </div>
        <div className="wallet-item">
          <span className="label">Public Key:</span>
          <span className="value key-value">{user.publicKey}</span>
        </div>
        <div className="wallet-item">
          <span className="label">Balance:</span>
          {isLoading ? (
            <span className="value">Loading...</span>
          ) : error ? (
            <span className="value error">{error}</span>
          ) : (
            <span className="value balance-value">{balance} KDA</span>
          )}
        </div>
      </div>
      <div className="wallet-actions">
        <button className="wallet-button" onClick={() => window.open('https://faucet.testnet.chainweb.com', '_blank')}>
          Get Test KDA
        </button>
      </div>
    </div>
  );
};

export default WalletInfo; 