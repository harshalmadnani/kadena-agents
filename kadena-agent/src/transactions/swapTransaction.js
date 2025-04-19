const {
  createUnsignedTransaction,
  createGasCap,
  createGasStationCap,
  createTransferCap,
  localQuery,
  getAccountDetails,
} = require("../utils/pactUtils");
const config = require("../config");

// Constants for mainnet
const KADDEX_NAMESPACE = "kaddex";
const DEX_NAMESPACE = KADDEX_NAMESPACE;
const ECHO_DEX_NAMESPACE = "free.echodex-v1";

// Gas configuration for mainnet
const GAS_LIMIT = 15000;
const GAS_PRICE = 0.0000001;
const TTL = 600; // 10 minutes

// Burn wallet configuration (aligning with ecko-dex)
const BURN_WALLET = "c:KI4cQnLt-DLK31X7mKay1c3DNPr-adIel5op8CkEOYo";
const BURN_FEE = 0.01; // 1% burn fee

/**
 * Get pair account for two tokens
 * @param {string} token0 - First token address
 * @param {string} token1 - Second token address
 * @param {string} chainId - Chain ID
 * @returns {Promise<Object>} - Pair information
 */
const getPair = async (token0, token1, chainId) => {
  console.log("[getPair] Getting pair info for tokens:", {
    token0,
    token1,
    chainId,
  });

  try {
    // Convert token symbols to addresses if needed
    const token0Address = token0 === "KDA" ? "coin" : token0;
    const token1Address = token1 === "KDA" ? "coin" : token1;

    const code = `(${DEX_NAMESPACE}.exchange.get-pair ${JSON.stringify(
      token0Address
    )} ${JSON.stringify(token1Address)})`;

    const result = await localQuery(code, chainId);
    console.log("[getPair] Pair query result:", {
      status: result.status,
      data: result.data,
      error: result.error,
    });

    if (result.status === "failure") {
      console.log("[getPair] Pair not found, using default exchange account");
      return { data: { account: `${DEX_NAMESPACE}.exchange` } };
    }

    return result;
  } catch (error) {
    console.error("[getPair] Error getting pair:", error);
    // Return default exchange account on error
    return { data: { account: `${DEX_NAMESPACE}.exchange` } };
  }
};

/**
 * Get token balance for an account
 * @param {string} tokenAddress - Token address
 * @param {string} account - Account name
 * @param {string} chainId - Chain ID
 * @returns {Promise<Object>} - Account information
 */
const getTokenBalanceAccount = async (
  tokenAddress,
  account,
  chainId = config.network.chainId
) => {
  console.log("[getTokenBalanceAccount] Getting balance for:", {
    tokenAddress,
    account,
    chainId,
  });
  const code = `(${tokenAddress}.details ${JSON.stringify(account)})`;
  const result = await localQuery(code, chainId);
  console.log("[getTokenBalanceAccount] Balance query result:", {
    status: result.status,
    data: result.data,
  });
  return result;
};

/**
 * Calculate slippage amount
 * @param {number} amount - Base amount
 * @param {number} slippage - Slippage percentage (0.01 = 1%)
 * @param {boolean} isNegative - Whether to subtract or add slippage
 * @returns {number} - Amount with slippage applied
 */
const calculateSlippage = (amount, slippage, isNegative = false) => {
  console.log("[calculateSlippage] Calculating slippage:", {
    amount,
    slippage,
    isNegative,
  });
  const result = isNegative ? amount * (1 - slippage) : amount * (1 + slippage);
  console.log("[calculateSlippage] Result:", result);
  return result;
};

/**
 * Reduce balance to appropriate precision
 * @param {number} amount - Amount to reduce
 * @param {number} precision - Token precision
 * @returns {string} - Amount with applied precision
 */
const reduceBalance = (amount, precision) => {
  console.log("[reduceBalance] Reducing balance:", { amount, precision });
  const factor = Math.pow(10, precision);
  const result = (Math.floor(amount * factor) / factor).toFixed(precision);
  console.log("[reduceBalance] Result:", result);
  return result;
};

/**
 * Check if a token is a burn token (requires fee)
 * @param {string} tokenAddress - Token address to check
 * @returns {boolean} - Whether the token is a burn token
 */
const isBurnToken = (tokenAddress) => {
  // Check if the token is a burn token (e.g., Heron token)
  return (
    tokenAddress !== "coin" &&
    tokenAddress.includes("n_e309f0fa7cf3a13f93a8da5325cdad32790d2070.heron")
  );
};

/**
 * Calculate burn amount for a token
 * @param {number} amount - Original amount
 * @param {number} precision - Token precision
 * @returns {string} - Burn amount as string with proper precision
 */
