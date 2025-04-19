const {
  extractTransactionIntent,
  generateTransactionExplanation,
} = require("./openaiService");
const { createSwapTransaction } = require("../transactions/swapTransaction");
const { createNftMintTransaction } = require("../transactions/nftTransaction");
const config = require("../config");

/**
 * Identify missing required parameters for a transaction
 * @param {string} intent - Transaction intent (SWAP_TOKENS or MINT_NFT)
 * @param {Object} params - Current parameters
 * @returns {Object} - Missing parameters info
 */
const identifyMissingParams = (intent, params) => {
  const missingParams = [];
  const requiredParams = {};

  switch (intent) {
    case "SWAP_TOKENS":
      if (!params.fromToken) {
        missingParams.push("fromToken");
        requiredParams.fromToken =
          "The token you want to swap from (e.g., 'coin', 'KDX')";
      }

      if (!params.toToken) {
        missingParams.push("toToken");
        requiredParams.toToken = "The token you want to swap to";
      }

      if (!params.amount) {
        missingParams.push("amount");
        requiredParams.amount = "The amount you want to swap";
      }

      if (!params.account) {
        missingParams.push("account");
        requiredParams.account =
          "Your Kadena account address (e.g., k:example)";
      }

      // Optional params that we might want to ask about
      if (!params.slippage) {
        requiredParams.slippage =
          "The slippage tolerance percentage (default: 1%)";
      }
      break;

    case "MINT_NFT":
      if (!params.account) {
        missingParams.push("account");
        requiredParams.account =
          "Your Kadena account address (e.g., k:example)";
      }

      if (!params.collectionId) {
        missingParams.push("collectionId");
        requiredParams.collectionId = "The ID of the collection for this NFT";
      }

      // Optional params that we might want to ask about
      if (!params.uri) {
        requiredParams.uri = "The URI for the NFT metadata (e.g., ipfs://...)";
      }

      if (!params.mintTo) {
        requiredParams.mintTo =
          "The account to mint the NFT to (default: same as your account)";
      }

      if (!params.royalties) {
        requiredParams.royalties =
          "Royalty percentage for the NFT (default: 0)";
      }

      if (
        params.royalties &&
        params.royalties > 0 &&
        !params.royaltyRecipient
      ) {
        requiredParams.royaltyRecipient = "Account to receive royalties";
      }
      break;
  }

  return {
    hasMissingRequired: missingParams.length > 0,
    missingRequired: missingParams,
    allMissingParams: requiredParams,
  };
};

/**
 * Generate questions for missing parameters
 * @param {Object} missingParamsInfo - Information about missing parameters
 * @param {string} intent - The transaction intent
 * @returns {Object} - Questions and required flags for missing parameters
 */
const generateMissingParamsQuestions = (missingParamsInfo, intent) => {
  const questions = {};
  const required = {};

  // Add questions for required parameters first
  for (const param of missingParamsInfo.missingRequired) {
    questions[param] = missingParamsInfo.allMissingParams[param];
    required[param] = true;
  }

  // Add questions for optional parameters
  for (const [param, description] of Object.entries(
    missingParamsInfo.allMissingParams
  )) {
    if (!missingParamsInfo.missingRequired.includes(param)) {
      questions[param] = description;
      required[param] = false;
    }
  }

  return {
    intent,
    questions,
    required,
  };
};

/**
 * Process a natural language query and generate the appropriate transaction
 * @param {string} query - User's natural language query
 * @param {Object} defaultParams - Default parameters to use
 * @returns {Promise<Object>} - Result containing transaction and explanation
 */
