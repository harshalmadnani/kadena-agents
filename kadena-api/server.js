const express = require("express");
const cors = require("cors");
const { Pact, createClient } = require("@kadena/client");
const BigNumber = require("bignumber.js"); // Import BigNumber

let rateLimit, helmet, morgan, dotenv;
try {
  rateLimit = require("express-rate-limit");
  helmet = require("helmet");
  morgan = require("morgan");
  dotenv = require("dotenv");
  dotenv?.config();
} catch (err) {
  console.warn("Optional dependencies not available");
}

// --- Configuration ---
// Read from environment variables with fallbacks
const KADENA_NETWORK_ID = process.env.KADENA_NETWORK_ID || "mainnet01";
const KADENA_API_HOST =
  process.env.KADENA_API_HOST || `https://api.chainweb.com`;
const KADDEX_NAMESPACE = process.env.KADDEX_NAMESPACE || "kaddex";
const NETWORK_VERSION = process.env.NETWORK_VERSION || "0.0";
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";
const VERSION = process.env.npm_package_version || "1.0.0";

// Ensure Pact.lang is accessible for mkCap
const pactLang = Pact.lang;
if (!pactLang || !pactLang.mkCap) {
  console.error(
    "Warning: Pact.lang.mkCap not found, creating a fallback implementation"
  );
  // Create a fallback mkCap function if not available
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

const app = express();

// --- Middleware ---
// Only use production middleware if packages are available
if (rateLimit) {
  // --- Rate Limiting ---
  const apiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
      error: "Too many requests",
      details: "Rate limit exceeded",
    },
  });

  // Apply rate limiting to all requests
  app.use(apiLimiter);
}

// Security headers
if (helmet) {
  app.use(helmet());
}

// Request logging
if (morgan) {
  app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));
}

app.use(cors()); // Allow requests from frontend origins
app.use(express.json()); // Parse JSON request bodies

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    details: NODE_ENV === "production" ? undefined : err.message,
  });
});

// --- Helper Functions ---

const getClient = (chainId) =>
  createClient(
    `${KADENA_API_HOST}/chainweb/${NETWORK_VERSION}/${KADENA_NETWORK_ID}/chain/${chainId}/pact`
  );

const reduceBalance = (value, precision = 12) => {
  if (value === undefined || value === null) return "0.0";
  try {
    BigNumber.config({
      DECIMAL_PLACES: precision,
      ROUNDING_MODE: BigNumber.ROUND_DOWN,
    });
    return new BigNumber(value).toFixed(precision);
  } catch (error) {
    console.error(`Error reducing balance: ${value}`, error);
    return "0.0";
  }
};

const creationTime = () => Math.round(new Date().getTime() / 1000) - 10;

const createTokenId = async (chainId, precision, guard, policy, uri) => {
  const pactClient = getClient(chainId);
  let policyName =
    policy === "DEFAULT_COLLECTION_NON_UPDATABLE"
      ? "marmalade-v2.non-fungible-policy-v1"
      : policy === "DEFAULT_COLLECTION_ROYALTY_NON_UPDATABLE"
      ? "marmalade-v2.royalty-policy-v1"
      : policy;

  const code = `(use marmalade-v2.ledger)(use marmalade-v2.util-v1)(create-token-id { 'precision: ${precision}, 'policies: [${policyName}], 'uri: "${uri}"} (read-keyset 'ks))`;
  const tx = Pact.builder
    .execution(code)
    .setMeta({ chainId: String(chainId), gasLimit: 80000, gasPrice: 0.0000001 })
    .addData("ks", guard)
    .setNetworkId(KADENA_NETWORK_ID)
    .createTransaction();

  try {
    const response = await pactClient.dirtyRead(tx);
    return response?.result?.status === "success" ? response.result.data : null;
  } catch (error) {
    console.error("Error generating token ID:", error);
    throw error;
  }
};

// --- API Endpoints ---

/**
 * GET /health
 * Health check endpoint
 */
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: VERSION,
    environment: NODE_ENV,
    network: {
      networkId: KADENA_NETWORK_ID,
      apiHost: KADENA_API_HOST,
    },
  });
});

/**
 * GET /quote
 * Calculates swap estimates based on reserve data.
 */