const calculateBurnAmount = (amount, precision) => {
  console.log("[calculateBurnAmount] Calculating burn amount:", {
    amount,
    precision,
    fee: BURN_FEE,
  });
  return reduceBalance(amount * BURN_FEE, precision);
};

/**
 * Create an unsigned swap transaction
 * @param {Object} params - Swap parameters
 * @param {string} params.fromToken - Token to swap from
 * @param {string} params.toToken - Token to swap to
 * @param {number} params.fromAmount - Amount to swap
 * @param {number} params.toAmount - Expected amount to receive
 * @param {number} params.slippage - Slippage tolerance (0.01 = 1%)
 * @param {string} params.account - Account name
 * @param {boolean} params.isExactIn - Whether this is an exact-in swap
 * @param {boolean} params.useGasStation - Whether to use gas station
 * @param {Object} params.tokenData - Token metadata
 * @param {string} params.chainId - Chain ID
 * @returns {Promise<Object>} - Unsigned transaction
 */
const createSwapTransaction = async ({
  fromToken,
  toToken,
  fromAmount,
  toAmount,
  slippage = 0.01, // 1% default slippage
  account,
  isExactIn = true,
  useGasStation = false,
  tokenData = {},
  chainId = config.network.chainId,
}) => {
  console.log("[createSwapTransaction] Starting swap creation with params:", {
    fromToken,
    toToken,
    fromAmount,
    toAmount,
    slippage,
    account,
    isExactIn,
    useGasStation,
    chainId,
  });

  try {
    // Get account details
    console.log(
      "[createSwapTransaction] Getting account details for:",
      account
    );
    const accountDetails = await getAccountDetails(account, chainId);
    console.log("[createSwapTransaction] Account details retrieved:", {
      hasGuard: !!accountDetails.guard,
      hasKeys: !!accountDetails.guard?.keys?.length,
    });

    // Get pair account for the tokens if using kaddex
    let pairAccount = null;
    if (fromToken !== "coin" && toToken !== "coin") {
      console.log("[createSwapTransaction] Getting pair account for tokens");
      const pairResult = await getPair(fromToken, toToken, chainId);
      if (pairResult && pairResult.data) {
        pairAccount = pairResult.data.account;
        console.log("[createSwapTransaction] Pair account found:", pairAccount);
      }
    }

    // Check which DEX to use - default to kaddex for mainnet
    const dexToUse = DEX_NAMESPACE;
    console.log("[createSwapTransaction] Using DEX namespace:", dexToUse);

    // Calculate amounts with slippage
    const fromAmountWithSlippage = calculateSlippage(
      fromAmount,
      slippage,
      false
    );
    const toAmountWithSlippage = calculateSlippage(toAmount, slippage, true);

    // Get token precisions for burn calculation
    const fromTokenPrecision = tokenData[fromToken]?.precision || 12;
    const toTokenPrecision = tokenData[toToken]?.precision || 12;

    // Check if any tokens are burn tokens
    const fromTokenIsBurn = isBurnToken(fromToken);
    const toTokenIsBurn = isBurnToken(toToken);
    const hasBurnToken = fromTokenIsBurn || toTokenIsBurn;

    // Calculate burn amounts if needed
    const fromTokenBurnAmount = fromTokenIsBurn
      ? calculateBurnAmount(fromAmount, fromTokenPrecision)
      : "0";
    const toTokenBurnAmount = toTokenIsBurn
      ? calculateBurnAmount(toAmount, toTokenPrecision)
      : "0";

    // Create the swap code with burn handling
    console.log("[createSwapTransaction] Creating swap code");
    let swapCode;

    // Prepare burn transfer code
    const fromTokenBurnTransfer = fromTokenIsBurn
      ? `(${fromToken}.transfer ${JSON.stringify(account)} ${JSON.stringify(
          BURN_WALLET
        )} ${fromTokenBurnAmount})`
      : "";

    const toTokenBurnTransfer = toTokenIsBurn
      ? `(${toToken}.transfer ${JSON.stringify(account)} ${JSON.stringify(
          BURN_WALLET
        )} ${toTokenBurnAmount})`
      : "";

    if (isExactIn) {
      if (hasBurnToken) {
        swapCode = `
          (namespace "free")
          (module swap G
            (defcap G () true)
            (defun swap-exact-in ()
              (let (
                (res
                  (${dexToUse}.exchange.swap-exact-in
                    ${fromAmount}
                    ${toAmountWithSlippage}
                    [${JSON.stringify(fromToken)} ${JSON.stringify(toToken)}]
                    ${JSON.stringify(account)}
                    ${JSON.stringify(account)}
                    (read-keyset "user-ks")
                  )
                )
              )
                ${fromTokenBurnTransfer}
                ${toTokenBurnTransfer}
                res
              )
            )
          )
          (swap.swap-exact-in)
        `;
      } else {
        swapCode = `
          (namespace "free")
          (module swap G
            (defcap G () true)
            (defun swap-exact-in ()
              (${dexToUse}.exchange.swap-exact-in
                ${fromAmount}
                ${toAmountWithSlippage}
                [${JSON.stringify(fromToken)} ${JSON.stringify(toToken)}]
                ${JSON.stringify(account)}
                ${JSON.stringify(account)}
                (read-keyset "user-ks")
              )
            )
          )
          (swap.swap-exact-in)
        `;
      }
    } else {
      if (hasBurnToken) {
        swapCode = `
          (namespace "free")
          (module swap G
            (defcap G () true)
            (defun swap-exact-out ()
              (let (
                (res
                  (${dexToUse}.exchange.swap-exact-out
                    ${toAmount}
                    ${fromAmountWithSlippage}
                    [${JSON.stringify(fromToken)} ${JSON.stringify(toToken)}]
                    ${JSON.stringify(account)}
                    ${JSON.stringify(account)}
                    (read-keyset "user-ks")
                  )
                )
              )
                ${fromTokenBurnTransfer}
                ${toTokenBurnTransfer}
                res
              )
            )
          )
          (swap.swap-exact-out)
        `;
      } else {
        swapCode = `
          (namespace "free")
          (module swap G
            (defcap G () true)
            (defun swap-exact-out ()
              (${dexToUse}.exchange.swap-exact-out
                ${toAmount}
                ${fromAmountWithSlippage}
                [${JSON.stringify(fromToken)} ${JSON.stringify(toToken)}]
                ${JSON.stringify(account)}
                ${JSON.stringify(account)}
                (read-keyset "user-ks")
              )
            )
          )
          (swap.swap-exact-out)
        `;
      }
    }
    console.log("[createSwapTransaction] Swap code created");

    // Create capabilities for gas and swap
    const capabilities = [];

    // Add gas capability
    if (useGasStation) {
      capabilities.push(createGasStationCap(dexToUse));
    } else {
      capabilities.push(createGasCap(account));
    }

    // Add standard gas capability
    capabilities.push({
      name: "coin.GAS",
      args: [account],
    });

    // Add burn capabilities if needed
    if (fromTokenIsBurn) {
      capabilities.push({
        name: `${fromToken}.TRANSFER`,
        args: [account, BURN_WALLET, fromTokenBurnAmount],
      });
    }

    if (toTokenIsBurn) {
      capabilities.push({
        name: `${toToken}.TRANSFER`,
        args: [account, BURN_WALLET, toTokenBurnAmount],
      });
    }

    // Add token transfer capabilities
    if (isExactIn) {
      capabilities.push({
        name: `${fromToken}.TRANSFER`,
        args: [account, pairAccount || `${dexToUse}.exchange`, fromAmount],
      });

      capabilities.push({
        name: `${toToken}.TRANSFER`,
        args: [
          pairAccount || `${dexToUse}.exchange`,
          account,
          toAmountWithSlippage,
        ],
      });
    } else {
      capabilities.push({
        name: `${fromToken}.TRANSFER`,
        args: [
          account,
          pairAccount || `${dexToUse}.exchange`,
          fromAmountWithSlippage,
        ],
      });

      capabilities.push({
        name: `${toToken}.TRANSFER`,
        args: [pairAccount || `${dexToUse}.exchange`, account, toAmount],
      });
    }

    // Create the transaction data
    const envData = {
      "user-ks": accountDetails.guard,
    };

    // Create the transaction
    console.log(
      "[createSwapTransaction] Creating transaction on chain:",
      chainId
    );
    const { transaction, cmd } = createUnsignedTransaction(
      swapCode,
      capabilities,
      chainId,
      envData,
      GAS_LIMIT,
      GAS_PRICE,
      account
    );
    console.log("[createSwapTransaction] Transaction created successfully");

    return {
      transaction,
      cmd,
      chainId,
    };
  } catch (error) {
    console.error(
      "[createSwapTransaction] Error creating swap transaction:",
      error
    );

    throw new Error(`Failed to create swap transaction: ${error.message}`);
  }
};

module.exports = {
  getPair,
  getTokenBalanceAccount,
  calculateSlippage,
  reduceBalance,
  createSwapTransaction,
  isBurnToken,
  calculateBurnAmount,
  BURN_WALLET,
  BURN_FEE,
};
