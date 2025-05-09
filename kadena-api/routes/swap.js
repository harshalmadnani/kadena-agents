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
    req.logStep("Start swap request");

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
      req.logStep("Invalid chain ID");
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
      req.logStep("Missing required fields");
      return res.status(400).json({
        error: "Missing required fields",
        details:
          "Account, tokenInAddress, tokenOutAddress, and (amountIn or amountOut) are required",
      });
    }

    // Validate account format
    if (!account.startsWith("k:")) {
      req.logStep("Invalid account format");
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
        req.logStep("Invalid amount value");
        return res.status(400).json({
          error: "Invalid amount",
          details: "Amount must be greater than 0",
        });
      }
    } catch (error) {
      req.logStep("Amount parsing failed");
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
        req.logStep("Invalid slippage value");
        return res.status(400).json({
          error: "Invalid slippage value",
          details: "Must be between 0 and 0.5 (50%)",
        });
      }
    } catch (error) {
      req.logStep("Slippage parsing failed");
      return res.status(400).json({
        error: "Invalid slippage format",
        details: error.message,
      });
    }

    req.logStep("Fetching token precisions");
    const tokenInPrecision = getTokenPrecision(tokenInAddress);
    const tokenOutPrecision = getTokenPrecision(tokenOutAddress);

    // Constants
    const ONE = new BigNumber(1);
    const FEE = new BigNumber("0.003"); // 0.3% fee
    const pactClient = getClient(chainId);

    // Fetch account guard
    req.logStep("Fetching account details");
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
        req.logStep("Account not found");
        return res.status(404).json({
          error: "Account not found",
          details: "Could not retrieve account details from blockchain",
        });
      }
    } catch (error) {
      req.logStep("Failed to fetch account");
      return res.status(500).json({
        error: "Failed to retrieve account details",
        details: error.message,
      });
    }

    const userGuard = accountDetails.result.data.guard;

    // Fetch reserves
    req.logStep("Fetching pool reserves");
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

      if (
        reservesData?.result?.status !== "success" ||
        !Array.isArray(reservesData.result.data) ||
        reservesData.result.data.length < 2
      ) {
        req.logStep("Pool not found");
        return res.status(404).json({
          error: "Liquidity pool not found",
          details:
            "Could not find a valid trading pair for the provided tokens",
        });
      }
    } catch (error) {
      req.logStep("Failed to fetch reserves");
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
      req.logStep("Failed to parse reserves");
      return res.status(500).json({
        error: "Failed to parse reserves",
        details: error.message,
      });
    }

    if (reserveIn.isLessThanOrEqualTo(0) || reserveOut.isLessThanOrEqualTo(0)) {
      req.logStep("Insufficient liquidity");
      return res.status(404).json({
        error: "Insufficient liquidity",
        details: "Liquidity pool has no liquidity",
      });
    }

    // Calculate swap amounts
    req.logStep("Calculating swap amounts");
    let token0AmountBn,
      token1AmountBn,
      token0AmountWithSlippageBn,
      token1AmountWithSlippageBn;

    try {
      if (isExactIn) {
        token0AmountBn = amount;
        const amountInWithFee = token0AmountBn.times(ONE.minus(FEE));
        const numerator = amountInWithFee.times(reserveOut);
        const denominator = reserveIn.plus(amountInWithFee);

        if (denominator.isLessThanOrEqualTo(0)) {
          req.logStep("Invalid calculation");
          return res.status(400).json({
            error: "Invalid calculation",
            details: "Calculation resulted in invalid denominator",
          });
        }

        token1AmountBn = numerator.dividedBy(denominator);
        token1AmountWithSlippageBn = token1AmountBn.times(
          ONE.minus(slippageTolerance)
        );
        token0AmountWithSlippageBn = token0AmountBn;
      } else {
        token1AmountBn = amount;
        if (token1AmountBn.isGreaterThanOrEqualTo(reserveOut)) {
          req.logStep("Output exceeds reserves");
          return res.status(400).json({
            error: "Insufficient liquidity",
            details: "Output amount exceeds available reserves",
          });
        }

        const numerator = reserveIn.times(token1AmountBn);
        const denominator = reserveOut
          .minus(token1AmountBn)
          .times(ONE.minus(FEE));

        if (denominator.isLessThanOrEqualTo(0)) {
          req.logStep("Invalid calculation");
          return res.status(400).json({
            error: "Invalid calculation",
            details: "Calculation resulted in invalid denominator",
          });
        }

        token0AmountBn = numerator.dividedBy(denominator);
        token0AmountWithSlippageBn = token0AmountBn.times(
          ONE.plus(slippageTolerance)
        );
        token1AmountWithSlippageBn = token1AmountBn;
      }
    } catch (error) {
      req.logStep("Swap calculation failed");
      return res.status(500).json({
        error: "Swap calculation failed",
        details: error.message,
      });
    }

    // Format amounts
    req.logStep("Formatting amounts");
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

    // Get pair account
    req.logStep("Getting pair account");
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
        pairAccount = `${KADDEX_NAMESPACE}.exchange.exchange-swap-pair`;
      } else {
        pairAccount = pairAccountData.result.data;
      }
    } catch (error) {
      pairAccount = `${KADDEX_NAMESPACE}.exchange.exchange-swap-pair`;
    }

    // Build transaction
    req.logStep("Building transaction");
    try {
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

      const envData = {
        "user-ks": userGuard,
        token0Amount: token0AmountStr,
        token1Amount: token1AmountStr,
        token0AmountWithSlippage: token0AmountWithSlippageStr,
        token1AmountWithSlippage: token1AmountWithSlippageStr,
      };

      const txMeta = {
        chainId: ensureChainIdString(chainId),
        sender: account,
        gasLimit: parseInt(gasLimit, 10),
        gasPrice: parseFloat(gasPrice),
        ttl: parseInt(ttl, 10),
        creationTime: creationTime(),
      };

      const transferAmountStr = isExactIn
        ? token0AmountStr
        : token0AmountWithSlippageStr;
      const transferAmount = parseFloat(transferAmountStr);

      const capabilities = [
        { name: "coin.GAS", args: [] },
        {
          name: `${tokenInAddress}.TRANSFER`,
          args: [account, pairAccount, transferAmount],
        },
      ];

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

      const cmdString = JSON.stringify(pactCommand);
      const transactionHash = generateTransactionHash(cmdString);

      // Calculate price impact
      const midPrice = reserveOut.dividedBy(reserveIn);
      const exactQuote = token0AmountBn.times(midPrice);
      let priceImpact = "0.00";

      if (exactQuote.isGreaterThan(0)) {
        const slippage = ONE.minus(token1AmountBn.dividedBy(exactQuote));
        priceImpact = slippage.times(100).toFixed(2);
      }

      req.logStep("Transaction prepared");
      return res.json({
        transaction: {
          cmd: cmdString,
          hash: transactionHash,
          sigs: [null],
        },
        quote: {
          expectedIn: token0AmountStr,
          expectedOut: token1AmountStr,
          slippage: slippage,
          priceImpact: priceImpact,
        },
      });
    } catch (error) {
      req.logStep("Transaction build failed");
      return res.status(500).json({
        error: "Transaction preparation failed",
        details: error.message,
      });
    }
  } catch (error) {
    req.logStep("Unhandled error");
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
