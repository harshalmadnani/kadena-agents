const express = require("express");
const router = express.Router();
const {
  VERSION,
  KADENA_NETWORK_ID,
  KADENA_API_HOST,
  KADDEX_NAMESPACE,
} = require("../config");
const { BigNumber } = require("bignumber.js");
const { Pact } = require("@kadena/client");
const {
  getClient,
  ensureChainIdString,
  validateChainId,
  getTokenPrecision,
  reduceBalance,
} = require("../utils");

/**
 * GET /health
 * Health check endpoint
 */
router.get("/", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: VERSION,
    network: {
      networkId: KADENA_NETWORK_ID,
      apiHost: KADENA_API_HOST,
    },
  });
});

/**
 * POST /quote
 * Calculates swap estimates based on reserve data.
 */
router.post("/quote", async (req, res) => {
  try {
    const {
      tokenInAddress,
      tokenOutAddress,
      amountIn,
      amountOut,
      chainId = "2",
    } = req.body;

    // Validate required parameters
    const chainIdValidation = validateChainId(chainId);
    if (!chainIdValidation.valid) {
      return res.status(400).json({
        error: chainIdValidation.error,
        details: chainIdValidation.details,
      });
    }

    if (!tokenInAddress || !tokenOutAddress) {
      return res.status(400).json({
        error: "Missing required parameters",
        details: "tokenInAddress and tokenOutAddress are required",
      });
    }

    if ((!amountIn && !amountOut) || (amountIn && amountOut)) {
      return res.status(400).json({
        error: "Invalid amount parameters",
        details: "Provide either amountIn or amountOut, not both",
      });
    }

    // Parse amount
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

    // 1. Fetch reserves
    const reservesCmd = Pact.builder
      .execution(
        `(use ${KADDEX_NAMESPACE}.exchange) 
         (let* ((p (get-pair ${tokenInAddress} ${tokenOutAddress})) 
                (reserveA (reserve-for p ${tokenInAddress})) 
                (reserveB (reserve-for p ${tokenOutAddress}))) 
          [reserveA reserveB])`
      )
      .setMeta({ chainId: ensureChainIdString(chainId) })
      .setNetworkId(KADENA_NETWORK_ID)
      .createTransaction();

    const reservesData = await pactClient.local(reservesCmd, {
      preflight: false,
      signatureVerification: false,
    });

    // Validate reserve data
    if (
      reservesData?.result?.status !== "success" ||
      !Array.isArray(reservesData.result.data) ||
      reservesData.result.data.length < 2
    ) {
      console.error(
        "Failed to get valid reserves:",
        reservesData?.result?.error || "Unknown error"
      );
      return res.status(404).json({
        error: "Liquidity pool not found",
        details: "Could not find a valid trading pair for the provided tokens",
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

    // Calculate quote
    let calculatedAmountBn;
    let priceImpact = "0.00";

    try {
      if (isExactIn) {
        // Calculate amountOut based on input amount
        const amountInWithFee = amount.times(ONE.minus(FEE));
        const numerator = amountInWithFee.times(reserveOut);
        const denominator = reserveIn.plus(amountInWithFee);

        if (denominator.isLessThanOrEqualTo(0)) {
          return res.status(400).json({
            error: "Invalid calculation",
            details: "Calculation resulted in invalid denominator",
          });
        }

        calculatedAmountBn = numerator.dividedBy(denominator);

        // Calculate price impact
        const midPrice = reserveOut.dividedBy(reserveIn);
        const exactQuote = amount.times(midPrice);
        if (exactQuote.isGreaterThan(0)) {
          const slippage = ONE.minus(calculatedAmountBn.dividedBy(exactQuote));
          priceImpact = slippage.times(100).toFixed(2);
        }

        return res.json({
          amountOut: reduceBalance(calculatedAmountBn, tokenOutPrecision),
          priceImpact: priceImpact,
        });
      } else {
        // Calculate amountIn based on exact output
        const numerator = reserveIn.times(amount);
        const denominator = reserveOut.minus(amount).times(ONE.minus(FEE));

        if (denominator.isLessThanOrEqualTo(0)) {
          return res.status(400).json({
            error: "Insufficient liquidity",
            details: "Output amount too large for this pool",
          });
        }

        calculatedAmountBn = numerator.dividedBy(denominator);

        // Calculate price impact
        const midPrice = reserveIn.dividedBy(reserveOut);
        const exactQuote = amount.times(midPrice);
        if (exactQuote.isGreaterThan(0)) {
          const slippage = calculatedAmountBn.dividedBy(exactQuote).minus(ONE);
          priceImpact = slippage.times(100).toFixed(2);
        }

        return res.json({
          amountIn: reduceBalance(calculatedAmountBn, tokenInPrecision),
          priceImpact: priceImpact,
        });
      }
    } catch (error) {
      console.error("Error calculating quote:", error);
      return res.status(500).json({
        error: "Quote calculation failed",
        details: error.message,
      });
    }
  } catch (error) {
    console.error("Unhandled error in /quote endpoint:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

module.exports = router;
