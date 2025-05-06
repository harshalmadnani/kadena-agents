import axios from "axios";

// Create an axios instance with default configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "https://k-agent.onrender.com",
  timeout: 30000, // 30 seconds timeout
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  validateStatus: function (status) {
    return status >= 200 && status < 500; // Accept all status codes less than 500
  },
});

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatQuery {
  query: string;
  history: string[];
}

// Different response types based on query type
export interface SwapResponse {
  amountOut: string;
  priceImpact: string;
}

export interface TransactionData {
  cmd: string;
  hash: string;
  sigs: (string | null)[];
}

export interface TransactionQuote {
  expectedIn: string;
  expectedOut: string;
  slippage: number;
  priceImpact: string;
}

export interface TransactionResponse {
  transaction: TransactionData;
  quote?: TransactionQuote;
  [key: string]: any;
}

export interface ChatResponse {
  response: string | SwapResponse | TransactionResponse;
  intermediate_steps: any[];
  history: string[];
}

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

  // Process a natural language query
  sendQuery: async (queryData: ChatQuery): Promise<ChatResponse> => {
    try {
      console.log("Sending query:", queryData);
      const response = await api.post("/query", queryData);
      console.log("API Response:", response);
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
