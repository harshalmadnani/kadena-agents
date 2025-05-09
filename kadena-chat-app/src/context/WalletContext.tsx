import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { getAllBalances } from "../utils/transactions";
import { chainId } from "../services/magic";

interface TokenBalance {
  symbol: string;
  balance: number;
}

interface WalletContextType {
  balances: TokenBalance[];
  isLoading: boolean;
  error: string | null;
  refreshBalances: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBalances = async () => {
    if (!user?.accountName) {
      setBalances([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const tokenBalances = await getAllBalances(user.accountName, chainId);
      setBalances(tokenBalances);
    } catch (err) {
      console.error("Error fetching balances:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch balances");
    } finally {
      setIsLoading(false);
    }
  };

  // Load balances when the website opens and when user changes
  useEffect(() => {
    refreshBalances();
  }, [user?.accountName]);

  const value = {
    balances,
    isLoading,
    error,
    refreshBalances,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
