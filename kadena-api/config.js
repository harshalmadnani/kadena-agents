const dotenv = require("dotenv");
dotenv.config();

// Read from environment variables with fallbacks
const API_KEY = new Set(process.env.API_KEY ? [process.env.API_KEY] : []);

module.exports = {
  API_KEY,
  KADENA_NETWORK_ID: process.env.KADENA_NETWORK_ID || "mainnet01",
  KADENA_API_HOST: process.env.KADENA_API_HOST || `https://api.chainweb.com`,
  KADDEX_NAMESPACE: process.env.KADDEX_NAMESPACE || "kaddex",
  NETWORK_VERSION: process.env.NETWORK_VERSION || "0.0",
  PORT: process.env.PORT || 3000,
  VERSION: process.env.npm_package_version || "1.0.0",
};
