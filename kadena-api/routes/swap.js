const express = require("express");
const router = express.Router();
const { KADENA_NETWORK_ID, KADDEX_NAMESPACE } = require("../config");
const { BigNumber } = require("bignumber.js");
const { Pact } = require("@kadena/client");
const {
  getClient,
  ensureChainIdString,
  validateChainId,
  creationTime,
  getTokenPrecision,
  reduceBalance,
  generateTransactionHash,
} = require("../utils");

/**
 * POST /swap
 * Generates an unsigned swap transaction.
 */
router.post("/", async (req, res) => {
  try {
    const {
      tokenInAddress,
      tokenOutAddress,
      amountIn,
      amountOut,
      account,
      slippage = "0.005", // Default 0.5%
      chainId = "2",
      gasLimit = 10000,
      gasPrice = 0.000001,
      ttl = 28800,
    } = req.body;

    // Validate chain ID
    const chainIdValidation = validateChainId(chainId);
    if (!chainIdValidation.valid) {
      return res.status(400).json({
        error: chainIdValidation.error,
        details: chainIdValidation.details,
      });
    }

    // Validate required fields
    if (
      !account ||
      !tokenInAddress ||
      !tokenOutAddress ||
      !(amountIn || amountOut)
    ) {
      return res.status(400).json({
        error: "Missing required fields",
        details:
          "Account, tokenInAddress, tokenOutAddress, and (amountIn or amountOut) are required",
      });
    }

    // Validate account format
    if (!account.startsWith("k:")) {
      return res.status(400).json({
        error: "Invalid account format",
        details: "Account must start with 'k:'",
      });
    }

    // Parse amount and validate
    const isExactIn = !!amountIn;
    let amount;
    try {
      amount = new BigNumber(amountIn || amountOut);
      if (amount.isNaN() || amount.isLessThanOrEqualTo(0)) {
        return res.status(400).json({
          error: "Invalid amount",
          details: "Amount must be greater than 0",
        });
      }
    } catch (error) {
      return res.status(400).json({
        error: "Invalid amount format",
        details: error.message,
      });
    }

    // Parse slippage tolerance
    let slippageTolerance;
    try {
      slippageTolerance = new BigNumber(slippage);
      if (
        slippageTolerance.isNaN() ||
        slippageTolerance.isLessThan(0) ||
        slippageTolerance.isGreaterThan(0.5)
      ) {
        return res.status(400).json({
          error: "Invalid slippage value",
          details: "Must be between 0 and 0.5 (50%)",
        });
      }
    } catch (error) {
      return res.status(400).json({
        error: "Invalid slippage format",
        details: error.message,
      });
    }

    // Get token precision
    const tokenInPrecision = getTokenPrecision(tokenInAddress);
    const tokenOutPrecision = getTokenPrecision(tokenOutAddress);

    console.log(
      `Using precision for ${tokenInAddress}: ${tokenInPrecision}, ${tokenOutAddress}: ${tokenOutPrecision}`
    );

    // Constants
    const ONE = new BigNumber(1);
    const FEE = new BigNumber("0.003"); // 0.3% fee
    const pactClient = getClient(chainId);

    // 1. Fetch account guard
    const accountDetailsCmd = Pact.builder
      .execution(`(coin.details "${account}")`)
      .setMeta({
        chainId: ensureChainIdString(chainId),
        sender: account,
        gasLimit: 1000,
        gasPrice: 0.000001,
        ttl: 600,
        creationTime: creationTime(),
      })
      .setNetworkId(KADENA_NETWORK_ID)
      .createTransaction();

    let accountDetails;
    try {
      accountDetails = await pactClient.local(accountDetailsCmd, {
        preflight: false,
        signatureVerification: false,
      });

      if (
        accountDetails?.result?.status !== "success" ||
        !accountDetails.result.data?.guard
      ) {
        return res.status(404).json({
          error: "Account not found",
          details: "Could not retrieve account details from blockchain",
        });
      }
    } catch (error) {
      console.error("Error fetching account details:", error);
      return res.status(500).json({
        error: "Failed to retrieve account details",
        details: error.message,
      });
    }

    const userGuard = accountDetails.result.data.guard;

    // 2. Fetch reserves
    const reservesCmd = Pact.builder
      .execution(
        `(use ${KADDEX_NAMESPACE}.exchange) 
         (let* ((p (get-pair ${tokenInAddress} ${tokenOutAddress})) 
                (reserveA (reserve-for p ${tokenInAddress})) 
                (reserveB (reserve-for p ${tokenOutAddress}))) 
          [reserveA reserveB])`
      )
      .setMeta({
        chainId: ensureChainIdString(chainId),
        gasLimit: 1000,
        gasPrice: 0.000001,
        ttl: 600,
        creationTime: creationTime(),
      })
      .setNetworkId(KADENA_NETWORK_ID)
      .createTransaction();

    let reservesData;
    try {
      reservesData = await pactClient.local(reservesCmd, {
        preflight: false,
        signatureVerification: false,
      });

      // Validate reserve data
      if (
        reservesData?.result?.status !== "success" ||
        !Array.isArray(reservesData.result.data) ||
        reservesData.result.data.length < 2
      ) {
        return res.status(404).json({
          error: "Liquidity pool not found",
          details:
            "Could not find a valid trading pair for the provided tokens",
        });
      }
    } catch (error) {
      console.error("Error fetching reserves:", error);
      return res.status(500).json({
        error: "Failed to retrieve pool reserves",
        details: error.message,
      });
    }

    // Parse reserve values
    let reserveIn, reserveOut;
    try {
      const reserve0 = reservesData.result.data[0];
      const reserve1 = reservesData.result.data[1];

      reserveIn = new BigNumber(
        typeof reserve0 === "object" ? reserve0.decimal || 0 : reserve0 || 0
      );
      reserveOut = new BigNumber(
        typeof reserve1 === "object" ? reserve1.decimal || 0 : reserve1 || 0
      );
    } catch (error) {
      console.error("Error parsing reserves:", error);
      return res.status(500).json({
        error: "Failed to parse reserves",
        details: error.message,
      });
    }

    // Verify reserves are valid
    if (reserveIn.isLessThanOrEqualTo(0) || reserveOut.isLessThanOrEqualTo(0)) {
      return res.status(404).json({
        error: "Insufficient liquidity",
        details: "Liquidity pool has no liquidity",
      });
    }

    // 3. Calculate swap amounts with slippage
    let token0AmountBn,
      token1AmountBn,
      token0AmountWithSlippageBn,
      token1AmountWithSlippageBn;

    try {
      if (isExactIn) {
        token0AmountBn = amount;

        // Calculate amountOut based on input amount with fee
        const amountInWithFee = token0AmountBn.times(ONE.minus(FEE));
        const numerator = amountInWithFee.times(reserveOut);
        const denominator = reserveIn.plus(amountInWithFee);

        if (denominator.isLessThanOrEqualTo(0)) {
          return res.status(400).json({
            error: "Invalid calculation",
            details: "Calculation resulted in invalid denominator",
          });
        }

        token1AmountBn = numerator.dividedBy(denominator);

        // Apply slippage to output amount (reduce by slippage %)
        token1AmountWithSlippageBn = token1AmountBn.times(
          ONE.minus(slippageTolerance)
        );
        token0AmountWithSlippageBn = token0AmountBn;
      } else {
        token1AmountBn = amount;

        if (token1AmountBn.isGreaterThanOrEqualTo(reserveOut)) {
          return res.status(400).json({
            error: "Insufficient liquidity",
            details: "Output amount exceeds available reserves",
          });
        }

        // Calculate amountIn based on fixed output amount
        const numerator = reserveIn.times(token1AmountBn);
        const denominator = reserveOut
          .minus(token1AmountBn)
          .times(ONE.minus(FEE));

        if (denominator.isLessThanOrEqualTo(0)) {
          return res.status(400).json({
            error: "Invalid calculation",
            details: "Calculation resulted in invalid denominator",
          });
        }

        token0AmountBn = numerator.dividedBy(denominator);

        // Apply slippage to input amount (increase by slippage %)
        token0AmountWithSlippageBn = token0AmountBn.times(
          ONE.plus(slippageTolerance)
        );
        token1AmountWithSlippageBn = token1AmountBn;
      }
    } catch (error) {
      console.error("Error calculating swap amounts:", error);
      return res.status(500).json({
        error: "Swap calculation failed",
        details: error.message,
      });
    }

    // Format amounts with proper precision
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

    // 4. Get the pair account for TRANSFER capability
    const pairAccountCmd = Pact.builder
      .execution(
        `(use ${KADDEX_NAMESPACE}.exchange) 
         (at 'account (get-pair ${tokenInAddress} ${tokenOutAddress}))`
      )
      .setMeta({
        chainId: ensureChainIdString(chainId),
        gasLimit: 1000,
        gasPrice: 0.000001,
        ttl: 600,
        creationTime: creationTime(),
      })
      .setNetworkId(KADENA_NETWORK_ID)
      .createTransaction();

    // Request the pair account identifier
    let pairAccount;
    try {
      const pairAccountData = await pactClient.local(pairAccountCmd, {
        preflight: false,
        signatureVerification: false,
      });

      if (
        pairAccountData?.result?.status !== "success" ||
        !pairAccountData.result.data
      ) {
        console.warn("Failed to fetch pair account, using fallback");
        pairAccount = `${KADDEX_NAMESPACE}.exchange.exchange-swap-pair`;
      } else {
        pairAccount = pairAccountData.result.data;
      }
    } catch (error) {
      console.warn("Error fetching pair account, using fallback:", error);
      pairAccount = `${KADDEX_NAMESPACE}.exchange.exchange-swap-pair`;
    }

    // 5. Construct the transaction code based on swap type
    const pactCode = isExactIn
      ? `(${KADDEX_NAMESPACE}.exchange.swap-exact-in 
          (read-decimal 'token0Amount) 
          (read-decimal 'token1AmountWithSlippage) 
          [${tokenInAddress} ${tokenOutAddress}] 
          "${account}" 
          "${account}" 
          (read-keyset 'user-ks))`
      : `(${KADDEX_NAMESPACE}.exchange.swap-exact-out 
          (read-decimal 'token1Amount) 
          (read-decimal 'token0AmountWithSlippage) 
          [${tokenInAddress} ${tokenOutAddress}] 
          "${account}" 
          "${account}" 
          (read-keyset 'user-ks))`;

    // 6. Prepare transaction data and environment
    const envData = {
      "user-ks": userGuard,
      token0Amount: token0AmountStr,
      token1Amount: token1AmountStr,
      token0AmountWithSlippage: token0AmountWithSlippageStr,
      token1AmountWithSlippage: token1AmountWithSlippageStr,
    };

    // Transaction metadata
    const txMeta = {
      chainId: ensureChainIdString(chainId),
      sender: account,
      gasLimit: parseInt(gasLimit, 10),
      gasPrice: parseFloat(gasPrice),
      ttl: parseInt(ttl, 10),
      creationTime: creationTime(),
    };

    // Amount for TRANSFER capability depends on swap direction
    const transferAmountStr = isExactIn
      ? token0AmountStr
      : token0AmountWithSlippageStr;

    // 7. Create transaction with proper capabilities
    try {
      // Create capabilities with the correct Kadena format
      const transferAmount = parseFloat(transferAmountStr);
      const capabilities = [
        {
          name: "coin.GAS",
          args: [],
        },
        {
          name: `${tokenInAddress}.TRANSFER`,
          args: [account, pairAccount, transferAmount],
        },
      ];

      // Create transaction command
      const pactCommand = {
        networkId: KADENA_NETWORK_ID,
        payload: {
          exec: {
            data: envData,
            code: pactCode,
          },
        },
        signers: [
          {
            pubKey: userGuard.keys[0],
            scheme: "ED25519",
            clist: capabilities,
          },
        ],
        meta: txMeta,
        nonce: `swap:${Date.now()}:${Math.random()
          .toString(36)
          .substring(2, 15)}`,
      };

      // Generate transaction hash
      let transactionHash;
      try {
        // Stringify the command for consistent hashing
        const cmdString = JSON.stringify(pactCommand);
        transactionHash = generateTransactionHash(cmdString);
      } catch (hashError) {
        console.error("Failed to generate swap transaction hash:", hashError);
        return res.status(500).json({
          error: "Transaction hash generation failed",
          details:
            hashError.message || "Unable to create a valid transaction hash",
        });
      }

      // Final transaction object for client signing
      const preparedTx = {
        cmd: JSON.stringify(pactCommand),
        hash: transactionHash,
        sigs: [null], // Client will replace with signature
      };

      // Calculate price impact
      const midPrice = reserveOut.dividedBy(reserveIn);
      const exactQuote = token0AmountBn.times(midPrice);
      let priceImpact = "0.00";

      if (exactQuote.isGreaterThan(0)) {
        const slippage = ONE.minus(token1AmountBn.dividedBy(exactQuote));
        priceImpact = slippage.times(100).toFixed(2);
      }

      // 8. Return the transaction data and relevant metadata
      return res.json({
        transaction: preparedTx,
        quote: {
          expectedIn: token0AmountStr,
          expectedOut: token1AmountStr,
          slippage: slippage,
          priceImpact: priceImpact,
        },
      });
    } catch (error) {
      console.error("Error creating transaction:", error);
      return res.status(500).json({
        error: "Transaction preparation failed",
        details: error.message,
      });
    }
  } catch (error) {
    console.error("Unhandled error in /swap endpoint:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

router.use((err, req, res, next) => {
  console.error("Unhandled error in swap routes:", err);
  res.status(500).json({
    error: "Internal server error",
    details: err.message,
  });
});

module.exports = router;