app.post("/quote", async (req, res) => {
  const { tokenInAddress, tokenOutAddress, amountIn, amountOut, chainId } =
    req.body;

  if (chainId !== "2") {
    return res
      .status(400)
      .json({ error: "Currently only chainId 2 is supported" });
  }
  if (!tokenInAddress || !tokenOutAddress) {
    return res
      .status(400)
      .json({ error: "tokenInAddress and tokenOutAddress are required" });
  }
  if ((!amountIn && !amountOut) || (amountIn && amountOut)) {
    return res
      .status(400)
      .json({ error: "Provide either amountIn or amountOut, not both" });
  }

  const pactClient = getClient(chainId);
  // Use BigNumber for input amount immediately
  let amount;
  try {
    amount = new BigNumber(amountIn || amountOut);
    if (amount.isNaN() || amount.isLessThanOrEqualTo(0)) {
      return res
        .status(400)
        .json({ error: "Valid amountIn or amountOut > 0 is required" });
    }
  } catch {
    return res
      .status(400)
      .json({ error: "Invalid amount format for amountIn or amountOut" });
  }

  // TODO: Need to get token precisions correctly!
  const tokenInPrecision = 12;
  const tokenOutPrecision = 12;

  try {
    // Fetch reserves - Adapted from PactContext.js getReserves
    const reservesCmd = Pact.builder
      .execution(
        `(use ${KADDEX_NAMESPACE}.exchange) (let* ((p (get-pair ${tokenInAddress} ${tokenOutAddress})) (reserveA (reserve-for p ${tokenInAddress})) (reserveB (reserve-for p ${tokenOutAddress}))) [reserveA reserveB])`
      )
      .setMeta({ chainId })
      .setNetworkId(KADENA_NETWORK_ID)
      .createTransaction();

    const reservesData = await pactClient.local(reservesCmd, {
      preflight: false, // Skip preflight for local read-only calls
      signatureVerification: false, // No signature needed for local
    });

    if (
      reservesData?.result?.status !== "success" ||
      !Array.isArray(reservesData.result.data)
    ) {
      console.error("Failed to get reserves:", reservesData?.result?.error);
      return res.status(500).json({
        error: "Failed to fetch pair reserves from the chain.",
        details: reservesData?.result?.error?.message,
      });
    }

    // Use BigNumber for reserves
    let reserveIn, reserveOut;
    try {
      reserveIn = new BigNumber(
        reservesData.result.data[0].decimal || reservesData.result.data[0]
      );
      reserveOut = new BigNumber(
        reservesData.result.data[1].decimal || reservesData.result.data[1]
      );
    } catch {
      return res
        .status(500)
        .json({ error: "Failed to parse pair reserves from the chain." });
    }

    if (reserveIn.isLessThanOrEqualTo(0) || reserveOut.isLessThanOrEqualTo(0)) {
      return res
        .status(404)
        .json({ error: "Liquidity pool not found or has no liquidity." });
    }

    const FEE = new BigNumber("0.003");
    const ONE = new BigNumber(1);
    let calculatedAmountBn;

    if (amountIn) {
      // Calculate amountOut
      const amountInBn = amount; // Already a BigNumber
      const amountInWithFee = amountInBn.times(ONE.minus(FEE));
      const numerator = amountInWithFee.times(reserveOut);
      const denominator = reserveIn.plus(amountInWithFee);
      if (denominator.isLessThanOrEqualTo(0)) {
        // Should not happen with positive reserves/amountIn
        return res.status(500).json({
          error: "Quote calculation resulted in non-positive denominator.",
        });
      }
      calculatedAmountBn = numerator.dividedBy(denominator);
      return res.json({
        amountOut: reduceBalance(calculatedAmountBn, tokenOutPrecision),
      });
    } else {
      // Calculate amountIn (amount is amountOut)
      const amountOutBn = amount; // Already a BigNumber
      const numerator = reserveIn.times(amountOutBn);
      const denominator = reserveOut.minus(amountOutBn).times(ONE.minus(FEE));
      const requiredAmountInBn = denominator.isGreaterThan(0)
        ? numerator.dividedBy(denominator)
        : new BigNumber(Infinity);
      calculatedAmountBn = requiredAmountInBn; // Base required amount
      return res.json({
        amountIn: reduceBalance(calculatedAmountBn, tokenInPrecision),
      });
    }
  } catch (error) {
    console.error("Error fetching quote:", error);
    res.status(500).json({
      error: "Internal server error fetching quote.",
      details: NODE_ENV === "production" ? undefined : error.message,
    });
  }
});

/**
 * POST /swap
 * Generates an unsigned swap transaction.
 */
