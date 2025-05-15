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
      // 1. Generate wallet
      const walletRes = await fetch('https://kadena-wallet-aptx.onrender.com/generate-wallet');
      if (!walletRes.ok) throw new Error('Failed to generate wallet');
      const walletData = await walletRes.json();
      const { publicKey, address, privateKey } = walletData;
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
          const baseCode = [
            'import { sign } from "@kadena/cryptography-utils";',
            'import { Pact, createClient } from "@kadena/client";',
            'import dotenv from "dotenv";',
            '// Custom error classes for better error handling',
            'class KadenaError extends Error {',
            '  constructor(message, code = "KADENA_ERROR", details = {}) {',
            '    super(message);',
            '    this.name = "KadenaError";',
            '    this.code = code;',
            '    this.details = details;',
            '  }',
            '}',
            'class ValidationError extends KadenaError {',
            '  constructor(message, details = {}) {',
            '    super(message, "VALIDATION_ERROR", details);',
            '    this.name = "ValidationError";',
            '  }',
            '}',
            'class TransactionError extends KadenaError {',
            '  constructor(message, details = {}) {',
            '    super(message, "TRANSACTION_ERROR", details);',
            '    this.name = "TransactionError";',
            '  }',
            '}',
            'class AuthenticationError extends KadenaError {',
            '  constructor(message, details = {}) {',
            '    super(message, "AUTH_ERROR", details);',
            '    this.name = "AuthenticationError";',
            '  }',
            '}',
            'dotenv.config();',
            '',
            '// API configuration',
            'const API_BASE_URL = "https://kadena-agents.onrender.com";',
            'let API_KEY = process.env.API_KEY;',
            '',
            'export const chainId = "2";',
            'export const networkId = "mainnet01";',
            'export const rpcUrl = `https://api.chainweb.com/chainweb/0.0/${networkId}/chain/${chainId}/pact`;',
            '',
            'const client = createClient(rpcUrl);',
            '',
            '// Constants',
            'const NETWORK_ID = "mainnet01";',
            '',
            'function setApiKey(apiKey) {',
            '  if (!apiKey || typeof apiKey !== "string") {',
            '    throw new Error("Invalid API key provided");',
            '  }',
            '  API_KEY = apiKey;',
            '}',
            '',
            'async function makeRequest(endpoint, body) {',
            '  try {',
            '    if (!API_KEY) {',
            '      throw new AuthenticationError("API key is not set", {',
            '        endpoint,',
            '        suggestion: "Set API_KEY environment variable or call setApiKey()",',
            '      });',
            '    }',
            '',
            '    if (!endpoint || typeof endpoint !== "string") {',
            '      throw new ValidationError("Invalid endpoint provided", {',
            '        endpoint,',
            '        expectedType: "string",',
            '        receivedType: typeof endpoint,',
            '      });',
            '    }',
            '',
            '    if (!body || typeof body !== "object") {',
            '      throw new ValidationError("Invalid request body", {',
            '        expectedType: "object",',
            '        receivedType: typeof body,',
            '      });',
            '    }',
            '',
            '    const response = await fetch(`${API_BASE_URL}${endpoint}`, {',
            '      method: "POST",',
            '      headers: {',
            '        "Content-Type": "application/json",',
            '        "x-api-key": API_KEY,',
            '      },',
            '      body: JSON.stringify(body),',
            '    });',
            '',
            '    let errorData;',
            '    if (!response.ok) {',
            '      try {',
            '        errorData = await response.json();',
            '      } catch (e) {',
            '        errorData = { error: "Unknown error", parseError: e.message };',
            '      }',
            '',
            '      const errorDetails = {',
            '        status: response.status,',
            '        statusText: response.statusText,',
            '        endpoint,',
            '        errorData,',
            '      };',
            '',
            '      switch (response.status) {',
            '        case 401:',
            '        case 403:',
            '          throw new AuthenticationError("Authentication failed", errorDetails);',
            '        case 400:',
            '          throw new ValidationError("Invalid request parameters", errorDetails);',
            '        case 404:',
            '          throw new KadenaError(',
            '            "Resource not found",',
            '            "NOT_FOUND_ERROR",',
            '            errorDetails',
            '          );',
            '        case 429:',
            '          throw new KadenaError(',
            '            "Rate limit exceeded",',
            '            "RATE_LIMIT_ERROR",',
            '            errorDetails',
            '          );',
            '        default:',
            '          throw new KadenaError(',
            '            `API Error (${response.status}): ${',
            '              errorData.error || response.statusText',
            '            }`,',
            '            "API_ERROR",',
            '            errorDetails',
            '          );',
            '      }',
            '    }',
            '',
            '    return await response.json();',
            '  } catch (error) {',
            '    if (error instanceof KadenaError) {',
            '      throw error;',
            '    }',
            '',
            '    // Handle network errors',
            '    if (error.name === "TypeError" && error.message.includes("fetch")) {',
            '      throw new KadenaError(',
            '        "Network error: Unable to reach API",',
            '        "NETWORK_ERROR",',
            '        {',
            '          originalError: error.message,',
            '          endpoint,',
            '        }',
            '      );',
            '    }',
            '',
            '    throw new KadenaError(`Request failed: ${error.message}`, "REQUEST_ERROR", {',
            '      originalError: error.message,',
            '      endpoint,',
            '      body,',
            '    });',
            '  }',
            '}',
            '',
            'function validateChainId(chainId) {',
            '  const chainIdStr = String(chainId);',
            '  const chainIdNum = parseInt(chainIdStr, 10);',
            '',
            '  if (isNaN(chainIdNum) || chainIdNum < 0 || chainIdNum > 19) {',
            '    throw new Error("Chain ID must be between 0 and 19");',
            '  }',
            '',
            '  return chainIdStr;',
            '}',
            '',
            'async function transfer({',
            '  tokenAddress,',
            '  sender,',
            '  receiver,',
            '  amount,',
            '  chainId,',
            '  meta,',
            '  gasLimit,',
            '  gasPrice,',
            '  ttl,',
            '}) {',
            '  if (!tokenAddress) throw new Error("tokenAddress is required");',
            '  if (!sender) throw new Error("sender is required");',
            '  if (!receiver) throw new Error("receiver is required");',
            '  if (amount === undefined || amount === null)',
            '    throw new Error("amount is required");',
            '',
            '  const validatedChainId = validateChainId(chainId);',
            '',
            '  const requestBody = {',
            '    tokenAddress,',
            '    sender,',
            '    receiver,',
            '    amount: String(amount),',
            '    chainId: validatedChainId,',
            '  };',
            '',
            '  if (meta !== undefined) requestBody.meta = meta;',
            '  if (gasLimit !== undefined) requestBody.gasLimit = gasLimit;',
            '  if (gasPrice !== undefined) requestBody.gasPrice = gasPrice;',
            '  if (ttl !== undefined) requestBody.ttl = ttl;',
            '',
            '  return await makeRequest("/transfer", requestBody);',
            '}',
            '',
            'async function swap({',
            '  tokenInAddress,',
            '  tokenOutAddress,',
            '  account,',
            '  chainId,',
            '  amountIn,',
            '  amountOut,',
            '  slippage,',
            '}) {',
            '  if (!tokenInAddress) throw new Error("tokenInAddress is required");',
            '  if (!tokenOutAddress) throw new Error("tokenOutAddress is required");',
            '  if (!account) throw new Error("account is required");',
            '',
            '  if (amountIn === undefined && amountOut === undefined) {',
            '    throw new Error("Either amountIn or amountOut must be provided");',
            '  }',
            '  if (amountIn !== undefined && amountOut !== undefined) {',
            '    throw new Error("Cannot specify both amountIn and amountOut");',
            '  }',
            '',
            '  const validatedChainId = validateChainId(chainId);',
            '',
            '  const requestBody = {',
            '    tokenInAddress,',
            '    tokenOutAddress,',
            '    account,',
            '    chainId: validatedChainId,',
            '  };',
            '',
            '  if (amountIn !== undefined) requestBody.amountIn = String(amountIn);',
            '  if (amountOut !== undefined) requestBody.amountOut = String(amountOut);',
            '  if (slippage !== undefined) requestBody.slippage = slippage;',
            '',
            '  return await makeRequest("/swap", requestBody);',
            '}',
            '',
            'async function quote({',
            '  tokenInAddress,',
            '  tokenOutAddress,',
            '  chainId,',
            '  amountIn,',
            '  amountOut,',
            '}) {',
            '  if (!tokenInAddress) throw new Error("tokenInAddress is required");',
            '  if (!tokenOutAddress) throw new Error("tokenOutAddress is required");',
            '',
            '  if (amountIn === undefined && amountOut === undefined) {',
            '    throw new Error("Either amountIn or amountOut must be provided");',
            '  }',
            '  if (amountIn !== undefined && amountOut !== undefined) {',
            '    throw new Error("Cannot specify both amountIn and amountOut");',
            '  }',
            '',
            '  const validatedChainId = validateChainId(chainId);',
            '',
            '  const requestBody = {',
            '    tokenInAddress,',
            '    tokenOutAddress,',
            '    chainId: validatedChainId,',
            '  };',
            '',
            '  if (amountIn !== undefined) requestBody.amountIn = String(amountIn);',
            '  if (amountOut !== undefined) requestBody.amountOut = String(amountOut);',
            '',
            '  return await makeRequest("/quote", requestBody);',
            '}',
            '',
            '// Original baseline.js functions with reduced comments',
            '',
            'async function getKeys() {',
            '  try {',
            '    if (!process.env.PRIVATE_KEY) {',
            '      throw new AuthenticationError(',
            '        "PRIVATE_KEY environment variable is not set",',
            '        {',
            '          suggestion: "Add PRIVATE_KEY to your .env file",',
            '        }',
            '      );',
            '    }',
            '',
            '    if (!process.env.PUBLIC_KEY) {',
            '      throw new AuthenticationError(',
            '        "PUBLIC_KEY environment variable is not set",',
            '        {',
            '          suggestion: "Add PUBLIC_KEY to your .env file",',
            '        }',
            '      );',
            '    }',
            '',
            '    const privateKey = process.env.PRIVATE_KEY;',
            '    const publicKey = process.env.PUBLIC_KEY;',
            '',
            '    // Validate key formats',
            '    if (!/^[0-9a-f]{64}$/.test(privateKey)) {',
            '      throw new ValidationError("Invalid private key format", {',
            '        expectedFormat: "64 hex characters",',
            '        actualLength: privateKey.length,',
            '        suggestion: "Ensure private key is in correct hex format",',
            '      });',
            '    }',
            '',
            '    if (!/^[0-9a-f]{64}$/.test(publicKey)) {',
            '      throw new ValidationError("Invalid public key format", {',
            '        expectedFormat: "64 hex characters",',
            '        actualLength: publicKey.length,',
            '        suggestion: "Ensure public key is in correct hex format",',
            '      });',
            '    }',
            '',
            '    return {',
            '      secretKey: privateKey,',
            '      publicKey: publicKey,',
            '    };',
            '  } catch (error) {',
            '    if (error instanceof KadenaError) {',
            '      throw error;',
            '    }',
            '    throw new AuthenticationError(`Failed to retrieve keys: ${error.message}`, {',
            '      originalError: error.message,',
            '    });',
            '  }',
            '}',
            '',
            'async function signTransaction(transaction, keyPair) {',
            '  try {',
            '    if (!transaction) {',
            '      throw new ValidationError("Transaction is required", {',
            '        suggestion: "Provide a valid transaction object or string",',
            '      });',
            '    }',
            '',
            '    if (!keyPair || !keyPair.secretKey || !keyPair.publicKey) {',
            '      throw new ValidationError("Invalid key pair provided", {',
            '        expectedFormat: "Object with secretKey and publicKey properties",',
            '        received: keyPair ? Object.keys(keyPair) : typeof keyPair,',
            '      });',
            '    }',
            '',
            '    if (!transaction.hash) {',
            '      throw new ValidationError("Transaction hash is missing", {',
            '        transaction:',
            '          typeof transaction === "object"',
            '            ? Object.keys(transaction)',
            '            : typeof transaction,',
            '      });',
            '    }',
            '',
            '    const txString =',
            '      typeof transaction === "string"',
            '        ? transaction',
            '        : JSON.stringify(transaction);',
            '',
            '    try {',
            '      const signature = sign(transaction.hash, keyPair);',
            '      return signature;',
            '    } catch (signError) {',
            '      throw new TransactionError("Failed to sign transaction", {',
            '        originalError: signError.message,',
            '        transactionHash: transaction.hash,',
            '      });',
            '    }',
            '  } catch (error) {',
            '    if (error instanceof KadenaError) {',
            '      throw error;',
            '    }',
            '    throw new TransactionError(`Failed to sign transaction: ${error.message}`, {',
            '      originalError: error.message,',
            '    });',
            '  }',
            '}',
            '',
            'async function submitTransaction(signedTransaction) {',
            '  try {',
            '    if (!signedTransaction) {',
            '      throw new ValidationError("Signed transaction is required", {',
            '        suggestion: "Provide a valid signed transaction object",',
            '      });',
            '    }',
            '',
            '    if (!signedTransaction.hash) {',
            '      throw new ValidationError("Transaction hash is missing", {',
            '        transaction:',
            '          typeof signedTransaction === "object"',
            '            ? Object.keys(signedTransaction)',
            '            : typeof signedTransaction,',
            '      });',
            '    }',
            '',
            '    console.log(',
            '      "Submitting transaction to Kadena blockchain:",',
            '      signedTransaction',
            '    );',
            '',
            '    let transactionDescriptor;',
            '    try {',
            '      transactionDescriptor = await client.submit(signedTransaction);',
            '    } catch (submitError) {',
            '      throw new TransactionError("Failed to submit transaction", {',
            '        originalError: submitError.message,',
            '        transactionHash: signedTransaction.hash,',
            '      });',
            '    }',
            '',
            '    console.log("Transaction descriptor:", transactionDescriptor);',
            '',
            '    let response;',
            '    try {',
            '      response = await client.listen(transactionDescriptor);',
            '    } catch (listenError) {',
            '      throw new TransactionError("Failed to listen for transaction result", {',
            '        originalError: listenError.message,',
            '        requestKey: transactionDescriptor.requestKey,',
            '      });',
            '    }',
            '',
            '    console.log("Transaction response:", response);',
            '',
            '    if (response.result.status === "success") {',
            '      return {',
            '        requestKey: transactionDescriptor.requestKey,',
            '        hash: signedTransaction.hash,',
            '        status: "success",',
            '        result: response.result.data,',
            '      };',
            '    } else {',
            '      let errorMessage = "Transaction failed";',
            '      let errorDetails = {};',
            '',
            '      if (response.result.error) {',
            '        if (typeof response.result.error === "string") {',
            '          errorMessage = response.result.error;',
            '        } else {',
            '          try {',
            '            errorMessage = JSON.stringify(response.result.error);',
            '            errorDetails = response.result.error;',
            '          } catch (e) {',
            '            errorMessage = `Transaction failed: ${',
            '              response.result.error.message || "Unknown error"',
            '            }`;',
            '            errorDetails = { parseError: e.message };',
            '          }',
            '        }',
            '      }',
            '',
            '      throw new TransactionError(errorMessage, {',
            '        requestKey: transactionDescriptor.requestKey,',
            '        hash: signedTransaction.hash,',
            '        status: "failure",',
            '        error: errorDetails,',
            '        rawResponse: response.result,',
            '      });',
            '    }',
            '  } catch (error) {',
            '    if (error instanceof KadenaError) {',
            '      throw error;',
            '    }',
            '    throw new TransactionError(',
            '      `Failed to submit transaction: ${error.message}`,',
            '      {',
            '        originalError: error.message,',
            '        transaction: signedTransaction,',
            '      }',
            '    );',
            '  }',
            '}',
            '',
            'async function getBalance(accountName, chainId, tokenName = "coin") {',
            '  try {',
            '    const moduleAndFunction = `(${tokenName}.get-balance "${accountName}")`;',
            '',
            '    const transaction = Pact.builder',
            '      .execution(moduleAndFunction)',
            '      .setMeta({ chainId })',
            '      .setNetworkId(NETWORK_ID)',
            '      .createTransaction();',
            '',
            '    const response = await client.dirtyRead(transaction);',
            '',
            '    if (response.result.status === "success") {',
            '      const balance = response.result.data;',
            '      return typeof balance === "object" && balance.decimal',
            '        ? parseFloat(balance.decimal)',
            '        : balance;',
            '    }',
            '    return 0;',
            '  } catch (error) {',
            '    console.error(`Failed to get ${tokenName} balance:`, error);',
            '    return 0;',
            '  }',
            '}',
            '',
            'async function getBalances(accountName, chainId = "2") {',
            '  try {',
            '    if (!accountName) {',
            '      throw new ValidationError("Account name is required", {',
            '        suggestion: "Provide a valid Kadena account name",',
            '      });',
            '    }',
            '',
            '    const validatedChainId = validateChainId(chainId);',
            '',
            '    // Complete list of all available tokens with categorization',
            '    const tokens = {',
            '      native: ["coin"],',
            '      major: [',
            '        "arkade.token",',
            '        "kaddex.kdx",',
            '        "kdlaunch.token",',
            '        "kdlaunch.kdswap-token",',
            '        "n_b742b4e9c600892af545afb408326e82a6c0c6ed.zUSD",',
            '      ],',
            '      free: [',
            '        "free.maga",',
            '        "free.crankk01",',
            '        "free.cyberfly_token",',
            '        "free.finux",',
            '        "free.kishu-ken",',
            '        "free.wiza",',
            '        "free.babena",',
            '      ],',
            '      named: [',
            '        "n_625e9938ae84bdb7d190f14fc283c7a6dfc15d58.ktoshi",',
            '        "n_e309f0fa7cf3a13f93a8da5325cdad32790d2070.heron",',
            '        "n_582fed11af00dc626812cd7890bb88e72067f28c.bro",',
            '        "n_2669414de420c0d40bbc3caa615e989eaba83d6f.highlander",',
            '        "n_c89f6bb915bf2eddf7683fdea9e40691c840f2b6.cwc",',
            '        "n_d8d407d0445ed92ba102c2ce678591d69e464006.TRILLIONCARBON",',
            '        "n_518dfea5f0d2abe95cbcd8956eb97f3238e274a9.AZUKI",',
            '        "n_71c27e6720665fb572433c8e52eb89833b47b49b.Peppapig",',
            '      ],',
            '      platform: ["hypercent.prod-hype-coin", "runonflux.flux"],',
            '    };',
            '',
            '    // Blacklisted tokens',
            '    const blacklist = [',
            '      "lago.USD2",',
            '      "lago.kwBTC",',
            '      "lago.kwUSDC",',
            '      "free.elon",',
            '      "mok.token",',
            '      "free.docu",',
            '      "free.kpepe",',
            '      "free.backalley",',
            '      "free.kapybara-token",',
            '      "free.jodie-token",',
            '      "free.corona-token",',
            '      "free.KAYC",',
            '      "free.anedak",',
            '    ];',
            '',
            '    // Flatten and filter tokens',
            '    const validTokens = Object.values(tokens)',
            '      .flat()',
            '      .filter((token) => !blacklist.includes(token));',
            '',
            '    const balances = {};',
            '    const errors = [];',
            '',
            '    // Get balances for all valid tokens',
            '    for (const token of validTokens) {',
            '      try {',
            '        const balance = await getBalance(accountName, validatedChainId, token);',
            '        if (balance > 0) {',
            '          balances[token] = balance.toString();',
            '        }',
            '      } catch (error) {',
            '        errors.push({',
            '          token,',
            '          error: error.message,',
            '        });',
            '        console.error(`Error getting balance for ${token}:`, error);',
            '        continue;',
            '      }',
            '    }',
            '',
            '    // If we have errors but also some successful balances, return both',
            '    if (errors.length > 0) {',
            '      return {',
            '        balances,',
            '        errors,',
            '        status: "partial",',
            '        message: `Retrieved ${Object.keys(balances).length} balances with ${',
            '          errors.length',
            '        } errors`',
            '      };',
            '    }',
            '',
            '    // If we have no balances and all errors, throw an error',
            '    if (Object.keys(balances).length === 0 && errors.length > 0) {',
            '      throw new KadenaError(',
            '        "Failed to retrieve any balances",',
            '        "BALANCE_ERROR",',
            '        {',
            '          errors,',
            '          suggestion: "Check account name and chain ID",',
            '        }',
            '      );',
            '    }',
            '',
            '    return {',
            '      balances,',
            '      status: "success",',
            '      message: `Successfully retrieved ${',
            '        Object.keys(balances).length',
            '      } balances`',
            '    };',
            '  } catch (error) {',
            '    if (error instanceof KadenaError) {',
            '      throw error;',
            '    }',
            '    throw new KadenaError(',
            '      `Error getting balances: ${error.message}`,',
            '      "BALANCE_ERROR",',
            '      {',
            '        originalError: error.message,',
            '        accountName,',
            '        chainId,',
            '      }',
            '    );',
            '  }',
            '}',
            '',
            '// End baseline code',
            ''].join('\n');
          const awsPayload = {
            code: baseCode + '\n' + sanitizeCode(aiCode),
            interval: interval,
            functionName: agentName,
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