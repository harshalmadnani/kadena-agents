import axios from "axios";

// Create an axios instance with default configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "https://k-agent.onrender.com",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  validateStatus: function (status) {
    return status >= 200 && status < 500; // Accept all status codes less than 500
  },
});

export interface TokenBalance {
  symbol: string;
  balance: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface UserContext {
  accountName: string;
  publicKey: string;
  chainId: string;
  balances: TokenBalance[];
}

export interface ChatQuery {
  query: string;
  history: string[];
}

// Different response types based on query type
export interface QuoteResponse {
  amountOut: string;
  priceImpact: string;
  text: string;
}

export interface TransactionData {
  cmd: string;
  hash: string;
  sigs: (string | null)[];
}

export interface TransactionMetadata {
  sender: string;
  receiver: string;
  amount: number;
  tokenAddress: string;
  chainId: number;
  networkId: string;
  estimatedGas: number;
  formattedAmount: string;
}

export interface TransactionQuote {
  expectedIn: string;
  expectedOut: string;
  slippage: string;
  priceImpact: string;
}

export interface NFTMetadata {
  name: string;
  description: string;
  uri: string;
  collection: string;
  royalties: string;
}

export interface TransactionResponse {
  transaction: TransactionData;
  quote?: TransactionQuote;
  metadata?: TransactionMetadata | NFTMetadata;
  tokenId?: string;
  collectionId?: string;
}

export interface ChatResponse {
  response: string | QuoteResponse | TransactionResponse;
  intermediate_steps: any[];
  history: string[];
}

// Maintain persistent chat history
let chatHistory: string[] = [];

export const chatApi = {
  // Health check endpoint
  healthCheck: async (): Promise<{ status: string }> => {
    try {
      const response = await api.get("/");
      return { status: response.data };
    } catch (error) {
      console.error("Health check failed:", error);
      throw new Error("API server is not responding");
    }
  },

  sendQuery: async (queryData: ChatQuery): Promise<ChatResponse> => {
    try {
      // Create the request payload with current history
      const requestPayload = {
        ...queryData,
        history: chatHistory,
      };

      console.log("Sending query:", requestPayload);
      const response = await api.post("/query", requestPayload);
      console.log("API Response:", response);

      if (response.data.response) {
        chatHistory = response.data.history;
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("API Error:", error);

        // Network error
        if (
          error.code === "ERR_NETWORK" ||
          error.code === "ERR_NAME_NOT_RESOLVED"
        ) {
          throw new Error(
            "Unable to connect to the Kadena AI Agent. The API endpoint may be unavailable or incorrect. Please check your internet connection and try again."
          );
        }

        // Server error
        if (error.response) {
          const status = error.response.status;
          if (status === 429) {
            throw new Error(
              "Too many requests. Please wait a moment and try again."
            );
          } else if (status >= 500) {
            throw new Error(
              "Kadena AI Agent is currently unavailable. Please try again later."
            );
          }
          throw new Error(
            error.response.data?.message ||
              "An error occurred while processing your request."
          );
        }
      }

      // Generic error
      throw new Error("An unexpected error occurred. Please try again.");
    }
  },
};

export default api;
