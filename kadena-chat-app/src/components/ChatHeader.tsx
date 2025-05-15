import React from "react";

interface ChatHeaderProps {
  user: {
    email?: string | null;
    accountName?: string;
  } | null;
  showWallet: boolean;
  onToggleWallet: () => void;
  mainActionLabel: string;
  onMainAction: () => void;
  onLogout: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  user,
  showWallet,
  onToggleWallet,
  mainActionLabel,
  onMainAction,
  onLogout,
}) => (
  <div className="chat-header">
    <div className="user-info">
      <div className="user-avatar">
        {user?.email?.charAt(0).toUpperCase() || "U"}
      </div>
      <div className="user-details">
        <div className="user-name">{user?.email || "User"}</div>
        <div className="user-wallet">
          {user?.accountName || "No wallet connected"}
        </div>
      </div>
    </div>
    <div className="header-actions">
      <button className="wallet-toggle" onClick={onToggleWallet}>
        {showWallet ? "Hide Wallet" : "Show Wallet"}
      </button>
      <button
        className="agent-launcher-button"
        onClick={onMainAction}
      >
        {mainActionLabel}
      </button>
      <button className="logout-button" onClick={onLogout}>
        Logout
      </button>
    </div>
  </div>
);

export default ChatHeader; 