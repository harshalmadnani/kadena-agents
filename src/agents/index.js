import SwapAgent from './SwapAgent';
import SwapInputAgent from './SwapInputAgent';
import OpenAISwapAgent from './OpenAISwapAgent';
import { ExampleSwapFlow, AdvancedSwapFlow, ExampleInputs } from './example';

// Initialize OpenAI agent with default configuration
const openAIAgent = new OpenAISwapAgent();

/**
 * Process a natural language swap request using OpenAI
 * @param {Object} input Input parameters for the swap
 * @returns {Promise<Object>} Swap result including unsigned transaction
 */
const performAISwap = async (input) => {
  return await openAIAgent.processSwapRequest(input);
};

/**
 * Get an AI-enhanced description of the swap
 * @param {Object} details Swap details object
 * @returns {Promise<string>} Enhanced swap description
 */
const getEnhancedSwapDescription = async (details) => {
  return await openAIAgent.getEnhancedSwapDescription(details);
};

/**
 * Parse a natural language swap request using OpenAI
 * @param {string} request Natural language request
 * @param {Object} availableTokens Available tokens for context
 * @returns {Promise<Object>} Parsed swap parameters
 */
const parseSwapRequestWithAI = async (request, availableTokens) => {
  return await openAIAgent.processNaturalLanguage(request, availableTokens);
};

/**
 * Find a token using fuzzy matching with OpenAI
 * @param {string} query Token query string
 * @param {Object} availableTokens Available tokens
 * @returns {Promise<Object>} Matched token
 */
const findTokenWithAI = async (query, availableTokens) => {
  return await openAIAgent.findTokenWithGPT(query, availableTokens);
};

// Legacy exports for backward compatibility
const parseSwapRequest = (request) => {
  const agent = new SwapInputAgent();
  return agent.parseRequest(request);
};

const getSwapDescription = (swapDetails) => {
  const agent = new SwapInputAgent();
  return agent.getSwapDescription(swapDetails);
};

// Export all functionality
export {
  // Core agents
  SwapAgent,
  SwapInputAgent,
  OpenAISwapAgent,
  
  // OpenAI-enhanced functions
  performAISwap,
  getEnhancedSwapDescription,
  parseSwapRequestWithAI,
  findTokenWithAI,
  
  // Legacy functions
  parseSwapRequest,
  getSwapDescription,
  
  // Examples
  ExampleSwapFlow,
  AdvancedSwapFlow,
  ExampleInputs
};

// Usage example:
/*
import { performAISwap, getEnhancedSwapDescription } from './agents';

const exampleUsage = async () => {
  try {
    // Process a natural language swap request
    const result = await performAISwap({
      request: "I want to swap 100 KDA for BRO tokens with 1% slippage",
      availableTokens: pactContext.allTokens,
      userAccount: {
        account: "k:user-account",
        guard: {
          keys: ["user-public-key"],
          pred: "keys-all"
        }
      },
      config: {
        slippage: 0.01,
        ttl: 600,
        enableGasStation: true
      }
    });

    // Get an enhanced description
    const description = await getEnhancedSwapDescription(result.details);
    
    console.log("AI Swap Description:", description);
    console.log("Swap Details:", result.details);
    console.log("GPT Confidence:", result.gptConfidence);
    console.log("Unsigned Transaction:", result.details.unsignedTx);
    
  } catch (error) {
    console.error("Swap Error:", error.message);
  }
};
*/
