require("dotenv").config();

// Network configuration constants
const MAINNET = "mainnet01";
const TESTNET = "testnet04";
const DEFAULT_CHAIN_ID = "2";

module.exports = {
  // Network configuration
  network: {
    id: process.env.NETWORK_ID || MAINNET,
    networkId: process.env.NETWORK_ID || MAINNET, // alias for ecko-dex compatibility
    chainId: process.env.CHAIN_ID || DEFAULT_CHAIN_ID,
    apiUrl: process.env.API_URL || "https://api.mainnet.kadindexer.io/v0",
    apiKey:
      process.env.KADINDEXER_API_KEY ||
      "4FhcyATYpl5XSPzaPhha33YMxW7AnnH476jzcH90",
  },

  // DeepSeek configuration
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    model: process.env.DEEPSEEK_MODEL || "deepseek-r1",
    baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  },

  // Server configuration
  server: {
    port: process.env.PORT || 3000,
  },
};
