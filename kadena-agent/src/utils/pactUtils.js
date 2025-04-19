const { Pact, createClient } = require("@kadena/client");
const config = require("../config");
const crypto = require("crypto");
const axios = require("axios");

// Transaction constants
const TTL = 600; // 10 minutes in seconds
const GAS_LIMIT = 15000;
const GAS_PRICE = 0.0000001;

/**
 * Create a Pact client for local queries
 * @returns {Object} - Pact client
 */
const createPactClient = () => {
  console.log("[createPactClient] Creating client with config:", {
    networkId: config.network.id,
    chainId: config.network.chainId,
    apiUrl: config.network.apiUrl,
  });

  // Create axios instance with Kadindexer configuration
  const client = axios.create({
    baseURL: config.network.apiUrl,
    headers: {
      "x-api-key": config.network.apiKey,
    },
  });

  return client;
};

/**
 * Execute a local query on the blockchain
 * @param {string} code - Pact code to execute
 * @param {string} chainId - Chain ID to query
 * @param {Object} data - Environment data
 * @returns {Promise<Object>} - Query result
 */
const localQuery = async (
  code,
  chainId = config.network.chainId,
  data = {}
) => {
  try {
    console.log("[localQuery] Executing query:", { code, chainId });

    const client = createPactClient();

    // Execute the query using Kadindexer GraphQL API
    const result = await client.post("", {
      query: `
        query {
          localQuery(
            code: "${code}"
            chainId: "${chainId}"
            data: ${JSON.stringify(data)}
          ) {
            result
            status
          }
        }
      `,
    });

    return result.data;
  } catch (error) {
    console.error("[localQuery] Error:", error);
    throw error;
  }
};

/**
 * Create an unsigned transaction
 * @param {string} code - Pact code
 * @param {Array} capabilities - Transaction capabilities
 * @param {string} chainId - Chain ID
 * @param {Object} data - Transaction data
 * @param {number} gasLimit - Gas limit
 * @param {number} gasPrice - Gas price
 * @param {string} sender - Transaction sender
 * @returns {Object} - Transaction and command objects
 */
const createUnsignedTransaction = (
  code,
  capabilities,
  chainId,
  data,
  gasLimit,
  gasPrice,
  sender
) => {
  console.log("[createUnsignedTransaction] Creating transaction with params:", {
    chainId,
    gasLimit,
    gasPrice,
    sender,
    capabilitiesCount: capabilities.length,
  });

  try {
    // Clean and format the pact code - remove extra whitespace but preserve necessary spaces
    const cleanCode = code
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join(" ")
      .replace(/\s+/g, " ");

    // Create the command object
    const cmd = {
      networkId: config.network.id,
      payload: {
        exec: {
          data: data || {},
          code: cleanCode,
        },
      },
      signers: [
        {
          pubKey: sender,
          clist: capabilities.map((cap) => ({
            name: cap.name,
            args: cap.args,
          })),
        },
      ],
      meta: {
        chainId: chainId,
        sender: sender,
        gasLimit: gasLimit,
        gasPrice: gasPrice,
        ttl: TTL,
        creationTime: Math.floor(Date.now() / 1000),
      },
      nonce: Date.now().toString(),
    };

    // Create the transaction object with proper JSON stringification
    const transaction = {
      cmd: JSON.stringify(cmd),
      hash: crypto
        .createHash("blake2b512")
        .update(JSON.stringify(cmd))
        .digest("hex"),
    };

    console.log("[createUnsignedTransaction] Transaction created successfully");
    return { transaction, cmd };
  } catch (error) {
    console.error(
      "[createUnsignedTransaction] Error creating transaction:",
      error
    );
    throw new Error(`Failed to create transaction: ${error.message}`);
  }
};

/**
 * Create a Gas Station capability
 * @param {string} namespace - The namespace for the gas station
 * @returns {Object} - Gas Station capability
 */
const createGasStationCap = (namespace = "kaddex") => {
  return {
    name: `${namespace}.gas-station.GAS_PAYER`,
    args: [`${namespace}-free-gas`, { int: 1 }, 1.0],
  };
};

/**
 * Create a coin.GAS capability
 * @param {string} account - Account name
 * @returns {Object} - Gas capability
 */
const createGasCap = (account) => {
  return {
    name: "coin.GAS",
    args: [account],
  };
};

/**
 * Create a TRANSFER capability
 * @param {string} tokenAddress - Address of the token contract
 * @param {string} sender - Sender address
 * @param {string} receiver - Receiver address
 * @param {number|string} amount - Amount to transfer
 * @returns {Object} - Transfer capability
 */
const createTransferCap = (tokenAddress, sender, receiver, amount) => {
  return {
    name: `${tokenAddress}.TRANSFER`,
    args: [sender, receiver, amount],
  };
};

/**
 * Query the blockchain for account details
 * @param {string} account - Account to query
 * @param {string} chainId - Chain ID to query
 * @returns {Promise<Object>} - Account details
 */
