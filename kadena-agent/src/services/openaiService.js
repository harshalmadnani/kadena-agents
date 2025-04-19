const OpenAI = require("openai");
const config = require("../config");

// Create DeepSeek client
const deepseek = new OpenAI({
  apiKey: config.deepseek.apiKey,
  baseURL: config.deepseek.baseUrl || "https://api.deepseek.com",
});

/**
 * Clean the model's response by removing markdown code block syntax
 * @param {string} content - Raw response from the model
 * @returns {string} - Cleaned content
 */
const cleanModelResponse = (content) => {
  // Remove markdown code block syntax if present
  content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  // Remove any leading/trailing whitespace
  content = content.trim();
  return content;
};

/**
 * Extract intent and parameters from a user query
 * @param {string} query - Natural language query from user
 * @returns {Promise<Object>} - Extracted intent and parameters
 */
const extractTransactionIntent = async (query) => {
  try {
    // Ensure API key is set
    if (!config.deepseek.apiKey) {
      throw new Error("DeepSeek API key is not configured");
    }

    const response = await deepseek.chat.completions.create({
      model: config.deepseek.model,
      messages: [
        {
          role: "system",
          content: `You are a specialized AI agent for Kadena blockchain transactions. 
          Your task is to extract the exact intent and parameters from user queries about creating blockchain transactions.
          You should categorize the query into one of these intents:
          1. SWAP_TOKENS - For token swapping transactions
          2. MINT_NFT - For NFT minting transactions
          3. UNKNOWN - If the query doesn't match any supported transaction type
          
          For each intent, extract relevant parameters:
          
          For SWAP_TOKENS:
          - fromToken: The token to swap from (e.g., "KDA", "coin", "token.name")
          - toToken: The token to swap to
          - amount: The amount to swap (if specified)
          - account: The account to use (if specified)
          - slippage: The slippage tolerance (if specified, default 0.01)
          
          For MINT_NFT:
          - uri: URI of the NFT metadata (if specified, otherwise "")
          - account: The account to use (if specified)
          - mintTo: Account to mint the NFT to (if different from account)
          - collectionId: The collection ID (if specified)
          - royalties: Royalty percentage (if specified, default 0)
          - royaltyRecipient: Account to receive royalties (if specified)
          
          Return the result as a JSON object with this structure:
          {
            "intent": "SWAP_TOKENS" | "MINT_NFT" | "UNKNOWN",
            "parameters": {
              // extracted parameters based on intent
            }
          }`,
        },
        {
          role: "user",
          content: query,
        },
      ],
      temperature: 0.1, // Lower temperature for more consistent output
      max_tokens: 500,
    });

    const content = response.choices[0].message.content;
    try {
      // Clean the response before parsing
      const cleanedContent = cleanModelResponse(content);
      const result = JSON.parse(cleanedContent);
      return result;
    } catch (error) {
      console.error("Error parsing DeepSeek response:", error);
      console.error("Raw content:", content);
      return {
        intent: "UNKNOWN",
        parameters: {},
        error: "Failed to parse AI response",
      };
    }
  } catch (error) {
    console.error("Error extracting transaction intent:", error);
    return {
      intent: "UNKNOWN",
      parameters: {},
      error: error.message,
    };
  }
};

/**
 * Generate a response explaining the transaction
 * @param {string} transactionType - Type of transaction
 * @param {Object} transactionDetails - Transaction details
 * @returns {Promise<string>} - Human-readable explanation
 */
const generateTransactionExplanation = async (
  transactionType,
  transactionDetails
) => {
  try {
    // Ensure API key is set
    if (!config.deepseek.apiKey) {
      throw new Error("DeepSeek API key is not configured");
    }

    const response = await deepseek.chat.completions.create({
      model: config.deepseek.model,
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant for explaining Kadena blockchain transactions.
          Your task is to explain the transaction details in a clear, concise way that a user can understand.
          Focus on explaining what the transaction will do and what it means.
          Keep your response brief and to the point.
          Use simple language and avoid technical jargon when possible.`,
        },
        {
          role: "user",
          content: `Please explain this ${transactionType} transaction in simple terms:\n${JSON.stringify(
            transactionDetails,
            null,
            2
          )}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 250,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error generating transaction explanation:", error);
    return `This ${transactionType} transaction was created based on your request.`;
  }
};

module.exports = {
  extractTransactionIntent,
  generateTransactionExplanation,
};
