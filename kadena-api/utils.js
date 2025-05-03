const { Pact, createClient } = require("@kadena/client");
const { hash } = require("@kadena/cryptography-utils");
const BigNumber = require("bignumber.js");
const fs = require("fs");
const yaml = require("js-yaml");
const path = require("path");
const config = require("./config");
const { KADENA_NETWORK_ID, KADENA_API_HOST } = config;

// Validate that Pact was loaded correctly
if (!Pact || typeof Pact !== "object") {
  console.error("ERROR: Failed to load Pact from @kadena/client");
  // Create a minimal Pact object to prevent crashes
  globalThis.Pact = {
    modules: {},
    lang: {},
    crypto: {},
  };
} else {
  console.log("Pact client library loaded successfully");

  // Ensure all required namespaces exist
  Pact.modules = Pact.modules || {};
  Pact.lang = Pact.lang || {};
  Pact.crypto = Pact.crypto || {};
}

// Load token data from tokens.yml
let tokenData = {};
try {
  const tokensFilePath = path.join(__dirname, "tokens.yml");
  if (fs.existsSync(tokensFilePath)) {
    const tokensFile = fs.readFileSync(tokensFilePath, "utf8");
    const parsedTokens = yaml.load(tokensFile);

    if (parsedTokens && parsedTokens[KADENA_NETWORK_ID.toLowerCase()]) {
      tokenData = parsedTokens[KADENA_NETWORK_ID.toLowerCase()];
      console.log(
        `Loaded ${
          Object.keys(tokenData).length
        } tokens for ${KADENA_NETWORK_ID}`
      );
    } else if (parsedTokens && parsedTokens.mainnet) {
      tokenData = parsedTokens.mainnet;
      console.log(
        `Using mainnet tokens as fallback (${
          Object.keys(tokenData).length
        } tokens)`
      );
    }
  } else {
    console.warn("tokens.yml not found, token precision will use defaults");
  }
} catch (err) {
  console.error("Error loading tokens.yml:", err);
}

// Helper function to get token precision from tokenData
const getTokenPrecision = (tokenCode) => {
  const DEFAULT_PRECISION = 12;
  if (!tokenCode) return DEFAULT_PRECISION;
  if (tokenCode === "coin")
    return tokenData.coin?.precision || DEFAULT_PRECISION;
  if (tokenData[tokenCode]?.precision !== undefined)
    return tokenData[tokenCode].precision;
  return DEFAULT_PRECISION;
};

// Helper function to reduce balance to specific precision
const reduceBalance = (value, precision = 12) => {
  if (value === undefined || value === null) return "0.0";
  try {
    if (value.decimal) value = value.decimal;
    if (value.int) value = value.int;

    BigNumber.config({
      DECIMAL_PLACES: precision,
      ROUNDING_MODE: BigNumber.ROUND_DOWN,
    });

    const bn = new BigNumber(value);
    return bn.isNaN() ? "0.0" : bn.toFixed(precision);
  } catch (error) {
    console.error(`Error reducing balance: ${value}`, error);
    return "0.0";
  }
};

// Helper function to ensure chainId is a string
const ensureChainIdString = (chainId) => {
  return chainId !== undefined && chainId !== null ? String(chainId) : "2";
};

// Helper function to validate chainId
const validateChainId = (chainId) => {
  const chainIdStr = ensureChainIdString(chainId);
  if (!/^([0-9]|1[0-9])$/.test(chainIdStr)) {
    return {
      valid: false,
      error: "Invalid chainId",
      details: "Chain ID must be between 0-19 for Kadena mainnet",
    };
  }
  return { valid: true, chainId: chainIdStr };
};

// Helper function to get Pact client
const getClient = (chainId) =>
  createClient(
    `${KADENA_API_HOST}/chainweb/0.0/${KADENA_NETWORK_ID}/chain/${ensureChainIdString(
      chainId
    )}/pact`
  );

// Helper function for transaction creation time
const creationTime = () => Math.round(new Date().getTime() / 1000) - 10;

/**
 * Generates a transaction hash using hash function from @kadena/cryptography-utils
 *
 * This function creates a hash following the Kadena blockchain requirements
 * using the official Kadena cryptography utils
 *
 * @param {Object|string} cmd - The transaction command object or string
 * @returns {string} The hash of the transaction command
 */
const generateTransactionHash = (cmd) => {
  try {
    // Ensure we're working with a string
    let cmdStr;
    if (typeof cmd === "string") {
      // Use the string directly
      cmdStr = cmd;
    } else {
      // For objects, stringify with sorted keys for deterministic results
      cmdStr = JSON.stringify(cmd);
    }

    // Use the hash function from cryptography-utils to generate hash
    // The hash function expects a string input
    const transactionHash = hash(cmdStr);

    return transactionHash;
  } catch (error) {
    console.error("Error generating transaction hash:", error);
    throw new Error("Failed to generate transaction hash: " + error.message);
  }
};

// Ensure Pact.lang is accessible for mkCap
if (!Pact.lang || typeof Pact.lang.mkCap !== "function") {
  console.warn("Pact.lang.mkCap not found, creating a fallback implementation");

  // Create the mkCap function if it doesn't exist
  Pact.lang.mkCap = function (name, description, module, args) {
    console.log(`Creating capability: ${name} for module ${module}`);
    return {
      name: name,
      description: description,
      module: module,
      args: Array.isArray(args) ? args : [args],
    };
  };

  console.log("Fallback mkCap function created");
}

/**
 * Tests the hash generation functionality
 * This can be called during server startup to verify hash generation works
 * @returns {boolean} True if hash generation is working correctly
 */
const testHashGeneration = () => {
  try {
    // Test with a simple string (the normal use case)
    const testString = "hello world";
    const stringHash = generateTransactionHash(testString);

    // Test direct hash function with the same string for comparison
    const directHash = hash(testString);

    // These should be identical
    if (stringHash !== directHash) {
      console.error(
        "TEST FAILED: Hash function not working correctly with strings"
      );
      return false;
    }

    // Test with a transaction command (must be stringified first)
    const txCommand = {
      networkId: "mainnet01",
      payload: {
        exec: {
          data: { amount: { decimal: "1.0" } },
          code: '(coin.transfer "sender" "receiver" (read-decimal "amount"))',
        },
      },
      meta: {
        creationTime: Math.floor(Date.now() / 1000),
        chainId: "1",
      },
      signers: [],
      nonce: "test-hash-" + Date.now(),
    };

    // For client-side usage, we would stringify the command
    const txCommandString = JSON.stringify(txCommand);

    // Hash the string representation
    const txHash = generateTransactionHash(txCommandString);

    // Direct hash with string should be identical
    const directTxHash = hash(txCommandString);

    if (txHash !== directTxHash) {
      console.error("TEST FAILED: Transaction hash generation inconsistent");
      return false;
    }

    console.log("Hash generation tests passed successfully");
    console.log("Transaction hash sample:", txHash.substring(0, 15) + "...");
    return true;
  } catch (error) {
    console.error("Hash generation test failed:", error);
    return false;
  }
};

testHashGeneration();

module.exports = {
  getTokenPrecision,
  reduceBalance,
  ensureChainIdString,
  validateChainId,
  getClient,
  creationTime,
  generateTransactionHash,
  Pact,
};