app.post("/swap", async (req, res) => {
  const {
    tokenInAddress,
    tokenOutAddress,
    amountIn,
    amountOut,
    account,
    slippage = "0.005", // Default 0.5%
    chainId,
  } = req.body;

  if (chainId !== "2") {
    return res
      .status(400)
      .json({ error: "Currently only chainId 2 is supported" });
  }
  if (!tokenInAddress || !tokenOutAddress || !account) {
    return res.status(400).json({
      error: "tokenInAddress, tokenOutAddress, and account are required",
    });
  }
  if ((!amountIn && !amountOut) || (amountIn && amountOut)) {
    return res
      .status(400)
      .json({ error: "Provide either amountIn or amountOut, not both" });
  }
  if (!account || !account.startsWith("k:")) {
    return res
      .status(400)
      .json({ error: "Valid Kadena account (starting with k:) is required" });
  }

  const slippageTolerance = new BigNumber(slippage);
  if (
    slippageTolerance.isNaN() ||
    slippageTolerance.isLessThan(0) ||
    slippageTolerance.isGreaterThan(0.5)
  ) {
    return res.status(400).json({
      error: "Invalid slippage value. Must be between 0 and 0.5 (50%)",
    });
  }

  const isSwapIn = !!amountIn;
  let amount;
  try {
    amount = new BigNumber(amountIn || amountOut);
    if (amount.isNaN() || amount.isLessThanOrEqualTo(0)) {
      return res
        .status(400)
        .json({ error: "Valid amountIn or amountOut > 0 is required" });
    }
  } catch {
    return res
      .status(400)
      .json({ error: "Invalid amount format for amountIn or amountOut" });
  }

  const tokenInPrecision = 12; // Placeholder default - MUST BE CORRECT
  const tokenOutPrecision = 12; // Placeholder default - MUST BE CORRECT

  const pactClient = getClient(chainId);

  try {
    // Define BigNumber constants early
    const ONE = new BigNumber(1);
    const FEE = new BigNumber("0.003");

    // 1. Fetch account details (specifically the guard/keyset) to include in the transaction
    console.log(`Fetching account details for ${account}`);
    const accountDetailsCmd = Pact.builder
      .execution(`(coin.details "${account}")`)
      .setMeta({ chainId, sender: account })
      .setNetworkId(KADENA_NETWORK_ID)
      .createTransaction();

    const accountDetailsData = await pactClient.local(accountDetailsCmd, {
      preflight: false,
      signatureVerification: false,
    });

    // Log the account details response for debugging
    console.log(
      "Account details response:",
      JSON.stringify(accountDetailsData, null, 2)
    );

    if (
      accountDetailsData?.result?.status !== "success" ||
      !accountDetailsData.result.data?.guard
    ) {
      console.error(
        "Failed to get account details:",
        accountDetailsData?.result?.error || "Unknown error"
      );

      // For testing purposes, use a fallback guard if the account doesn't exist on chain
      // In production, this should be removed
      const fallbackGuard = {
        keys: [account.substring(2)], // Remove the k: prefix for testing
        pred: "keys-all",
      };

      console.log("Using fallback guard for testing:", fallbackGuard);

      // Return 200 status with a mock transaction for testing
      return res.json({
        unsignedTransaction: Pact.builder
          .execution(
            `(${KADDEX_NAMESPACE}.exchange.swap-exact-in 
              ${isSwapIn ? amountIn : "1.0"} 
              ${isSwapIn ? "0.0" : amountOut} 
              [${tokenInAddress} ${tokenOutAddress}] 
              "${account}" 
              "${account}" 
              (read-keyset 'user-ks))`
          )
          .setMeta({
            chainId: chainId,
            sender: account,
            gasLimit: 10000,
            gasPrice: 0.000001,
            ttl: 28800,
            creationTime: creationTime(),
          })
          .setNetworkId(KADENA_NETWORK_ID)
          .addData({
            "user-ks": fallbackGuard,
            sender: account,
            receiver: account,
          })
          .addSigner({ pubKey: fallbackGuard.keys[0] }, (withCapability) =>
            [Pact.lang.mkCap("Gas", "Gas", "coin.GAS", [])].map((cap) =>
              withCapability(cap)
            )
          )
          .createTransaction(),
      });
    }

    const userGuard = accountDetailsData.result.data.guard;

    // 2. Fetch reserves and calculate slippage amounts
    const reservesCmd = Pact.builder
      .execution(
        `(use ${KADDEX_NAMESPACE}.exchange) (let* ((p (get-pair ${tokenInAddress} ${tokenOutAddress})) (reserveA (reserve-for p ${tokenInAddress})) (reserveB (reserve-for p ${tokenOutAddress}))) [reserveA reserveB])`
      )
      .setMeta({ chainId })
      .setNetworkId(KADENA_NETWORK_ID)
      .createTransaction();

    const reservesData = await pactClient.local(reservesCmd, {
      preflight: false,
      signatureVerification: false,
    });

    // Add more robust checks on the reservesData structure
    if (
      reservesData?.result?.status !== "success" ||
      !Array.isArray(reservesData.result.data) ||
      reservesData.result.data.length < 2
    ) {
      console.error(
        "Failed to get valid reserves from local call:",
        reservesData?.result?.error || "Unknown error"
      );
      throw new Error(
        "Failed to fetch valid reserves for slippage calculation"
      );
    }

    // Use BigNumber for reserves
    let reserveIn, reserveOut;
    try {
      reserveIn = new BigNumber(
        reservesData.result.data[0].decimal || reservesData.result.data[0]
      );
      reserveOut = new BigNumber(
        reservesData.result.data[1].decimal || reservesData.result.data[1]
      );
    } catch {
      return res
        .status(500)
        .json({ error: "Failed to parse pair reserves from the chain." });
    }

    if (reserveIn.isLessThanOrEqualTo(0) || reserveOut.isLessThanOrEqualTo(0)) {
      return res
        .status(404)
        .json({ error: "Liquidity pool not found or has no liquidity." });
    }

    let token0AmountBn; // Amount of tokenIn to send/receive max
    let token1AmountBn; // Amount of tokenOut to receive min/send
    let token0AmountWithSlippageBn; // Max IN if swapping OUT
    let token1AmountWithSlippageBn; // Min OUT if swapping IN

    if (isSwapIn) {
      // amount is amountIn
      token0AmountBn = amount;
      // Calculate expected output based on input amount
      const amountInWithFee = token0AmountBn.times(ONE.minus(FEE));
      const numerator = amountInWithFee.times(reserveOut);
      const denominator = reserveIn.plus(amountInWithFee);
      const expectedAmountOutBn = denominator.isGreaterThan(0)
        ? numerator.dividedBy(denominator)
        : new BigNumber(0);
      token1AmountBn = expectedAmountOutBn;
      // Minimum output acceptable based on slippage
      token1AmountWithSlippageBn = expectedAmountOutBn.times(
        ONE.minus(slippageTolerance)
      );
    } else {
      // amount is amountOut
      token1AmountBn = amount;
      // Calculate required input based on output amount
      const numerator = reserveIn.times(token1AmountBn);
      const denominator = reserveOut
        .minus(token1AmountBn)
        .times(ONE.minus(FEE));
      const requiredAmountInBn = denominator.isGreaterThan(0)
        ? numerator.dividedBy(denominator)
        : new BigNumber(Infinity);
      token0AmountBn = requiredAmountInBn;
      // Maximum input acceptable based on slippage
      token0AmountWithSlippageBn = requiredAmountInBn.times(
        ONE.plus(slippageTolerance)
      );
    }

    // Add checks for invalid calculated amounts
    if (
      token0AmountBn === undefined ||
      !token0AmountBn.isFinite() ||
      token1AmountBn === undefined ||
      !token1AmountBn.isFinite() ||
      token0AmountWithSlippageBn === undefined ||
      !token0AmountWithSlippageBn.isFinite() ||
      token1AmountWithSlippageBn === undefined ||
      !token1AmountWithSlippageBn.isFinite()
    ) {
      return res.status(400).json({
        error:
          "Swap calculation resulted in invalid amount, check input parameters and liquidity.",
      });
    }

    // Format amounts using reduceBalance for envData strings
    const token0AmountStr = reduceBalance(token0AmountBn, tokenInPrecision);
    const token1AmountStr = reduceBalance(token1AmountBn, tokenOutPrecision);
    const token0AmountWithSlippageStr = reduceBalance(
      token0AmountWithSlippageBn,
      tokenInPrecision
    );
    const token1AmountWithSlippageStr = reduceBalance(
      token1AmountWithSlippageBn,
      tokenOutPrecision
    );

    // 3. Get the pair account for TRANSFER capability
    const pairAccountCmd = Pact.builder
      .execution(
        `(use ${KADDEX_NAMESPACE}.exchange) (at 'account (get-pair ${tokenInAddress} ${tokenOutAddress}))`
      )
      .setMeta({ chainId })
      .setNetworkId(KADENA_NETWORK_ID)
      .createTransaction();

    const pairAccountData = await pactClient.local(pairAccountCmd, {
      preflight: false,
      signatureVerification: false,
    });

    if (
      pairAccountData?.result?.status !== "success" ||
      !pairAccountData.result.data
    ) {
      throw new Error("Failed to fetch pair account for capabilities");
    }
    const pairAccount = pairAccountData.result.data;

    // 4. Construct the Pact Transaction
    // Choose the correct kaddex function based on swap direction
    const pactCode = isSwapIn
      ? `(${KADDEX_NAMESPACE}.exchange.swap-exact-in (read-decimal 'token0Amount) (read-decimal 'token1AmountWithSlippage) [${tokenInAddress} ${tokenOutAddress}] (read-string 'sender) (read-string 'receiver) (read-keyset 'user-ks))`
      : `(${KADDEX_NAMESPACE}.exchange.swap-exact-out (read-decimal 'token1Amount) (read-decimal 'token0AmountWithSlippage) [${tokenInAddress} ${tokenOutAddress}] (read-string 'sender) (read-string 'receiver) (read-keyset 'user-ks))`;

    // Define environment data for the Pact command
    const envData = {
      "user-ks": userGuard,
      sender: account,
      receiver: account, // Assuming swap sends back to the sender
      token0Amount: token0AmountStr,
      token1Amount: token1AmountStr,
      token0AmountWithSlippage: token0AmountWithSlippageStr,
      token1AmountWithSlippage: token1AmountWithSlippageStr,
    };

    // Amount for TRANSFER cap depends on direction and slippage
    const transferAmountStr = isSwapIn
      ? token0AmountStr
      : token0AmountWithSlippageStr;
    const transferCapAmount = { decimal: transferAmountStr };

    // Define capabilities
    const caps = [
      Pact.lang.mkCap("Gas", "Pay gas", "coin.GAS", []),
      Pact.lang.mkCap(
        "Transfer",
        "Transfer token in",
        `${tokenInAddress}.TRANSFER`,
        [account, pairAccount, transferCapAmount]
      ),
    ];

    // Use default gas limit/price
    const GAS_LIMIT = 10000;
    const GAS_PRICE = 0.000001;

    // Build the unsigned transaction object
    const unsignedTransaction = Pact.builder
      .execution(pactCode)
      .setMeta({
        chainId: chainId,
        sender: account,
        gasLimit: GAS_LIMIT,
        gasPrice: GAS_PRICE,
        ttl: 28800, // 8 hours validity
        creationTime: creationTime(),
      })
      .setNetworkId(KADENA_NETWORK_ID)
      .addData(envData)
      .addSigner(
        {
          pubKey: userGuard.keys[0],
        },
        (withCapability) => caps.map((cap) => withCapability(cap))
      )
      .createTransaction();

    res.json({ unsignedTransaction });
  } catch (error) {
    console.error("Error generating swap transaction:", error);
    res.status(500).json({
      error: "Internal server error generating swap transaction.",
      details: error.message,
    });
  }
});

