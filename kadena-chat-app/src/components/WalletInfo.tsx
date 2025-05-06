import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { createClient } from "@kadena/client";
import "./WalletInfo.css";

const WalletInfo: React.FC = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<string>("0.0");
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
        // Use mainnet01, chain ID 2 for fetching KDA balance
        const networkId = "mainnet01";
        const chainId = "2";
        const rpcUrl = `https://api.chainweb.com/chainweb/0.0/${networkId}/chain/${chainId}/pact`;
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

        // Validate response
        if (!response || !response.result) {
          throw new Error("Invalid response from Kadena API");
        }

        if (
          response.result.status === "success" &&
          response.result.data !== undefined
        ) {
          setBalance(response.result.data.toString());
          setError(null);
        } else if (response.result.status === "failure") {
          const errorMessage =
            response.result.error?.message || "Unknown error";
          console.error("Balance fetch failed:", response.result.error);
          setError(`Failed to fetch balance: ${errorMessage}`);
        } else {
          setError("Unexpected response from Kadena API");
        }
      } catch (err) {
        console.error("Error fetching balance:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch balance"
        );
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
    </div>
  );
};

export default WalletInfo;
