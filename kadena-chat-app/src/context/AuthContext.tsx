import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import magic from "../services/magic";

interface UserInfo {
  accountName?: string;
  publicKey?: string;
  loginType?: string;
  email?: string | null;
  phoneNumber?: string | null;
  issuer?: string | null;
  publicAddress?: string | null;
  isMfaEnabled?: boolean;
  walletType?: string;
  spireKeyInfo?: any;
  recoveryFactors?: any[];
}

interface AuthContextType {
  user: UserInfo | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (email: string) => Promise<void>;
  loginWithSpireKey: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    const checkUserLoggedIn = async () => {
      try {
        setIsLoading(true);
        const isLoggedIn = await magic.user.isLoggedIn();
        if (isLoggedIn) {
          const userMetadata = await magic.user.getInfo();
          const kadenaInfo = await magic.kadena.getUserInfo();
          setUser({
            ...userMetadata,
            ...kadenaInfo,
          });
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.error("Error checking auth status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkUserLoggedIn();
  }, []);

  const login = async (email: string) => {
    try {
      setIsLoading(true);
      await magic.auth.loginWithMagicLink({ email });
      const userMetadata = await magic.user.getInfo();
      const kadenaInfo = await magic.kadena.getUserInfo();
      setUser({
        ...userMetadata,
        ...kadenaInfo,
      });
      setIsLoggedIn(true);
    } catch (error) {
      console.error("Error during login:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithSpireKey = async () => {
    try {
      setIsLoading(true);
      const account = await magic.kadena.loginWithSpireKey();
      const userMetadata = await magic.user.getInfo();
      const kadenaInfo = await magic.kadena.getUserInfo();
      setUser({
        ...userMetadata,
        ...kadenaInfo,
      });
      setIsLoggedIn(true);
    } catch (error) {
      console.error("Error during SpireKey login:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await magic.user.logout();
      setUser(null);
      setIsLoggedIn(false);
    } catch (error) {
      console.error("Error during logout:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isLoggedIn, login, loginWithSpireKey, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
