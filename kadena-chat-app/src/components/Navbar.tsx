import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import WalletInfo from './WalletInfo';
import './Navbar.css';

const Navbar: React.FC = () => {
  const { isLoggedIn, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showWallet, setShowWallet] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isLoggedIn) return null;

  // Determine which main action button to show
  let mainActionLabel = '';
  let mainActionHandler = () => {};
  if (location.pathname === '/agent') {
    mainActionLabel = 'Chat';
    mainActionHandler = () => navigate('/');
  } else if (location.pathname === '/terminal') {
    mainActionLabel = 'Chat';
    mainActionHandler = () => navigate('/');
  } else if (location.pathname === '/') {
    mainActionLabel = 'Launch Agent';
    mainActionHandler = () => navigate('/agent');
  } else {
    mainActionLabel = 'Chat';
    mainActionHandler = () => navigate('/');
  }

  return (
    <nav className="navbar sticky-navbar">
      <div className="navbar-userinfo" onClick={() => setShowWallet(true)}>
        <div className="user-avatar">
          {user?.email?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="user-email-wallet">
          <div className="user-email">{user?.email || 'User'}</div>
          <div className="user-wallet-short">{user?.accountName || 'No wallet'}</div>
        </div>
      </div>
      <div className="navbar-actions">
        <button className="agent-launcher-button agent-launcher-button-white" onClick={mainActionHandler}>
          {mainActionLabel}
        </button>
        <button className="agent-launcher-button agent-launcher-button-outline" onClick={() => navigate('/terminal')}>
          Terminal
        </button>
      </div>
      {showWallet && (
        <div className="wallet-overlay">
          <div className="wallet-overlay-backdrop" onClick={() => setShowWallet(false)} />
          <div className="wallet-overlay-content">
            <WalletInfo />
            <button className="wallet-overlay-close" onClick={() => setShowWallet(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar; 