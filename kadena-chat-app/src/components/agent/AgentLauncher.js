import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './SocialAgentLauncher.css';
import SocialAgentLauncher from './SocialAgentLauncher';
import TradingAgentLauncher from './TradingAgentLauncher';
import ChatHeader from '../ChatHeader';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import WalletInfo from '../WalletInfo';
import Navbar from '../Navbar';

const AgentLauncher = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedAgentType, setSelectedAgentType] = useState(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const toggleWallet = () => setShowWallet((prev) => !prev);

  const slides = [
    { 
      image: 'https://wbsnlpviggcnwqfyfobh.supabase.co/storage/v1/object/public/app//picture.png', 
      title: 'Create your own\nAI-agent in a few clicks', 
      content: 'Launch and scale your AI-Agents with unprecedented ease and speed' 
    },
    {
      image: 'https://wbsnlpviggcnwqfyfobh.supabase.co/storage/v1/object/public/app//picture2.png',
      title: 'What kind of agents do you want to deploy?',
      content: '',
      hasAgentTypes: true
    }
  ];

  // All images used in the component
  const imageUrls = [
    'https://wbsnlpviggcnwqfyfobh.supabase.co/storage/v1/object/public/app//picture.png',
    'https://wbsnlpviggcnwqfyfobh.supabase.co/storage/v1/object/public/app//picture2.png',
    'https://wbsnlpviggcnwqfyfobh.supabase.co/storage/v1/object/public/app//picture9.png',
  ];

  useEffect(() => {
    let isMounted = true;
    let loadedCount = 0;
    imageUrls.forEach((url) => {
      const img = new window.Image();
      img.src = url;
      img.onload = img.onerror = () => {
        loadedCount++;
        if (loadedCount === imageUrls.length && isMounted) {
          setImagesLoaded(true);
        }
      };
    });
    return () => { isMounted = false; };
  }, []);

  // Show loading spinner/message until all images are loaded
  if (!imagesLoaded) {
    return (
      <div className="agent-launcher-loading">
        <div className="cool-spinner"></div>
        <div className="cool-loading-text">Loading your Agent Launcher...</div>
      </div>
    );
  }

  const handleNext = () => {
    if (currentStep < slides.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAgentTypeSelect = (type) => {
    setSelectedAgentType(type);
  };

  // If a specific agent type is selected, render that component
  if (selectedAgentType === 'social') {
    return <SocialAgentLauncher />;
  }
  
  if (selectedAgentType === 'trading') {
    return <TradingAgentLauncher />;
  }

  // Otherwise, show the selection interface
  return (
    <>
      <Navbar />
      <div className="agent-launcher-container">
        {showWallet && (
          <div className="wallet-overlay">
            <div className="wallet-overlay-backdrop" onClick={toggleWallet} />
            <div className="wallet-overlay-content">
              <WalletInfo />
              <button className="wallet-overlay-close" onClick={toggleWallet}>
                Close
              </button>
            </div>
          </div>
        )}
        <div className="progress-bar-container">
          <div 
            className="progress-bar"
            style={{
              width: `${((currentStep + 1) / slides.length) * 100}%`,
              height: '4px',
              backgroundColor: '#FFFFFF',
              borderRadius: '2px',
              transition: 'width 0.3s ease-in-out'
            }}
          />
          <div style={{ 
            color: 'white', 
            fontSize: '14px', 
            marginTop: '8px',
            textAlign: 'right'
          }}>
            {`Step ${currentStep + 1} of ${slides.length}`}
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="slide-container"
          >
            <div className="slide-content">
              <div className="image-container">
                <img 
                  src={slides[currentStep].image} 
                  alt={`Step ${currentStep + 1}`}
                  className="slide-image"
                />
              </div>
              
              <div className="content-container">
                <h2 style={{ marginBottom: '1.5rem' }}>{slides[currentStep].title}</h2>
                <p style={{ marginBottom: '1.5rem' }}>{slides[currentStep].content}</p>
                
                {currentStep === 0 ? (
                  <button 
                    className="next-button"
                    onClick={handleNext}
                    style={{ marginTop: '1rem' }}
                  >
                    Let's get started
                  </button>
                ) : currentStep === 1 ? (
                  <div style={{ width: '90%' }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '16px',
                      marginBottom: '20px'
                    }}>
                      <div
                        onClick={() => handleAgentTypeSelect('social')}
                        style={{
                          backgroundColor: '#1a1a1a',
                          borderRadius: '12px',
                          padding: '16px',
                          cursor: 'pointer',
                          border: selectedAgentType === 'social' ? '1px solid white' : '1px solid transparent'
                        }}
                      >
                        <img 
                          src="https://wbsnlpviggcnwqfyfobh.supabase.co/storage/v1/object/public/app//picture9.png" 
                          alt="Social Agents"
                          style={{
                            width: '100%',
                            height: 'auto',
                            marginBottom: '8px',
                            borderRadius: '8px'
                          }}
                        />
                        <p style={{ margin: 0, textAlign: 'center' }}>Social Agents</p>
                      </div>
                      <div
                        onClick={() => handleAgentTypeSelect('trading')}
                        style={{
                          backgroundColor: '#1a1a1a',
                          borderRadius: '12px',
                          padding: '16px',
                          cursor: 'pointer',
                          border: selectedAgentType === 'trading' ? '1px solid white' : '1px solid transparent'
                        }}
                      >
                        <img 
                          src="https://wbsnlpviggcnwqfyfobh.supabase.co/storage/v1/object/public/app//picture9.png" 
                          alt="Trading Agents"
                          style={{
                            width: '100%',
                            height: 'auto',
                            marginBottom: '8px',
                            borderRadius: '8px'
                          }}
                        />
                        <p style={{ margin: 0, textAlign: 'center' }}>Trading Agents</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
};

export default AgentLauncher;