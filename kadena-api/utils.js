const { Pact, createClient } = require("@kadena/client");
const BigNumber = require("bignumber.js");
const fs = require("fs");
const yaml = require("js-yaml");
const path = require("path");
const config = require("./config");
const { KADENA_NETWORK_ID, KADENA_API_HOST } = config;

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

// Ensure Pact.lang is accessible for mkCap
const pactLang = Pact.lang;
if (!pactLang || !pactLang.mkCap) {
  console.error(
    "Warning: Pact.lang.mkCap not found, creating a fallback implementation"
  );
  Pact.lang = Pact.lang || {};
  Pact.lang.mkCap =
    Pact.lang.mkCap ||
    function (name, description, module, args) {
      return {
        name: name,
        description: description,
        module: module,
        args: Array.isArray(args) ? args : [args],
      };
    };
}

module.exports = {
  getTokenPrecision,
  reduceBalance,
  ensureChainIdString,
  validateChainId,
  getClient,
  creationTime,
  Pact,
};