const getAccountDetails = async (account, chainId = config.network.chainId) => {
  console.log(
    "[getAccountDetails] Getting details for account:",
    account,
    "on chain",
    chainId
  );
  try {
    // Extract the account key (remove 'k:' prefix)
    const accountKey = account.startsWith("k:")
      ? account.substring(2)
      : account;

    // Get account details using Kadindexer GraphQL API
    const client = createPactClient();

    // First, get the account details using the account query
    const accountResult = await client.post("", {
      query: `
        query {
          account(accountName: "${account}", chainId: "${chainId}") {
            accountName
            guard {
              pred
              keys
            }
            balance
          }
        }
      `,
    });

    // If we have valid data, return it
    if (
      accountResult.data &&
      accountResult.data.data &&
      accountResult.data.data.account
    ) {
      const accountDetails = accountResult.data.data.account;

      console.log("[getAccountDetails] Processed account details:", {
        account: accountDetails.accountName,
        guardType: accountDetails.guard?.pred,
        hasKeys: !!accountDetails.guard?.keys?.length,
      });

      return {
        account: accountDetails.accountName,
        guard: accountDetails.guard,
        balance: accountDetails.balance,
      };
    }

    // If account doesn't exist or query failed, return default values
    console.log(
      "[getAccountDetails] Account not found or query failed, using default guard"
    );
    const defaultDetails = {
      account: account,
      guard: {
        pred: "keys-all",
        keys: [accountKey],
      },
    };
    return defaultDetails;
  } catch (error) {
    console.error("[getAccountDetails] Error getting account details:", error);
    // Return default values on error
    const accountKey = account.startsWith("k:")
      ? account.substring(2)
      : account;
    const defaultDetails = {
      account: account,
      guard: {
        pred: "keys-all",
        keys: [accountKey],
      },
    };
    return defaultDetails;
  }
};

/**
 * Get transaction details using Kadindexer API
 * @param {string} requestKey - Transaction request key
 * @param {string} chainId - Chain ID to query
 * @returns {Promise<Object>} - Transaction details
 */
const getTransactionDetails = async (
  requestKey,
  chainId = config.network.chainId
) => {
  try {
    console.log(
      "[getTransactionDetails] Getting details for transaction:",
      requestKey
    );

    const client = createPactClient();

    const result = await client.post("", {
      query: `
        query {
          transaction(requestKey: "${requestKey}", chainId: "${chainId}") {
            requestKey
            hash
            cmd {
              meta {
                chainId
                sender
                gasLimit
                gasPrice
                ttl
                creationTime
              }
              payload {
                exec {
                  code
                  data
                }
              }
              signers {
                pubKey
                clist {
                  name
                  args
                }
              }
            }
            result {
              status
              gas
              result
              error
            }
            block {
              hash
              height
            }
          }
        }
      `,
    });

    if (result.data && result.data.data && result.data.data.transaction) {
      return result.data.data.transaction;
    }

    return null;
  } catch (error) {
    console.error("[getTransactionDetails] Error:", error);
    throw error;
  }
};

/**
 * Get transactions for an account using Kadindexer API
 * @param {string} account - Account to query
 * @param {string} chainId - Chain ID to query
 * @param {number} limit - Maximum number of transactions to return
 * @returns {Promise<Array>} - List of transactions
 */
const getAccountTransactions = async (
  account,
  chainId = config.network.chainId,
  limit = 10
) => {
  try {
    console.log(
      "[getAccountTransactions] Getting transactions for account:",
      account
    );

    const client = createPactClient();

    const result = await client.post("", {
      query: `
        query {
          transactions(accountName: "${account}", chainId: "${chainId}", first: ${limit}) {
            edges {
              node {
                requestKey
                hash
                cmd {
                  meta {
                    chainId
                    sender
                  }
                }
                result {
                  status
                }
                block {
                  height
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `,
    });

    if (result.data && result.data.data && result.data.data.transactions) {
      return result.data.data.transactions.edges.map((edge) => edge.node);
    }

    return [];
  } catch (error) {
    console.error("[getAccountTransactions] Error:", error);
    throw error;
  }
};

/**
 * Get the latest block height using Kadindexer API
 * @param {string} chainId - Chain ID to query
 * @returns {Promise<number>} - Latest block height
 */
const getLatestBlockHeight = async (chainId = config.network.chainId) => {
  try {
    console.log(
      "[getLatestBlockHeight] Getting latest block height for chain:",
      chainId
    );

    const client = createPactClient();

    const result = await client.post("", {
      query: `
        query {
          lastBlockHeight(chainId: "${chainId}")
        }
      `,
    });

    if (result.data && result.data.data && result.data.data.lastBlockHeight) {
      return result.data.data.lastBlockHeight;
    }

    throw new Error("Failed to get latest block height");
  } catch (error) {
    console.error("[getLatestBlockHeight] Error:", error);
    throw error;
  }
};

module.exports = {
  createPactClient,
  localQuery,
  createUnsignedTransaction,
  createGasStationCap,
  createGasCap,
  createTransferCap,
  getAccountDetails,
  getTransactionDetails,
  getAccountTransactions,
  getLatestBlockHeight,
};