const processQuery = async (query, defaultParams = {}) => {
  try {
    // Extract the intent and parameters from the query
    const { intent, parameters, error } = await extractTransactionIntent(query);

    if (error) {
      return {
        success: false,
        error: `Failed to process query: ${error}`,
      };
    }

    if (intent === "UNKNOWN") {
      return {
        success: false,
        error:
          "I could not understand your request. Please try again with a more specific query about token swapping or NFT minting.",
      };
    }

    // Merge default parameters with extracted parameters
    const mergedParams = {
      ...defaultParams,
      ...parameters,
      chainId: defaultParams.chainId || config.network.chainId,
    };

    // Check for missing parameters
    const missingParamsInfo = identifyMissingParams(intent, mergedParams);

    // If there are missing required parameters, return questions instead of a transaction
    if (missingParamsInfo.hasMissingRequired) {
      return {
        success: true,
        needsMoreInfo: true,
        missingParamsQuestions: generateMissingParamsQuestions(
          missingParamsInfo,
          intent
        ),
        currentParams: mergedParams,
      };
    }

    let transaction;
    let explanation;

    // Generate the appropriate transaction based on intent
    switch (intent) {
      case "SWAP_TOKENS":
        // Convert string amount to number
        mergedParams.fromAmount = parseFloat(mergedParams.amount);

        // For simplicity, we'll set a default toAmount
        // In a real implementation, you'd query the pool/pair for an estimate
        mergedParams.toAmount = mergedParams.fromAmount * 0.98; // Simple approximation

        // Create the swap transaction
        transaction = await createSwapTransaction({
          fromToken: mergedParams.fromToken,
          toToken: mergedParams.toToken,
          fromAmount: mergedParams.fromAmount,
          toAmount: mergedParams.toAmount,
          slippage: mergedParams.slippage || 0.01,
          account: mergedParams.account,
          isExactIn: true,
          useGasStation: mergedParams.useGasStation || false,
          chainId: mergedParams.chainId,
          tokenData: mergedParams.tokenData || {},
        });

        explanation = await generateTransactionExplanation("token swap", {
          type: "swap",
          fromToken: mergedParams.fromToken,
          toToken: mergedParams.toToken,
          amount: mergedParams.fromAmount,
          expectedReceive: mergedParams.toAmount,
          slippage: `${(mergedParams.slippage || 0.01) * 100}%`,
        });

        break;

      case "MINT_NFT":
        // Set default values if not provided
        const uri = mergedParams.uri || "ipfs://default-uri";
        const mintTo = mergedParams.mintTo || mergedParams.account;
        const royalties = mergedParams.royalties || 0;
        const royaltyRecipient = mergedParams.royaltyRecipient || mintTo;

        // Placeholder for guard - in a real app, this would come from the wallet
        const guard = {
          keys: [defaultParams.publicKey || "placeholder-public-key"],
          pred: "keys-all",
        };

        // Create the NFT minting transaction
        transaction = await createNftMintTransaction({
          uri,
          account: mergedParams.account,
          mintTo,
          guard,
          collectionId: mergedParams.collectionId,
          royalties: [
            {
              account: royaltyRecipient,
              percentage: royalties / 100,
            },
          ],
          chainId: mergedParams.chainId,
        });

        explanation = await generateTransactionExplanation("NFT minting", {
          type: "mint-nft",
          uri,
          collection: mergedParams.collectionId,
          mintTo,
          royalties: `${royalties}%`,
          royaltyRecipient: royalties > 0 ? royaltyRecipient : "none",
        });

        break;

      default:
        return {
          success: false,
          error: "Unsupported transaction type.",
        };
    }

    return {
      success: true,
      intent,
      transaction,
      explanation,
      parameters: mergedParams,
    };
  } catch (error) {
    console.error("Error processing query:", error);
    return {
      success: false,
      error: `Failed to process query: ${error.message}`,
    };
  }
};

/**
 * Process additional parameters provided by the user
 * @param {Object} currentParams - Current parameters
 * @param {Object} additionalParams - Additional parameters provided by user
 * @returns {Promise<Object>} - Result containing transaction and explanation
 */
const processAdditionalParams = async (currentParams, additionalParams) => {
  try {
    // Merge the additional parameters with current parameters
    const mergedParams = {
      ...currentParams,
      ...additionalParams,
    };

    // Create a mock query to reprocess with the updated parameters
    const mockQuery = `${
      mergedParams.intent === "SWAP_TOKENS" ? "Swap tokens" : "Mint NFT"
    }`;

    // Run the query again with the complete set of parameters
    return await processQuery(mockQuery, mergedParams);
  } catch (error) {
    console.error("Error processing additional parameters:", error);
    return {
      success: false,
      error: `Failed to process additional parameters: ${error.message}`,
    };
  }
};

module.exports = {
  processQuery,
  processAdditionalParams,
  identifyMissingParams,
  generateMissingParamsQuestions,
};
