import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import './SocialAgentLauncher.css';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import AgentLauncher from './AgentLauncher';

const supabaseUrl = 'https://wbsnlpviggcnwqfyfobh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indic25scHZpZ2djbndxZnlmb2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODc2NTcwNiwiZXhwIjoyMDU0MzQxNzA2fQ.tr6PqbiAXQYSQSpG2wS6I4DZfV1Gc3dLXYhKwBrJLS0';
const supabase = createClient(supabaseUrl, supabaseKey);

const loadingAnimation = {
  display: 'inline-block',
  width: '20px',
  height: '20px',
  marginLeft: '10px',
  border: '3px solid rgba(0, 0, 0, 0.3)',
  borderRadius: '50%',
  borderTopColor: '#000',
  animation: 'spin 1s ease-in-out infinite',
  verticalAlign: 'middle'
};

const TradingAgentLauncher = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [agentName, setAgentName] = useState('');
  const [agentDescription, setAgentDescription] = useState('');
  const [agentImage, setAgentImage] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showAgentLauncher, setShowAgentLauncher] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState('trading');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSources, setSelectedSources] = useState([]);
  const [selectedChains, setSelectedChains] = useState([]);
  const [agentBehavior, setAgentBehavior] = useState('');
  const [followUpQuestions, setFollowUpQuestions] = useState([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [aiRating, setAiRating] = useState(null);
  const [aiSteps, setAiSteps] = useState([]);
  const [reviewEnabled, setReviewEnabled] = useState(false);

  const slides = [
    {
      image: 'https://wbsnlpviggcnwqfyfobh.supabase.co/storage/v1/object/public/app//picture2.png',
      title: 'Enter Invite Code',
      content: 'Please enter your invitation code to continue',
      hasInviteCode: true
    },
    { 
      image: 'https://wbsnlpviggcnwqfyfobh.supabase.co/storage/v1/object/public/app//picture2.png', 
      title: 'It all starts with a name', 
      content: 'How should we call your Trading Agent?',
      hasForm: true 
    },
    { 
      image: 'https://wbsnlpviggcnwqfyfobh.supabase.co/storage/v1/object/public/app//picture3.png', 
      title: `Let's upload the picture\nof ${agentName || 'your agent'}`, 
      content: '',
      hasUpload: true 
    },
    {
      image: 'https://wbsnlpviggcnwqfyfobh.supabase.co/storage/v1/object/public/app//picture2.png',
      title: 'Choose your trading strategy',
      content: 'Select the type of trading agent you want to create',
      hasStrategy: true
    },
    {
      image: 'https://wbsnlpviggcnwqfyfobh.supabase.co/storage/v1/object/public/app//picture5.png',
      title: `What data sources do you want\n${agentName || 'your agent'} to use?`,
      content: 'You can search for actions and sources',
      hasDataSources: true
    },
    {
      image: 'https://wbsnlpviggcnwqfyfobh.supabase.co/storage/v1/object/public/app//picture5.png',
      title: `What chains do you want\n${agentName || 'your agent'} to operate on?`,
      content: 'Select the blockchains for your agent',
      hasChains: true
    },
    {
      image: 'https://wbsnlpviggcnwqfyfobh.supabase.co/storage/v1/object/public/app//picture4.png',
      title: `What do you want\n${agentName || 'your agent'} to do?`,
      content: 'Describe your agent\'s behavior and capabilities',
      hasBehavior: true
    },
    {
      image: 'https://wbsnlpviggcnwqfyfobh.supabase.co/storage/v1/object/public/app//picture10.png',
      title: 'Review',
      content: '',
      hasReview: true
    },
    {
      image: 'https://wbsnlpviggcnwqfyfobh.supabase.co/storage/v1/object/public/app//picture11.png',
      title: 'Your agent is ready!',
      content: 'Deposit funds to your agent wallet to get started',
      hasAgentLive: true
    }
  ];

  const dataSources = [
    'Market data',
    'Social sentiment',
    'News feeds',
    'Financial reports',
    'Trading signals',
    'Economic indicators',
    'Company filings',
    'Technical analysis'
  ];

  const filteredSources = dataSources.filter(source =>
    source.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const chains = [
    { name: 'Polygon', logo: 'https://coin-images.coingecko.com/coins/images/32440/large/polygon.png?1698233684' },
    { name: 'Solana', logo: 'https://metacore.mobula.io/78ee4d656f4f152a90d733f4eaaa4e1685e25bc654087acdb62bfe494d668976.png' },
    { name: 'Base', logo: 'https://dd.dexscreener.com/ds-data/chains/base.png' },
    { name: 'Kadena', logo: 'https://coin-images.coingecko.com/coins/images/3693/large/Social_-_Profile_Picture.png?1723001308' }
  ];

  const filteredChains = chains.filter(chain =>
    chain.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Preload all static images in slides and chains
  useEffect(() => {
    let isMounted = true;
    const urls = [
      ...slides.map(slide => slide.image),
      ...chains.map(chain => chain.logo)
    ];
    let loadedCount = 0;
    urls.forEach((url) => {
      const img = new window.Image();
      img.src = url;
      img.onload = img.onerror = () => {
        loadedCount++;
        if (loadedCount === urls.length && isMounted) {
          setImagesLoaded(true);
        }
      };
    });
    return () => { isMounted = false; };
  }, []);

  if (!imagesLoaded) {
    return (
      <div className="agent-launcher-loading">
        <div className="cool-spinner"></div>
        <div className="cool-loading-text">Loading your Trading Agent experience...</div>
      </div>
    );
  }

  const validateInviteCode = () => {
    if (inviteCode.toLowerCase() === 'harshal') {
      setInviteError('');
      handleNext();
    } else {
      setInviteError('Invalid invite code. Please try again.');
    }
  };

  const handleNext = () => {
    if (currentStep < slides.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      setShowAgentLauncher(true);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB check
        alert('File size must be less than 1MB');
        return;
      }
      setAgentImage(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleStrategySelect = (strategy) => {
    setSelectedStrategy(strategy);
  };

  const handleSourceClick = (source) => {
    setSelectedSources(prev => 
      prev.includes(source) 
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  const handleChainClick = (chain) => {
    setSelectedChains(prev => 
      prev.includes(chain) 
        ? prev.filter(c => c !== chain)
        : [...prev, chain]
    );
  };

  const handleAIRating = async () => {
    if (!agentBehavior.trim()) return;
    setIsGeneratingQuestions(true);
    setAiRating(null);
    setAiSteps([]);
    setFollowUpQuestions([]);
    setReviewEnabled(false);
    try {
      // Simulate API call delay
      await new Promise(res => setTimeout(res, 1200));
      // Simulate AI response
      // For demo: random rating 6-10
      const rating = Math.floor(Math.random() * 5) + 6; // 6-10
      setAiRating(rating);
      if (rating < 8) {
        // Simulate follow-up questions
        setFollowUpQuestions([
          "What specific trading strategies should the agent focus on?",
          "How frequently should the agent analyze market data?",
          "What risk management parameters should be implemented?",
          "Should the agent focus on specific asset classes?",
          "How should the agent handle market volatility?"
        ]);
        setAiSteps([]);
        setReviewEnabled(false);
      } else {
        // Simulate steps
        setAiSteps([
          "Analyze market trends using technical indicators.",
          "Monitor social sentiment for trading signals.",
          "Execute trades based on predefined criteria.",
          "Apply risk management rules to all trades.",
          "Provide daily performance summaries."
        ]);
        setFollowUpQuestions([]);
        setReviewEnabled(true);
      }
    } catch (error) {
      setAiRating(null);
      setAiSteps([]);
      setFollowUpQuestions([]);
      setReviewEnabled(false);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handleCreateAgent = async () => {
    setIsCreating(true);
    try {
      // Check if bucket exists, if not create it
      const { error: bucketError } = await supabase
        .storage
        .createBucket('images', {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif'],
          fileSizeLimit: 1024 * 1024 * 2 // 2MB
        });

      // Upload image to storage if exists
      let imageUrl = null;
      if (agentImage) {
        const fileExt = agentImage.name.split('.').pop();
        const filePath = `agent-images/${Date.now()}.${fileExt}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('images')
          .upload(filePath, agentImage, {
            cacheControl: '3600',
            upsert: false
          });
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);
        
        imageUrl = publicUrl;
      }

      // Get current user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      // Insert agent data into agents2 table
      const { data: agentData, error } = await supabase
        .from('agents2')
        .insert([
          {
            name: agentName,
            description: agentDescription,
            image: imageUrl,
            user_id: session?.user?.id,
            type: 'trading'
          }
        ])
        .select();

      if (error) throw error;

      if (agentData && agentData.length > 0) {
        const agentId = agentData[0].id;
        console.log('Trading agent created successfully:', agentId);
        handleNext();
      }
    } catch (error) {
      console.error('Error creating trading agent:', error);
      alert(`Failed to create agent: ${error.message || 'Unknown error'}`);
    }
  };

  // If showing AgentLauncher, render it instead of TradingAgentLauncher content
  if (showAgentLauncher) {
    return <AgentLauncher />;
  }

  return (
    <div className="agent-launcher-container">
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

      <IconButton 
        className="back-button"
        onClick={handleBack}
        sx={{ 
          color: 'white',
          position: 'absolute',
          top: '20px',
          left: '40px',
          zIndex: 1,
          '@media (max-width: 768px)': {
            display: 'none'
          }
        }}
      >
        <ArrowBackIcon />
      </IconButton>

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
              {slides[currentStep].hasInviteCode ? (
                <div style={{ width: '90%' }}>
                  <p style={{ marginBottom: '1.5rem' }}>{slides[currentStep].content}</p>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => {
                      setInviteCode(e.target.value);
                      setInviteError('');
                    }}
                    placeholder="Enter invite code"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      marginBottom: '16px',
                      backgroundColor: '#1a1a1a',
                      border: inviteError ? '1px solid red' : 'none',
                      borderRadius: '10px',
                      color: 'white',
                      height: '40px',
                      fontSize: '14px'
                    }}
                  />
                  {inviteError && (
                    <p style={{ color: 'red', fontSize: '14px', marginBottom: '16px' }}>
                      {inviteError}
                    </p>
                  )}
                  <button 
                    className="next-button"
                    onClick={validateInviteCode}
                    style={{ 
                      width: '100%',
                      backgroundColor: !inviteCode.trim() ? '#666' : 'white',
                      color: 'black',
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: !inviteCode.trim() ? 'default' : 'pointer',
                      fontWeight: '500'
                    }}
                    disabled={!inviteCode.trim()}
                  >
                    Continue
                  </button>
                </div>
              ) : slides[currentStep].hasForm ? (
                <>
                  <p>{slides[currentStep].content}</p>
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="Enter agent name"
                    style={{
                      width: '90%',
                      padding: '10px 12px',
                      marginBottom: '16px',
                      backgroundColor: '#1a1a1a',
                      border: 'none',
                      borderRadius: '10px',
                      color: 'white',
                      height: '40px',
                      fontSize: '14px'
                    }}
                  />
                  <p>{`What should people know about ${agentName || 'your agent'}?`}</p>
                  <textarea
                    value={agentDescription}
                    onChange={(e) => setAgentDescription(e.target.value)}
                    placeholder="Add some description about the agent that everyone will see"
                    style={{
                      width: '90%',
                      padding: '12px',
                      marginBottom: '20px',
                      backgroundColor: '#1a1a1a',
                      border: 'none',
                      borderRadius: '10px',
                      color: 'white',
                      minHeight: '50%',
                      resize: 'vertical'
                    }}
                  />
                </>
              ) : slides[currentStep].hasUpload ? (
                <div style={{ width: '90%' }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={handleUploadClick}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#1a1a1a',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '10px',
                      color: 'white',
                      cursor: 'pointer',
                      marginBottom: '20px'
                    }}
                  >
                    {agentImage ? 'Change Image' : 'Upload Image'}
                  </button>
                  {agentImage && (
                    <div style={{ marginBottom: '20px' }}>
                      <img
                        src={URL.createObjectURL(agentImage)}
                        alt="Preview"
                        style={{
                          width: '100%',
                          maxHeight: '200px',
                          objectFit: 'contain',
                          borderRadius: '10px'
                        }}
                      />
                    </div>
                  )}
                </div>
              ) : slides[currentStep].hasStrategy ? (
                <div style={{ width: '90%' }}>
                  <p style={{ marginBottom: '1.5rem' }}>{slides[currentStep].content}</p>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '16px',
                    marginBottom: '20px'
                  }}>
                    <div
                      onClick={() => handleStrategySelect('trading')}
                      style={{
                        backgroundColor: '#1a1a1a',
                        borderRadius: '12px',
                        padding: '16px',
                        cursor: 'pointer',
                        border: selectedStrategy === 'trading' ? '1px solid white' : '1px solid transparent'
                      }}
                    >
                      <img 
                        src="https://wbsnlpviggcnwqfyfobh.supabase.co/storage/v1/object/public/app//picture8.png" 
                        alt="Trading Strategy"
                        style={{
                          width: '100%',
                          height: 'auto',
                          marginBottom: '8px',
                          borderRadius: '8px'
                        }}
                      />
                      <h3 style={{ margin: '8px 0', textAlign: 'center' }}>Trading Strategy</h3>
                      <p style={{ margin: 0, textAlign: 'center', fontSize: '14px', color: '#888' }}>
                        Create an AI agent that analyzes market trends and executes trades based on technical indicators and market sentiment
                      </p>
                    </div>
                    
                    <div
                      onClick={() => handleStrategySelect('defi')}
                      style={{
                        backgroundColor: '#1a1a1a',
                        borderRadius: '12px',
                        padding: '16px',
                        cursor: 'pointer',
                        border: selectedStrategy === 'defi' ? '1px solid white' : '1px solid transparent'
                      }}
                    >
                      <img 
                        src="https://wbsnlpviggcnwqfyfobh.supabase.co/storage/v1/object/public/app//picture9.png" 
                        alt="DeFi AI Agent"
                        style={{
                          width: '100%',
                          height: 'auto',
                          marginBottom: '8px',
                          borderRadius: '8px'
                        }}
                      />
                      <h3 style={{ margin: '8px 0', textAlign: 'center' }}>DeFi AI Agent</h3>
                      <p style={{ margin: 0, textAlign: 'center', fontSize: '14px', color: '#888' }}>
                        Deploy an AI agent that manages DeFi positions, executes yield farming strategies, and optimizes liquidity provision
                      </p>
                    </div>
                  </div>
                </div>
              ) : slides[currentStep].hasDataSources ? (
                <div style={{ width: '90%' }}>
                  <p style={{ marginBottom: '1.5rem' }}>{slides[currentStep].content}</p>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="What are you looking for?"
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#1a1a1a',
                      border: 'none',
                      borderRadius: '10px',
                      color: 'white',
                      height: '40px',
                      fontSize: '14px',
                      marginBottom: '16px'
                    }}
                  />
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginBottom: '20px'
                  }}>
                    {filteredSources.map((source, index) => (
                      <span
                        key={index}
                        onClick={() => handleSourceClick(source)}
                        style={{
                          backgroundColor: '#1a1a1a',
                          padding: '8px 16px',
                          borderRadius: '20px',
                          color: 'white',
                          fontSize: '14px',
                          cursor: 'pointer',
                          border: selectedSources.includes(source) ? '1px solid white' : '1px solid transparent'
                        }}
                      >
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              ) : slides[currentStep].hasChains ? (
                <div style={{ width: '90%' }}>
                  <p style={{ marginBottom: '20px' }}>{slides[currentStep].content}</p>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search chains..."
                    style={{
                      width: '100%',
                      padding: '8px',
                      backgroundColor: '#1a1a1a',
                      border: 'none',
                      borderRadius: '10px',
                      color: 'white',
                      height: '32px',
                      fontSize: '14px',
                      marginBottom: '16px'
                    }}
                  />
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '16px',
                    marginBottom: '20px'
                  }}>
                    {filteredChains.map((chain, index) => (
                      <div
                        key={index}
                        onClick={() => handleChainClick(chain.name)}
                        style={{
                          backgroundColor: '#1a1a1a',
                          padding: '16px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          border: selectedChains.includes(chain.name) ? '1px solid white' : '1px solid transparent',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}
                      >
                        <img 
                          src={chain.logo} 
                          alt={chain.name}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%'
                          }}
                        />
                        <span style={{ color: 'white', fontSize: '14px' }}>{chain.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : slides[currentStep].hasBehavior ? (
                <div style={{ width: '90%' }}>
                  <p style={{ marginBottom: '1.5rem' }}>{slides[currentStep].content}</p>
                  <textarea
                    value={agentBehavior}
                    onChange={(e) => setAgentBehavior(e.target.value)}
                    placeholder="Describe what you want your agent to do. Be specific about its trading strategies, risk management, and decision-making process."
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#1a1a1a',
                      border: 'none',
                      borderRadius: '10px',
                      color: 'white',
                      minHeight: '150px',
                      fontSize: '14px',
                      marginBottom: '16px',
                      resize: 'vertical'
                    }}
                  />

                  <button 
                    onClick={handleAIRating}
                    disabled={!agentBehavior.trim() || isGeneratingQuestions}
                    style={{ 
                      width: '100%',
                      backgroundColor: !agentBehavior.trim() || isGeneratingQuestions ? '#666' : 'white',
                      color: 'black',
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: !agentBehavior.trim() || isGeneratingQuestions ? 'default' : 'pointer',
                      fontWeight: '500',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {isGeneratingQuestions ? (
                      <>
                        Analyzing...
                        <div style={loadingAnimation} />
                      </>
                    ) : (
                      'Continue'
                    )}
                  </button>

                  <button 
                    onClick={handleNext}
                    disabled={!reviewEnabled}
                    style={{ 
                      width: '100%',
                      backgroundColor: !reviewEnabled ? '#666' : '#222',
                      color: 'white',
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: !reviewEnabled ? 'default' : 'pointer',
                      fontWeight: '500',
                      marginBottom: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    Review
                  </button>

                  {aiRating !== null && (
                    <div style={{ color: 'white', marginBottom: '12px', fontSize: '16px', fontWeight: 500 }}>
                      AI Rating: <span style={{ color: aiRating >= 8 ? '#4caf50' : '#ff9800' }}>{aiRating} / 10</span>
                    </div>
                  )}

                  {followUpQuestions.length > 0 && (
                    <div style={{ 
                      backgroundColor: '#1a1a1a',
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: '20px'
                    }}>
                      <p style={{ 
                        color: '#666', 
                        marginBottom: '12px',
                        fontSize: '14px'
                      }}>follow-up questions:</p>
                      <ul style={{ 
                        margin: 0,
                        paddingLeft: '20px',
                        color: 'white',
                        fontSize: '14px'
                      }}>
                        {followUpQuestions.map((question, index) => (
                          <li key={index} style={{ marginBottom: '8px' }}>{question}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiSteps.length > 0 && (
                    <div style={{ 
                      backgroundColor: '#1a1a1a',
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: '20px'
                    }}>
                      <p style={{ 
                        color: '#4caf50', 
                        marginBottom: '12px',
                        fontSize: '14px',
                        fontWeight: 600
                      }}>Strategy Steps:</p>
                      <ul style={{ 
                        margin: 0,
                        paddingLeft: '20px',
                        color: 'white',
                        fontSize: '14px'
                      }}>
                        {aiSteps.map((step, index) => (
                          <li key={index} style={{ marginBottom: '8px' }}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : slides[currentStep].hasReview ? (
                <div style={{ width: '90%' }}>
                  <div style={{ 
                    backgroundColor: '#111',
                    borderRadius: '16px',
                    padding: '24px',
                    marginBottom: '24px'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      marginBottom: '24px' 
                    }}>
                      {agentImage ? (
                        <img 
                          src={URL.createObjectURL(agentImage)} 
                          alt="Agent profile" 
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: '#1a1a1a'
                        }} />
                      )}
                      <h3 style={{ margin: 0 }}>{agentName}</h3>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <p style={{ color: '#666', marginBottom: '8px' }}>Description:</p>
                      <p style={{ margin: 0 }}>{agentDescription}</p>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <p style={{ color: '#666', marginBottom: '8px' }}>Strategy:</p>
                      <p style={{ margin: 0 }}>{selectedStrategy === 'trading' ? 'Trading Strategy' : 'DeFi AI Agent'}</p>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <p style={{ color: '#666', marginBottom: '8px' }}>Data Sources:</p>
                      <p style={{ margin: 0 }}>{selectedSources.join(', ') || 'No sources selected'}</p>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <p style={{ color: '#666', marginBottom: '8px' }}>Chains:</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {selectedChains.map((chain, index) => (
                          <div key={index} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            backgroundColor: '#1a1a1a',
                            padding: '8px 12px',
                            borderRadius: '20px'
                          }}>
                            <img 
                              src={chains.find(c => c.name === chain)?.logo} 
                              alt={chain}
                              style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%'
                              }}
                            />
                            <span style={{ color: 'white', fontSize: '14px' }}>{chain}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <p style={{ color: '#666', marginBottom: '8px' }}>Behavior:</p>
                      <p style={{ margin: 0 }}>{agentBehavior || 'No behavior specified'}</p>
                    </div>
                  </div>

                  <button 
                    className="next-button"
                    onClick={handleNext}
                    disabled={isCreating}
                    style={{
                      width: '100%',
                      backgroundColor: isCreating ? '#666' : 'white',
                      color: 'black',
                      marginBottom: '12px',
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: isCreating ? 'default' : 'pointer',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px'
                    }}
                  >
                    {isCreating ? (
                      <>
                        Creating your agent
                        <div style={loadingAnimation} />
                      </>
                    ) : (
                      `Start your 7 day free trial`
                    )}
                  </button>

                  <button 
                    onClick={handleBack}
                    style={{
                      width: '100%',
                      backgroundColor: '#1a1a1a',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer',
                      padding: '12px',
                      borderRadius: '8px'
                    }}
                  >
                    Change Info
                  </button>
                </div>
              ) : slides[currentStep].hasAgentLive ? (
                <div style={{ width: '90%', textAlign: 'center' }}>
                  <img
                    src={"https://wbsnlpviggcnwqfyfobh.supabase.co/storage/v1/object/public/app//picture2.png"}
                    alt="Agent Live"
                    style={{ width: '120px', margin: '0 auto 24px', display: 'block' }}
                  />
                  <h2 style={{ color: '#4caf50', marginBottom: '16px' ,fontSize: '12px'}}>{"Your agent wallet is: 0x926cB91d10545fD08cBFDa86127F55D70fbA05e6"}</h2>
                  <p style={{ color: 'white', fontSize: '18px', marginBottom: '24px' }}>{slides[currentStep].content}</p>
                  <button
                    onClick={() => setShowAgentLauncher(true)}
                    style={{
                      width: '100%',
                      backgroundColor: 'white',
                      color: 'black',
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '500',
                      fontSize: '16px'
                    }}
                  >
                    Manage Agent
                  </button>
                </div>
              ) : null}

              {currentStep === 1 ? (
                <button 
                  className="next-button"
                  onClick={handleNext}
                  disabled={!agentName.trim()}
                  style={{ 
                    marginTop: '1rem',
                    width: '100%',
                    backgroundColor: !agentName.trim() ? '#666' : 'white',
                    color: 'black',
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: !agentName.trim() ? 'default' : 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Continue
                </button>
              ) : (currentStep > 1 && currentStep < 7 && currentStep !== 6) ? (
                <button 
                  className="next-button"
                  onClick={handleNext}
                  style={{ 
                    marginTop: '1rem',
                    width: '100%',
                    backgroundColor: 'white',
                    color: 'black',
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Continue
                </button>
              ) : null}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default TradingAgentLauncher; 