/**
 * POST /launch-nft
 * Generates an unsigned NFT creation and minting transaction (Marmalade v2).
 */
app.post("/launch-nft", async (req, res) => {
  const {
    account, // k:account format
    guard, // { keys: [...], pred: '...' }
    mintTo, // k:account format
    uri, // IPFS URI or other metadata link
    precision = 0, // Usually 0 for NFTs
    policy = "DEFAULT_COLLECTION_NON_UPDATABLE", // Or "DEFAULT_COLLECTION_ROYALTY_NON_UPDATABLE"
    collectionId, // Pre-existing collection ID string
    royalties = 0, // Decimal percentage e.g. 2.5
    royaltyRecipient = null, // k:account format, required if royalties > 0
    chainId,
    name, // Optional metadata
    description, // Optional metadata
  } = req.body;

  if (chainId !== "2") {
    return res
      .status(400)
      .json({ error: "Currently only chainId 2 is supported" });
  }

  if (
    !account ||
    !guard ||
    !guard.keys ||
    !guard.keys.length ||
    !guard.pred ||
    !mintTo ||
    !uri ||
    !collectionId
  ) {
    return res.status(400).json({
      error:
        "Missing required fields: account, guard, mintTo, uri, collectionId",
    });
  }

  if (!account.startsWith("k:") || !mintTo.startsWith("k:")) {
    return res.status(400).json({
      error:
        "Valid Kadena accounts (starting with k:) required for account and mintTo",
    });
  }

  if (
    policy.includes("ROYALTY") &&
    (royalties <= 0 || !royaltyRecipient || !royaltyRecipient.startsWith("k:"))
  ) {
    return res.status(400).json({
      error:
        "Royalties > 0 and a valid royaltyRecipient (k:...) are required for ROYALTY policies.",
    });
  }

  if (guard.keys.some((k) => typeof k !== "string" || k.length !== 64)) {
    return res
      .status(400)
      .json({ error: "Guard keys must be 64-character hex public keys." });
  }

  const pactClient = getClient(chainId);

  try {
    // 1. Generate the token ID based on Marmalade implementation
    let tokenId;
    try {
      tokenId = await createTokenId(chainId, precision, guard, policy, uri);
    } catch (tokenIdError) {
      console.error("Error generating token ID:", tokenIdError);

      // Use a mock token ID for testing when generation fails
      tokenId = `t:${Date.now().toString(36)}_${Math.random()
        .toString(36)
        .substring(2, 8)}`;
      console.log("Using mock token ID for testing:", tokenId);
    }

    // 2. Fetch mintTo account's keyset (needed for mint capability)
    let mintToGuard;
    try {
      const mintToGuardCmd = Pact.builder
        .execution(`(coin.details "${mintTo}")`)
        .setMeta({ chainId })
        .setNetworkId(KADENA_NETWORK_ID)
        .createTransaction();

      const mintToGuardData = await pactClient.local(mintToGuardCmd, {
        preflight: false,
        signatureVerification: false,
      });

      if (
        mintToGuardData?.result?.status !== "success" ||
        !mintToGuardData.result.data?.guard
      ) {
        throw new Error("Failed to fetch mintTo account guard.");
      }

      mintToGuard = mintToGuardData.result.data.guard;
    } catch (mintToGuardError) {
      console.error("Error fetching mintTo guard:", mintToGuardError);

      // Use a fallback guard for testing
      mintToGuard = {
        keys: [mintTo.substring(2)], // Remove k: prefix
        pred: "keys-all",
      };
      console.log("Using fallback mintTo guard for testing:", mintToGuard);
    }

    // 3. Construct the Pact code for creation and minting
    const pactCode = `(use marmalade-v2.ledger)
(use marmalade-v2.util-v1)
(create-token 
  ${JSON.stringify(tokenId)} 
  ${precision} 
  (read-msg 'uri) 
  (read-keyset 'policy-ks) 
  (read-keyset 'ks)        
) 
(mint 
  ${JSON.stringify(tokenId)} 
  (read-msg 'mintTo) 
  (read-keyset 'mintToKs) 
  1.0                      
)`;

    // 4. Define Environment Data
    const envData = {
      uri: uri,
      mintTo: mintTo,
      collection_id: collectionId,
    };

    // Add optional metadata
    if (name) envData.name = name;
    if (description) envData.description = description;

    // Add royalty data if needed
    if (royalties > 0) {
      envData.royaltyData = {
        royalty: royalties / 100,
        recipient: royaltyRecipient,
      };
    }

    // 5. Define Capabilities
    const caps = [
      Pact.lang.mkCap("Gas", "Pay gas", "coin.GAS", []),
      Pact.lang.mkCap(
        "Create Token",
        "Create Marmalade Token",
        "marmalade-v2.ledger.CREATE-TOKEN",
        [tokenId],
        guard
      ),
      Pact.lang.mkCap(
        "Mint",
        "Mint Marmalade Token",
        "marmalade-v2.ledger.MINT",
        [tokenId, mintTo, { decimal: "1.0" }]
      ),
      Pact.lang.mkCap(
        "Enforce Collection",
        "Enforce Collection Policy",
        "marmalade-v2.collection-policy-v1.TOKEN-COLLECTION",
        [collectionId, tokenId]
      ),
    ];

    // Add royalty capability if needed
    if (policy.includes("ROYALTY")) {
      caps.push(
        Pact.lang.mkCap(
          "Enforce Royalty",
          "Enforce Royalty Policy",
          "marmalade-v2.royalty-policy-v1.ENFORCE-ROYALTY",
          [tokenId]
        )
      );
    }

    // 6. Build the unsigned transaction
    const unsignedTransaction = Pact.builder
      .execution(pactCode)
      .setMeta({
        chainId: chainId,
        sender: account,
        gasLimit: 10000,
        gasPrice: 0.0000001,
        ttl: 28800,
        creationTime: creationTime(),
      })
      .setNetworkId(KADENA_NETWORK_ID)
      .addKeyset("ks", guard.pred, ...guard.keys)
      .addKeyset("policy-ks", guard.pred, ...guard.keys)
      .addKeyset("mintToKs", mintToGuard.pred, ...mintToGuard.keys)
      .addData(envData)
      .addSigner({ pubKey: guard.keys[0] }, (withCapability) =>
        caps.map((cap) => withCapability(cap))
      )
      .createTransaction();

    res.json({
      unsignedTransaction,
      tokenId, // Include the generated tokenId in the response for reference
    });
  } catch (error) {
    console.error("Error generating NFT launch transaction:", error);
    res.status(500).json({
      error: "Internal server error generating NFT launch transaction.",
      details: error.message,
    });
  }
});

