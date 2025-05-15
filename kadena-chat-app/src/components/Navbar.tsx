import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar: React.FC = () => {
  const { isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isLoggedIn) return null;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">Kadena Chat</Link>
      </div>
      <div className="navbar-links">
        <Link to="/" className="nav-link">Chat</Link>
        <button 
          onClick={() => navigate('/agent')} 
          className="agent-launcher-button"
        >
          Launch Agent
        </button>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar; 