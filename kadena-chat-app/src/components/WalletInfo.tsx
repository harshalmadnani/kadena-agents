import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../context/WalletContext";
import { tokens } from "../utils/tokens";
import { supabase } from "../lib/supabase";
import "./WalletInfo.css";

interface AgentBalance {
  symbol: string;
  balance: string;
}

interface ChainwebBalance {
  [key: string]: number;
}

const WalletInfo: React.FC = () => {
  const { user, logout } = useAuth();
  const { balances, isLoading, error, refreshBalances } = useWallet();
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [userAgents, setUserAgents] = useState<any[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [agentBalances, setAgentBalances] = useState<Record<string, AgentBalance[]>>({});

  useEffect(() => {
    if (user?.accountName) {
      fetchUserAgents();
    }
  }, [user?.accountName]);

  const fetchUserAgents = async () => {
    if (!user?.accountName) return;
    
    setLoadingAgents(true);
    try {
      const { data, error } = await supabase
        .from('agents2')
        .select('*')
        .eq('user_id', user.accountName);
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      setUserAgents(data || []);
      // Fetch balances for each agent
      if (data) {
        const balances: Record<string, AgentBalance[]> = {};
        for (const agent of data) {
          if (agent.agent_wallet) {
            try {
              const response = await fetch(`https://api.chainweb.com/chainweb/0.0/mainnet01/chain/2/account/${agent.agent_wallet}/balance`);
              const data = await response.json() as ChainwebBalance;
              balances[agent.id] = Object.entries(data).map(([symbol, balance]) => ({
                symbol,
                balance: balance.toString()
              }));
            } catch (err) {
              console.error(`Error fetching balances for agent ${agent.id}:`, err);
              balances[agent.id] = [];
            }
          }
        }
        setAgentBalances(balances);
      }
    } catch (err) {
      console.error('Error fetching user agents:', err);
    } finally {
      setLoadingAgents(false);
    }
  };

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

        <div className="wallet-item">
          <span className="label">Your Agents</span>
          {loadingAgents ? (
            <div className="loading-indicator">Loading agents...</div>
          ) : userAgents.length === 0 ? (
            <div className="value">No agents created yet</div>
          ) : (
            <div className="agents-list">
              {userAgents.map((agent) => (
                <div key={agent.id} className="agent-item">
                  <div className="agent-avatar">
                    {agent.image ? (
                      <img src={agent.image} alt={agent.name} />
                    ) : (
                      agent.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="agent-details">
                    <div className="agent-name">{agent.name}</div>
                    <div className="agent-description">{agent.description}</div>
                    {agent.agent_wallet && (
                      <div className="agent-wallet">
                        <span className="wallet-label">Agent Wallet:</span>
                        <span className="wallet-address">{agent.agent_wallet}</span>
                        <button
                          onClick={() => copyToClipboard(agent.agent_wallet, 'agent-wallet')}
                          className="copy-button"
                          title="Copy wallet address"
                        >
                          {copiedText === 'agent-wallet' ? '✓' : '📋'}
                        </button>
                      </div>
                    )}
                    {agent.agent_privatekey && (
                      <div className="agent-private-key">
                        <span className="wallet-label">Private Key:</span>
                        <span className="wallet-address">••••••••••••••••</span>
                        <button
                          onClick={() => copyToClipboard(agent.agent_privatekey, 'agent-private-key')}
                          className="copy-button"
                          title="Copy private key"
                        >
                          {copiedText === 'agent-private-key' ? '✓' : '🔑'}
                        </button>
                      </div>
                    )}
                    {agentBalances[agent.id] && agentBalances[agent.id].length > 0 && (
                      <div className="agent-balances">
                        <span className="wallet-label">Agent Balances:</span>
                        <div className="agent-balances-list">
                          {agentBalances[agent.id].map((balance) => (
                            <div key={balance.symbol} className="agent-balance-item">
                              <div className="token-avatar small">
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
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <button className="logout-button" onClick={logout} style={{ marginTop: '1rem', width: '100%' }}>
        Logout
      </button>
    </div>
  );
};

export default WalletInfo;