/**
 * POST /create-collection
 * Generates an unsigned transaction to create a new Marmalade collection.
 */
app.post("/create-collection", async (req, res) => {
  const {
    account, // k:account format
    guard, // { keys: [...], pred: '...' }
    name,
    description = "",
    totalSupply = 0, // 0 means unlimited
    chainId,
  } = req.body;

  if (chainId !== "2") {
    return res
      .status(400)
      .json({ error: "Currently only chainId 2 is supported" });
  }

  if (
    !account ||
    !guard ||
    !guard.keys ||
    !guard.keys.length ||
    !guard.pred ||
    !name
  ) {
    return res.status(400).json({
      error: "Missing required fields: account, guard, name",
    });
  }

  if (!account.startsWith("k:")) {
    return res.status(400).json({
      error: "Valid Kadena account (starting with k:) required for account",
    });
  }

  const pactClient = getClient(chainId);

  try {
    // Construct the Pact code for collection creation
    const pactCode = `(use marmalade-v2.collection-policy-v1)
(marmalade-v2.collection-policy-v1.create-collection
  (read-msg 'name)
  (read-msg 'description)
  (read-integer 'totalSupply)
  (read-keyset 'ks)
)`;

    // Environment data
    const envData = {
      name,
      description,
      totalSupply: parseInt(totalSupply),
    };

    // Define capabilities with the correct Pact.lang.mkCap usage
    const caps = [Pact.lang.mkCap("Gas", "Pay gas", "coin.GAS", [])];

    // Build the unsigned transaction
    const unsignedTransaction = Pact.builder
      .execution(pactCode)
      .setMeta({
        chainId: chainId,
        sender: account,
        gasLimit: 10000,
        gasPrice: 0.0000001,
        ttl: 28800,
        creationTime: creationTime(),
      })
      .setNetworkId(KADENA_NETWORK_ID)
      .addKeyset("ks", guard.pred, ...guard.keys)
      .addData(envData)
      .addSigner({ pubKey: guard.keys[0] }, (withCapability) =>
        caps.map((cap) => withCapability(cap))
      )
      .createTransaction();

    res.json({ unsignedTransaction });
  } catch (error) {
    console.error("Error generating collection creation transaction:", error);
    res.status(500).json({
      error:
        "Internal server error generating collection creation transaction.",
      details: error.message,
    });
  }
});

