import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../context/WalletContext";
import { tokens } from "../utils/tokens";
import "./WalletInfo.css";

const WalletInfo: React.FC = () => {
  const { user } = useAuth();
  const { balances, isLoading, error, refreshBalances } = useWallet();
  const [copiedText, setCopiedText] = useState<string | null>(null);

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
      <div className="chain-warning">
        ⚠️ AgentK is on Kadena Chain 2 - Make sure to only deposit on mainnet chain 2
      </div>
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
          <span className="label">
            Token Balances
            <button
              onClick={refreshBalances}
              className="refresh-button"
              disabled={isLoading}
            >
              🔄 Refresh
            </button>
          </span>
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
