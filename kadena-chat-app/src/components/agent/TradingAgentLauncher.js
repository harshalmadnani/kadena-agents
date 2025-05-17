import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import './SocialAgentLauncher.css';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import AgentLauncher from './AgentLauncher';
import Navbar from '../Navbar';
import { useAuth } from '../../context/AuthContext';

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
  const [aiJustification, setAiJustification] = useState('');
  const [agentWalletAddress, setAgentWalletAddress] = useState('');
  const { user } = useAuth();
  const [aiCode, setAiCode] = useState('');
  const [interval, setIntervalValue] = useState(null);
  const [isFetchingAICode, setIsFetchingAICode] = useState(false);

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
    setAiJustification('');
    try {
      const response = await fetch('https://kadena-trader.onrender.com/prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: agentBehavior })
      });
      
      console.log('Trader API response:', response);
      if (!response.ok) throw new Error('Failed to get AI rating');
      const data = await response.json();
      let parsed;
      try {
        parsed = typeof data === 'string' ? JSON.parse(data) : data;
      } catch (e) {
        throw new Error('AI response was not valid JSON');
      }
      console.log('AI Justification:', parsed.response.justification);
      const { rating, justification, questions } = parsed.response;
      setAiRating(rating);
      setAiJustification(justification || '');
      setFollowUpQuestions(questions || []);
      setAiSteps([]); // Not used in this flow
      setReviewEnabled(rating > 5); // Only enable review if rating > 7
      if (rating > 5) {
        localStorage.setItem('agentBehavior', agentBehavior); // Store agentBehavior
        await fetchAICodeAndInterval(); // Fetch code and interval after successful rating
      }
    } catch (error) {
      setAiRating(null);
      setAiSteps([]);
      setFollowUpQuestions([]);
      setReviewEnabled(false);
      setAiJustification('');
      alert(error.message || 'Failed to get AI rating');
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handleCreateAgent = async () => {
    console.log("handleCreateAgent called");
    setIsCreating(true);
    try {
      // 1. Generate wallet (NEW ENDPOINT & PARSING)
      const walletRes = await fetch('https://kadena-wallet-99b8.onrender.com/create-wallet');
      if (!walletRes.ok) throw new Error('Failed to generate wallet');
      const walletText = await walletRes.text();
      // Parse response like:
      // Mnemonic: ...\nPublic Key: ...\nPrivate Key: ...
      const mnemonicMatch = walletText.match(/Mnemonic:\s*(.*)/);
      const publicKeyMatch = walletText.match(/Public Key:\s*(.*)/);
      const privateKeyMatch = walletText.match(/Private Key:\s*(.*)/);
      const mnemonic = mnemonicMatch ? mnemonicMatch[1].trim() : '';
      const publicKey = publicKeyMatch ? publicKeyMatch[1].trim() : '';
      const privateKey = privateKeyMatch ? privateKeyMatch[1].trim() : '';
      const address = 'k:' + publicKey; // Use k: + publicKey as address
      setAgentWalletAddress(address); // Store the generated wallet address

      // 2. Upload image if present
      let imageUrl = null;
      if (agentImage) {
        const fileExt = agentImage.name.split('.').pop();
        const filePath = 'agent-images/' + Date.now() + '.' + fileExt;
        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, agentImage, {
            cacheControl: '3600',
            upsert: false
          });
        if (uploadError) throw new Error('Image upload failed: ' + uploadError.message);
        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);
        imageUrl = publicUrl;
      }

      // 3. Get current user session
      if (!user || !user.accountName) {
        alert('You must be logged in to create an agent.');
        setIsCreating(false);
        return;
      }

      // 4. Validate required fields
      if (!agentName.trim() || !agentBehavior.trim()) {
        alert('Name and behavior are required.');
        setIsCreating(false);
        return;
      }

      // 5. Prepare insert payload
      const payload = {
        name: agentName,
        description: agentDescription,
        image: imageUrl,
        user_id: user.accountName,
        trading_agent: true,
        agent_pubkey: publicKey,
        agent_wallet: address,
        agent_privatekey: privateKey,
        prompt: agentBehavior
      };

      // 6. Insert into Supabase
      const { data: agentData, error } = await supabase
        .from('agents2')
        .insert([payload])
        .select();

      if (error) {
        console.error('Supabase insert error:', error);
        alert('Supabase error: ' + (error.message || JSON.stringify(error)));
        setIsCreating(false);
        return;
      }

      if (!agentData || agentData.length === 0) {
        alert('Agent was not created. Please check your Supabase table and policies.');
        setIsCreating(false);
        return;
      }

      // Success!
      const agentId = agentData[0].id;
      console.log('Trading agent created successfully:', agentId);

      // Call AWS API with AI code and interval
      if (aiCode && interval) {
        try {
          const awsPayload = {
            code: sanitizeCode(aiCode),
            interval: interval,
            functionName: agentId,
            PRIVATE_KEY: privateKey,
            PUBLIC_KEY: publicKey
          };
          console.log('AWS API payload:', awsPayload);
          const awsRes = await fetch('https://aws-api-zm6j.onrender.com/create-scheduled-lambda', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(awsPayload)
          });
          if (!awsRes.ok) {
            const awsErrText = await awsRes.text();
            console.error('AWS API error:', awsErrText);
            // Optionally alert or log, but do not block user
          } else {
            const awsData = await awsRes.json();
            console.log('AWS API response:', awsData);
          }
        } catch (awsError) {
          console.error('Error calling AWS API:', awsError);
          // Optionally alert or log, but do not block user
        }
      } else {
        console.warn('AI code or interval missing, skipping AWS API call.');
      }
      handleNext();
    } catch (error) {
      console.error('Error creating trading agent:', error);
      alert('Failed to create agent: ' + (error.message || 'Unknown error'));
    } finally {
      setIsCreating(false);
    }
  };

  // Function to sanitize prompt and call /code endpoint
  const fetchAICodeAndInterval = async () => {
    if (!agentBehavior.trim()) return;
    setIsFetchingAICode(true);
    // Sanitize: trim and collapse whitespace
    const sanitizedPrompt = agentBehavior.trim().replace(/\s+/g, ' ');
    try {
      const response = await fetch('https://kadena-trader.onrender.com/code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: sanitizedPrompt })
      });
      if (!response.ok) throw new Error('Failed to get code from AI');
      const data = await response.json();
      console.log('AI /code response:', data); // Log the /code response
      let parsed;
      try {
        parsed = typeof data === 'string' ? JSON.parse(data) : data;
      } catch (e) {
        throw new Error('AI /code response was not valid JSON');
      }
      // Expecting { code: ..., interval: ... }
      setAiCode(parsed.code || '');
      setIntervalValue(parsed.interval || null);
    } catch (error) {
      setAiCode('');
      setIntervalValue(null);
      alert(error.message || 'Failed to get code from AI');
    } finally {
      setIsFetchingAICode(false);
    }
  };

  function sanitizeCode(code) {
    if (!code) return '';
    // 1. Trim whitespace
    let sanitized = code.trim();
    // 2. Normalize line endings
    sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    // 3. Remove leading/trailing blank lines
    sanitized = sanitized.replace(/^\s*\n+/g, '').replace(/\n+\s*$/g, '');
    // 4. Collapse multiple blank lines to a single blank line
    sanitized = sanitized.replace(/\n{3,}/g, '\n\n');
    return sanitized;
  }

  // If showing AgentLauncher, render it instead of TradingAgentLauncher content
  if (showAgentLauncher) {
    return <AgentLauncher />;
  }

  return (
    <>
      <Navbar />
      <div className="agent-launcher-container">
        <div className="progress-bar-container">
          <div 
            className="progress-bar"
            style={{
              width: ((currentStep + 1) / slides.length) * 100 + '%',
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
            { 'Step ' + (currentStep + 1) + ' of ' + slides.length }
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
                  alt={'Step ' + (currentStep + 1)}
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
                    <p>{'What should people know about ' + (agentName || 'your agent') + '?'}</p>
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
                        'Review'
                      )}
                    </button>

                    <button 
                      onClick={handleNext}
                      disabled={!reviewEnabled || isFetchingAICode}
                      style={{ 
                        width: '100%',
                        backgroundColor: !reviewEnabled || isFetchingAICode ? '#666' : '#222',
                        color: 'white',
                        padding: '12px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: !reviewEnabled || isFetchingAICode ? 'default' : 'pointer',
                        fontWeight: '500',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      Continue
                    </button>

                    {aiRating !== null && (
                      <div style={{ color: 'white', marginBottom: '12px', fontSize: '16px', fontWeight: 500 }}>
                        AI Rating: <span style={{ color: aiRating >= 8 ? '#4caf50' : '#ff9800' }}>{aiRating} / 10</span>
                        {aiJustification && (
                          <div style={{ color: '#aaa', fontSize: '14px', marginTop: '8px', fontWeight: 400 }}>
                            <strong>Justification:</strong> {aiJustification}
                          </div>
                        )}
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
                      onClick={handleCreateAgent}
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
                        'Start your 7 day free trial'
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
                    <h2 style={{ color: '#4caf50', marginBottom: '16px' ,fontSize: '12px'}}>Your agent wallet is:</h2>
                    <div style={{ color: 'white', fontSize: '18px', marginBottom: '16px', wordBreak: 'break-all' }}>{agentWalletAddress || '...'}</div>
                    <p style={{ color: 'white', fontSize: '18px', marginBottom: '24px' }}>{slides[currentStep].content}</p>
                    <button
                      onClick={() => navigate('/wallet')}
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
                ) : (currentStep > 1 && currentStep < 7 && currentStep !== 6 && !slides[currentStep].hasBehavior && !slides[currentStep].hasReview && !slides[currentStep].hasAgentLive) ? (
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
    </>
  );
};

export default TradingAgentLauncher; 