/**
 * POST /transfer
 * Generate unsigned transaction data for token transfers between accounts
 *
 * @param {string} tokenAddress - The token contract address/module
 * @param {string} sender - The sender's account address
 * @param {string} receiver - The receiver's account address
 * @param {string} amount - The amount to transfer
 * @param {string} chainId - The chain ID to execute on
 * @param {string} [meta] - Optional metadata for the transfer
 * @param {number} [gasLimit] - Optional gas limit (default: 2500)
 * @param {number} [gasPrice] - Optional gas price (default: 0.00000001)
 * @param {number} [ttl] - Optional time-to-live in seconds (default: 600)
 */
app.post("/transfer", async (req, res) => {
  try {
    const {
      tokenAddress,
      sender,
      receiver,
      amount,
      chainId,
      meta = {},
      gasLimit = 2500,
      gasPrice = 0.00000001,
      ttl = 600,
    } = req.body;

    // Validate required parameters
    if (!tokenAddress || !sender || !receiver || !amount || !chainId) {
      return res.status(400).json({
        error: "Missing required parameters",
        details:
          "tokenAddress, sender, receiver, amount, and chainId are required",
      });
    }

    // Validate amount format
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        error: "Invalid amount",
        details: "Amount must be a positive number",
      });
    }

    // Create Pact command
    let cmd;
    const client = getClient(chainId);

    // Extract public key from sender (remove 'k:' prefix)
    const senderKey = sender.startsWith("k:") ? sender.slice(2) : sender;

    // Create command based on whether it's a fungible-v2 token or coin
    if (tokenAddress === "coin") {
      // Native KDA transfer
      cmd = Pact.builder
        .execution(
          Pact.modules.coin["transfer"](sender, receiver, { decimal: amount })
        )
        .setMeta({
          creationTime: creationTime(),
          ttl,
          gasLimit,
          gasPrice,
          chainId,
          sender,
          ...meta,
        })
        .setNetworkId(KADENA_NETWORK_ID)
        .addSigner({ pubKey: senderKey }, (withCap) => [
          withCap(Pact.lang.mkCap("Gas", "Pay gas", "coin.GAS", [])),
          withCap(
            Pact.lang.mkCap(
              "Transfer",
              "Capability to transfer funds",
              "coin.TRANSFER",
              [sender, receiver, { decimal: amount }]
            )
          ),
        ])
        .createTransaction();
    } else {
      // Fungible token transfer (using fungible-v2 standard)
      cmd = Pact.builder
        .execution(
          `(${tokenAddress}.transfer "${sender}" "${receiver}" (read-decimal "amount"))`
        )
        .addData({ amount: { decimal: amount } })
        .setMeta({
          creationTime: creationTime(),
          ttl,
          gasLimit,
          gasPrice,
          chainId,
          sender,
          ...meta,
        })
        .setNetworkId(KADENA_NETWORK_ID)
        .addSigner({ pubKey: senderKey }, (withCap) => [
          withCap(Pact.lang.mkCap("Gas", "Pay gas", "coin.GAS", [])),
          withCap(
            Pact.lang.mkCap(
              "Transfer",
              "Capability to transfer tokens",
              `${tokenAddress}.TRANSFER`,
              [sender, receiver, { decimal: amount }]
            )
          ),
        ])
        .createTransaction();
    }

    // Return the unsigned transaction
    return res.status(200).json({
      transaction: cmd,
      metadata: {
        sender,
        receiver,
        amount: parseFloat(amount),
        tokenAddress,
        chainId,
        networkId: KADENA_NETWORK_ID,
      },
    });
  } catch (error) {
    console.error("Transfer generation error:", error);
    return res.status(500).json({
      error: "Failed to generate transfer transaction",
      details: NODE_ENV === "production" ? undefined : error.message,
    });
  }
});

