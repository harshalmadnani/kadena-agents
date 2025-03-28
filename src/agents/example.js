import SwapInputAgent from './SwapInputAgent';
import { usePactContext } from '../contexts/PactContext';

/**
 * Example usage of the SwapInputAgent
 */
const ExampleSwapFlow = async () => {
  try {
    // Get available tokens from PactContext
    const pact = usePactContext();
    const availableTokens = pact.allTokens;

    // Initialize the agent
    const swapAgent = new SwapInputAgent();

    // Example user input
    const userInput = {
      // Natural language request
      request: "swap 100 from KDA to BRO",
      
      // Available tokens from context
      availableTokens,
      
      // User account details
      userAccount: {
        account: "k:example-account",
        guard: {
          keys: ["example-public-key"],
          pred: "keys-all"
        }
      },
      
      // Optional configuration
      config: {
        slippage: 0.01, // 1%
        ttl: 600, // 10 minutes
        enableGasStation: true
      }
    };

    // Process the swap request
    const result = await swapAgent.processSwapRequest(userInput);
    
    // Get human readable description
    const description = swapAgent.getSwapDescription(result.details);
    console.log("Swap Description:", description);
    
    // The unsigned transaction is in result.details.unsignedTx
    console.log("Unsigned Transaction:", result.details.unsignedTx);

    return result;

  } catch (error) {
    console.error("Swap Flow Error:", error.message);
    throw error;
  }
};

/**
 * Example of handling various natural language inputs
 */
const ExampleInputs = [
  "swap 50 KDA to BRO",
  "sell 100 from KDA get BRO",
  "spend 75.5 KDA receive BRO",
  "convert 200 input KDA output BRO",
];

/**
 * Example of advanced usage with custom error handling
 */
const AdvancedSwapFlow = async (naturalLanguageRequest) => {
  const swapAgent = new SwapInputAgent();
  
  try {
    // Step 1: Parse the request
    const parsedRequest = swapAgent.parseRequest(naturalLanguageRequest);
    console.log("Parsed Request:", parsedRequest);
    
    // Step 2: Get token details and validate
    const pact = usePactContext();
    const fromToken = swapAgent.findToken(pact.allTokens, parsedRequest.fromToken);
    const toToken = swapAgent.findToken(pact.allTokens, parsedRequest.toToken);
    
    // Step 3: Validate parameters
    swapAgent.validateSwapParams({
      fromToken,
      toToken,
      amount: parsedRequest.amount,
      userAccount: "k:example-account"
    });
    
    // Step 4: Get complete swap details
    const result = await swapAgent.processSwapRequest({
      request: naturalLanguageRequest,
      availableTokens: pact.allTokens,
      userAccount: {
        account: "k:example-account",
        guard: {
          keys: ["example-public-key"],
          pred: "keys-all"
        }
      }
    });
    
    // Step 5: Generate human readable description
    const description = swapAgent.getSwapDescription(result.details);
    
    return {
      description,
      unsignedTx: result.details.unsignedTx,
      details: result.details
    };
    
  } catch (error) {
    // Handle specific error types
    if (error.message.includes('Could not parse')) {
      console.error("Invalid input format:", error.message);
    } else if (error.message.includes('Invalid token')) {
      console.error("Token validation error:", error.message);
    } else if (error.message.includes('Failed to process')) {
      console.error("Processing error:", error.message);
    } else {
      console.error("Unexpected error:", error.message);
    }
    throw error;
  }
};

export { ExampleSwapFlow, AdvancedSwapFlow, ExampleInputs };
