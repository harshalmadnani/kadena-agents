import SwapAgent from './SwapAgent';

/**
 * Agent to process natural language swap requests and generate unsigned transactions
 */
class SwapInputAgent {
  constructor() {
    this.swapAgent = new SwapAgent();
  }

  /**
   * Process a natural language swap request
   * @param {Object} input - User input object containing request and tokens data
   * @returns {Object} Processed swap parameters and unsigned transaction
   */
  async processSwapRequest({ request, availableTokens, userAccount, config = {} }) {
    try {
      // Configure swap agent
      this.swapAgent.configure(config);

      // Parse the natural language request
      const parsedRequest = this.parseRequest(request);
      
      // Validate and get token details
      const fromToken = this.findToken(availableTokens, parsedRequest.fromToken);
      const toToken = this.findToken(availableTokens, parsedRequest.toToken);
      
      if (!fromToken || !toToken) {
        throw new Error('Invalid token selection');
      }

      // Generate unsigned transaction
      const unsignedTx = await this.swapAgent.generateSwapCommand({
        fromToken,
        toToken,
        amount: parsedRequest.amount,
        userAccount,
        isExactIn: true
      });

      // Get additional swap details
      const pairReserves = await this.swapAgent.getPairReserves(fromToken.code, toToken.code);
      const outputAmount = this.swapAgent.computeOut(parsedRequest.amount, pairReserves);
      const priceImpact = this.swapAgent.computePriceImpact(parsedRequest.amount, outputAmount, pairReserves);

      return {
        parsedRequest,
        details: {
          fromToken,
          toToken,
          inputAmount: parsedRequest.amount,
          outputAmount,
          priceImpact,
          slippage: this.swapAgent.slippage,
          unsignedTx
        }
      };
    } catch (error) {
      throw new Error(`Failed to process swap request: ${error.message}`);
    }
  }

  /**
   * Parse natural language swap request
   * @param {string} request - Natural language request
   * @returns {Object} Parsed request parameters
   */
  parseRequest(request) {
    try {
      // Convert request to lowercase for easier parsing
      const lcRequest = request.toLowerCase();
      
      // Extract amount and tokens using regex patterns
      const amountPattern = /\b(\d+\.?\d*|\.\d+)\b/;
      const fromTokenPattern = /\b(from|sell|spend|input)\s+([a-zA-Z0-9]+)\b/i;
      const toTokenPattern = /\b(to|buy|get|receive|output)\s+([a-zA-Z0-9]+)\b/i;

      const amountMatch = lcRequest.match(amountPattern);
      const fromMatch = lcRequest.match(fromTokenPattern);
      const toMatch = lcRequest.match(toTokenPattern);

      if (!amountMatch || !fromMatch || !toMatch) {
        throw new Error('Could not parse swap request. Please specify amount, from token, and to token.');
      }

      return {
        amount: parseFloat(amountMatch[1]),
        fromToken: fromMatch[2].toUpperCase(),
        toToken: toMatch[2].toUpperCase()
      };
    } catch (error) {
      throw new Error(`Failed to parse request: ${error.message}`);
    }
  }

  /**
   * Find token details in available tokens list
   * @param {Object} availableTokens - List of available tokens
   * @param {string} tokenIdentifier - Token to find
   * @returns {Object} Token details
   */
  findToken(availableTokens, tokenIdentifier) {
    // First try exact match
    const directMatch = Object.values(availableTokens).find(
      token => 
        token.name.toUpperCase() === tokenIdentifier ||
        token.code.toUpperCase() === tokenIdentifier
    );

    if (directMatch) return directMatch;

    // Try fuzzy match if no exact match found
    const fuzzyMatch = Object.values(availableTokens).find(
      token =>
        token.name.toUpperCase().includes(tokenIdentifier) ||
        token.code.toUpperCase().includes(tokenIdentifier)
    );

    return fuzzyMatch;
  }

  /**
   * Validate swap parameters
   * @param {Object} params - Parameters to validate
   * @returns {boolean} Validation result
   */
  validateSwapParams({ fromToken, toToken, amount, userAccount }) {
    if (!fromToken || !toToken) {
      throw new Error('Invalid tokens specified');
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      throw new Error('Invalid amount specified');
    }

    if (!userAccount) {
      throw new Error('User account not specified');
    }

    if (fromToken.code === toToken.code) {
      throw new Error('Cannot swap token for itself');
    }

    return true;
  }

  /**
   * Get human readable description of the swap
   * @param {Object} details - Swap details
   * @returns {string} Human readable description
   */
  getSwapDescription(details) {
    const {
      fromToken,
      toToken,
      inputAmount,
      outputAmount,
      priceImpact,
      slippage
    } = details;

    const impactPercent = (priceImpact * 100).toFixed(2);
    const slippagePercent = (slippage * 100).toFixed(2);

    return `Swap ${inputAmount} ${fromToken.name} for approximately ${outputAmount.toFixed(6)} ${toToken.name}
Price Impact: ${impactPercent}%
Slippage Tolerance: ${slippagePercent}%
Minimum Output: ${(outputAmount * (1 - slippage)).toFixed(6)} ${toToken.name}`;
  }
}

export default SwapInputAgent;
