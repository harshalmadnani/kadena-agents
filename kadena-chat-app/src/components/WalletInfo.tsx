import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { chainId } from "../services/magic";
import { getAllBalances } from "../utils/transactions";
import { tokens } from "../utils/tokens";
import "./WalletInfo.css";

interface TokenBalance {
  symbol: string;
  balance: number;
}

const WalletInfo: React.FC = () => {
  const { user } = useAuth();
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    const fetchBalances = async () => {
      if (!user?.accountName) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const tokenBalances = await getAllBalances(user.accountName, chainId);
        setBalances(tokenBalances);
        setError(null);
      } catch (err) {
        console.error("Error fetching balances:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch balances"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalances();
  }, [user?.accountName]);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(type);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const getTokenName = (symbol: string): string => {
    const token = Object.values(tokens).find((t) => t.symbol === symbol);
    return token?.name || symbol;
  };

  const accountName = user?.accountName;
  const publicKey = user?.publicKey;

  if (!accountName || !publicKey) {
    return null;
  }

  return (
    <div className="wallet-info">
      <h3>
        <span>Kadena Wallet</span>
        {isLoading && <span className="loading-indicator">Refreshing...</span>}
      </h3>

      <div className="wallet-details">
        <div className="account-section">
          <div className="wallet-item">
            <span className="label">Account</span>
            <div className="value account-value">
              <span>{accountName}</span>
            </div>
          </div>
          <div className="wallet-item">
            <span className="label">Public Key</span>
            <div className="value key-value">
              <span>{publicKey}</span>
            </div>
          </div>
        </div>

        <div className="wallet-item">
          <span className="label">Token Balances</span>
          {isLoading ? (
            <div className="loading-indicator">Loading balances...</div>
          ) : error ? (
            <div className="value error">{error}</div>
          ) : balances.length === 0 ? (
            <div className="value">No tokens found</div>
          ) : (
            <div className="balances-list">
              {balances.map((balance) => (
                <div key={balance.symbol} className="balance-item">
                  <div className="token-avatar">
                    {balance.symbol.charAt(0).toUpperCase()}
                  </div>
                  <div className="balance-value">
                    <span>{balance.balance}</span>
                    <span className="token-symbol">
                      {balance.symbol} • {getTokenName(balance.symbol)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletInfo;