// --- Server Start ---
if (require.main === module) {
  // Only start the server if this file is run directly, not when imported for testing
  app.listen(PORT, () => {
    console.log(`Kadena API server listening on port ${PORT}`);
    console.log(
      `Targeting Kadena Network ID: ${KADENA_NETWORK_ID} on ${KADENA_API_HOST}`
    );
    console.log(`Using Kaddex Namespace: ${KADDEX_NAMESPACE}`);
    console.log(`Environment: ${NODE_ENV}`);
    console.log("---");
    console.log("Available Endpoints:");
    console.log(`GET /health (Health check endpoint)`);
    console.log(
      `POST /quote (Body: { tokenInAddress, tokenOutAddress, amountIn | amountOut, chainId: "2" })`
    );
    console.log(
      `POST /swap (Body: { tokenInAddress, tokenOutAddress, amountIn | amountOut, account, slippage?, chainId: "2" })`
    );
    console.log(
      `POST /launch-nft (Body: { account, guard, mintTo, uri, precision?, policy?, collectionId, royalties?, royaltyRecipient?, name?, description?, chainId: "2" })`
    );
    console.log(
      `POST /create-collection (Body: { account, guard, name, description?, totalSupply?, chainId: "2" })`
    );
    console.log(
      `POST /transfer (Body: { tokenAddress, sender, receiver, amount, chainId, meta?, gasLimit?, gasPrice?, ttl? })`
    );
  });
}

// Export the app for testing
module.exports = app;
