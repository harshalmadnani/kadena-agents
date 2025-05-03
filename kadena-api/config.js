/**
 * Kadena API Configuration
 *
 * This file defines all configuration parameters for the Kadena API service.
 * Values are loaded from environment variables with sensible defaults.
 *
 * For production deployment, it's recommended to set these via environment variables.
 */

const dotenv = require("dotenv");
dotenv.config();

// Network configuration
const KADENA_NETWORK_ID = process.env.KADENA_NETWORK_ID || "mainnet01"; // "mainnet01" or "testnet04"
const KADENA_API_HOST =
  process.env.KADENA_API_HOST || `https://api.chainweb.com`; // testnet: https://api.testnet.chainweb.com
const NETWORK_VERSION = process.env.NETWORK_VERSION || "0.0";

// DEX configuration
const KADDEX_NAMESPACE = process.env.KADDEX_NAMESPACE || "kaddex";

// Server configuration
const PORT = process.env.PORT || 3000;
const VERSION = process.env.npm_package_version || "1.0.0";

// Security configuration
// For production, always set API_KEY to a secure random string via environment variable
const API_KEY = new Set(process.env.API_KEY ? [process.env.API_KEY] : []);

/**
 * Environment-specific configurations
 * These are used for development, testing, and production environments
 */
const ENV = process.env.NODE_ENV || "development";

// Export all configuration parameters
module.exports = {
  // Network parameters
  KADENA_NETWORK_ID,
  KADENA_API_HOST,
  NETWORK_VERSION,

  // DEX parameters
  KADDEX_NAMESPACE,

  // Server parameters
  PORT,
  VERSION,

  // Security parameters
  API_KEY,

  // Environment
  ENV,
};
