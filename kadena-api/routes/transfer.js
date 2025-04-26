const express = require("express");
const router = express.Router();
const { KADENA_NETWORK_ID } = require("../config");
const { BigNumber } = require("bignumber.js");
const { Pact } = require("@kadena/client");
const {
  getClient,
  ensureChainIdString,
  getTokenPrecision,
  reduceBalance,
} = require("../utils");

/**
 * POST /transfer
 * Generate unsigned transaction data for token transfers between accounts
 */
router.post("/", async (req, res) => {
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

    // 1. Validate required parameters
    if (!tokenAddress || !sender || !receiver || !amount || !chainId) {
      return res.status(400).json({
        error: "Missing required parameters",
        details:
          "tokenAddress, sender, receiver, amount, and chainId are required",
      });
    }

    // 2. Validate amount format
    let parsedAmount;
    try {
      parsedAmount = new BigNumber(amount);
      if (parsedAmount.isNaN() || parsedAmount.isLessThanOrEqualTo(0)) {
        return res.status(400).json({
          error: "Invalid amount",
          details: "Amount must be a positive number",
        });
      }
    } catch (error) {
      return res.status(400).json({
        error: "Invalid amount format",
        details: error.message,
      });
    }

    // 3. Validate account formats
    if (sender.startsWith("k:") && sender.length < 66) {
      return res.status(400).json({
        error: "Invalid sender format",
        details: "Sender account appears to be invalid",
      });
    }

    if (receiver.startsWith("k:") && receiver.length < 66) {
      return res.status(400).json({
        error: "Invalid receiver format",
        details: "Receiver account appears to be invalid",
      });
    }

    // 4. Get token precision
    const tokenPrecision = getTokenPrecision(tokenAddress);
    const formattedAmount = reduceBalance(parsedAmount, tokenPrecision);

    // 5. Fetch sender's guard
    const pactClient = getClient(chainId);
    const accountDetailsCmd = Pact.builder
      .execution(`(coin.details "${sender}")`)
      .setMeta({ chainId: ensureChainIdString(chainId), sender: sender })
      .setNetworkId(KADENA_NETWORK_ID)
      .createTransaction();

    const accountDetailsData = await pactClient.local(accountDetailsCmd, {
      preflight: false,
      signatureVerification: false,
    });

    if (
      accountDetailsData?.result?.status !== "success" ||
      !accountDetailsData.result.data?.guard
    ) {
      return res.status(404).json({
        error: "Account not found",
        details: "Could not retrieve sender account details from blockchain",
      });
    }

    const userGuard = accountDetailsData.result.data.guard;

    // 6. Prepare transaction metadata
    const txMeta = {
      creationTime: () => Math.round(new Date().getTime() / 1000) - 10,
      ttl,
      gasLimit,
      gasPrice,
      chainId: ensureChainIdString(chainId),
      sender,
      ...meta,
    };

    // 7. Create transaction
    let cmd;
    try {
      if (tokenAddress === "coin") {
        // Native KDA transfer
        cmd = Pact.builder
          .execution(
            Pact.modules.coin["transfer"](sender, receiver, {
              decimal: formattedAmount,
            })
          )
          .setMeta(txMeta)
          .setNetworkId(KADENA_NETWORK_ID)
          .addSigner({ pubKey: userGuard.keys[0] }, (withCap) => [
            withCap(Pact.lang.mkCap("Gas", "Pay gas", "coin.GAS", [])),
            withCap(
              Pact.lang.mkCap(
                "Transfer",
                "Capability to transfer funds",
                "coin.TRANSFER",
                [sender, receiver, { decimal: formattedAmount }]
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
          .addData({ amount: { decimal: formattedAmount } })
          .setMeta(txMeta)
          .setNetworkId(KADENA_NETWORK_ID)
          .addSigner({ pubKey: userGuard.keys[0] }, (withCap) => [
            withCap(Pact.lang.mkCap("Gas", "Pay gas", "coin.GAS", [])),
            withCap(
              Pact.lang.mkCap(
                "Transfer",
                "Capability to transfer tokens",
                `${tokenAddress}.TRANSFER`,
                [sender, receiver, { decimal: formattedAmount }]
              )
            ),
          ])
          .createTransaction();
      }

      // 8. Return the transaction and metadata
      return res.status(200).json({
        transaction: {
          cmd: JSON.stringify(cmd),
          hash: "hash_placeholder",
          sigs: [null],
        },
        metadata: {
          sender,
          receiver,
          amount: parsedAmount.toNumber(),
          tokenAddress,
          chainId,
          networkId: KADENA_NETWORK_ID,
          estimatedGas: gasLimit * gasPrice,
          formattedAmount,
        },
      });
    } catch (error) {
      console.error("Error building transfer transaction:", error);
      return res.status(500).json({
        error: "Transaction preparation failed",
        details: error.message,
      });
    }
  } catch (error) {
    console.error("Unhandled error in /transfer endpoint:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

router.use((err, req, res, next) => {
  console.error("Unhandled error in transfer routes:", err);
  res.status(500).json({
    error: "Internal server error",
    details: err.message,
  });
});

module.exports = router;
