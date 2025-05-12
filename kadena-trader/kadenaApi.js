/**
 * @description JavaScript client for Kadena blockchain API operations
 *
 * This module provides functions to interact with Kadena blockchain through a REST API,
 * allowing token transfers, swaps, and price quotes.
 */

// Base URL for the API (should be configured based on environment)
const API_BASE_URL = "https://kadena-agents.onrender.com";
// API key for authentication (should be provided by the user)
const API_KEY = "****";

/**
 * Sets the API key for authentication
 * @param {string} apiKey - The API key to use for authentication
 */
function setApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== "string") {
    throw new Error("Invalid API key provided");
  }
  this.API_KEY = apiKey;
}

/**
 * Makes a request to the Kadena API
 * @param {string} endpoint - The API endpoint to call
 * @param {Object} body - The request body containing parameters
 * @returns {Promise<Object>} The API response
 * @private
 */
async function makeRequest(endpoint, body) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(
        `API Error (${response.status}): ${
          errorData.error || response.statusText
        }`
      );
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Request failed: ${error.message}`);
  }
}

/**
 * Validates a chain ID parameter
 * @param {string|number} chainId - The chain ID to validate
 * @returns {string} The validated chain ID as a string
 * @private
 */
function validateChainId(chainId) {
  const chainIdStr = String(chainId);
  const chainIdNum = parseInt(chainIdStr, 10);

  if (isNaN(chainIdNum) || chainIdNum < 0 || chainIdNum > 19) {
    throw new Error("Chain ID must be between 0 and 19");
  }

  return chainIdStr;
}

/**
 * Transfer tokens from one account to another
 *
 * @param {Object} params - Transfer parameters
 * @param {string} params.tokenAddress - Token contract address
 * @param {string} params.sender - Sender account
 * @param {string} params.receiver - Receiver account
 * @param {string|number} params.amount - Amount to transfer
 * @param {string|number} params.chainId - Chain ID (0-19)
 * @param {Object} [params.meta] - Additional metadata
 * @param {number} [params.gasLimit] - Gas limit for transaction
 * @param {number} [params.gasPrice] - Gas price for transaction
 * @param {number} [params.ttl] - Transaction time-to-live
 * @returns {Promise<Object>} Transfer transaction data containing:
 *   - transaction: Object containing:
 *      - cmd: The Pact command JSON string
 *      - hash: Transaction hash
 *      - sigs: Array of signatures (null if not signed)
 *   - metadata: Object containing:
 *      - sender: Sender account
 *      - receiver: Receiver account
 *      - amount: Transfer amount
 *      - tokenAddress: Token contract address
 *      - chainId: Chain ID
 *      - networkId: Network ID (e.g., "mainnet01")
 *      - estimatedGas: Estimated gas cost
 *      - formattedAmount: Formatted transfer amount
 */
async function transfer({
  tokenAddress,
  sender,
  receiver,
  amount,
  chainId,
  meta,
  gasLimit,
  gasPrice,
  ttl,
}) {
  // Validate required parameters
  if (!tokenAddress) throw new Error("tokenAddress is required");
  if (!sender) throw new Error("sender is required");
  if (!receiver) throw new Error("receiver is required");
  if (amount === undefined || amount === null)
    throw new Error("amount is required");

  // Validate and format chainId
  const validatedChainId = validateChainId(chainId);

  // Prepare request body
  const requestBody = {
    tokenAddress,
    sender,
    receiver,
    amount: String(amount),
    chainId: validatedChainId,
  };

  // Add optional parameters if provided
  if (meta !== undefined) requestBody.meta = meta;
  if (gasLimit !== undefined) requestBody.gasLimit = gasLimit;
  if (gasPrice !== undefined) requestBody.gasPrice = gasPrice;
  if (ttl !== undefined) requestBody.ttl = ttl;

  // Make API request
  return await makeRequest("/transfer", requestBody);
}

/**
 * Swap one token for another using Kaddex/EchoDEX
 *
 * @param {Object} params - Swap parameters
 * @param {string} params.tokenInAddress - Address of input token
 * @param {string} params.tokenOutAddress - Address of output token
 * @param {string} params.account - Sender account
 * @param {string|number} params.chainId - Chain ID (0-19)
 * @param {string|number} [params.amountIn] - Amount to swap (either amountIn or amountOut must be provided)
 * @param {string|number} [params.amountOut] - Desired output amount (either amountIn or amountOut must be provided)
 * @param {number} [params.slippage] - Maximum acceptable slippage
 * @returns {Promise<Object>} Swap transaction data containing:
 *   - transaction: Object containing:
 *      - cmd: The Pact command JSON string with swap details
 *      - hash: Transaction hash
 *      - sigs: Array of signatures (null if not signed)
 *   - quote: Object containing:
 *      - expectedIn: The exact input amount
 *      - expectedOut: The expected output amount
 *      - slippage: Applied slippage tolerance
 *      - priceImpact: Price impact percentage
 */
async function swap({
  tokenInAddress,
  tokenOutAddress,
  account,
  chainId,
  amountIn,
  amountOut,
  slippage,
}) {
  // Validate required parameters
  if (!tokenInAddress) throw new Error("tokenInAddress is required");
  if (!tokenOutAddress) throw new Error("tokenOutAddress is required");
  if (!account) throw new Error("account is required");

  // Validate conditional parameters
  if (amountIn === undefined && amountOut === undefined) {
    throw new Error("Either amountIn or amountOut must be provided");
  }
  if (amountIn !== undefined && amountOut !== undefined) {
    throw new Error("Cannot specify both amountIn and amountOut");
  }

  // Validate and format chainId
  const validatedChainId = validateChainId(chainId);

  // Prepare request body
  const requestBody = {
    tokenInAddress,
    tokenOutAddress,
    account,
    chainId: validatedChainId,
  };

  // Add conditional parameters
  if (amountIn !== undefined) requestBody.amountIn = String(amountIn);
  if (amountOut !== undefined) requestBody.amountOut = String(amountOut);

  // Add optional parameters if provided
  if (slippage !== undefined) requestBody.slippage = slippage;

  // Make API request
  return await makeRequest("/swap", requestBody);
}

/**
 * Get price quotes for swapping tokens
 *
 * @param {Object} params - Quote parameters
 * @param {string} params.tokenInAddress - Address of input token
 * @param {string} params.tokenOutAddress - Address of output token
 * @param {string|number} params.chainId - Chain ID (0-19)
 * @param {string|number} [params.amountIn] - Input amount to get output quote (either amountIn or amountOut must be provided)
 * @param {string|number} [params.amountOut] - Desired output amount to get input quote (either amountIn or amountOut must be provided)
 * @returns {Promise<Object>} Quote response containing:
 *   - amountIn: Required input amount (when amountOut is provided)
 *   - amountOut: Expected output amount (when amountIn is provided)
 *   - priceImpact: Price impact percentage as a string
 */
async function quote({
  tokenInAddress,
  tokenOutAddress,
  chainId,
  amountIn,
  amountOut,
}) {
  // Validate required parameters
  if (!tokenInAddress) throw new Error("tokenInAddress is required");
  if (!tokenOutAddress) throw new Error("tokenOutAddress is required");

  // Validate conditional parameters
  if (amountIn === undefined && amountOut === undefined) {
    throw new Error("Either amountIn or amountOut must be provided");
  }
  if (amountIn !== undefined && amountOut !== undefined) {
    throw new Error("Cannot specify both amountIn and amountOut");
  }

  // Validate and format chainId
  const validatedChainId = validateChainId(chainId);

  // Prepare request body
  const requestBody = {
    tokenInAddress,
    tokenOutAddress,
    chainId: validatedChainId,
  };

  // Add conditional parameters
  if (amountIn !== undefined) requestBody.amountIn = String(amountIn);
  if (amountOut !== undefined) requestBody.amountOut = String(amountOut);

  // Make API request
  return await makeRequest("/quote", requestBody);
}

module.exports = {
  setApiKey,
  transfer,
  swap,
  quote,
};
