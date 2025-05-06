const express = require("express");
const router = express.Router();
const { KADENA_NETWORK_ID } = require("../config");
const { BigNumber } = require("bignumber.js");
const { Pact } = require("@kadena/client");
const {
  getClient,
  ensureChainIdString,
  validateChainId,
  getTokenPrecision,
  reduceBalance,
  generateTransactionHash,
  creationTime,
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

    // Validate chain ID
    const chainIdValidation = validateChainId(chainId);
    if (!chainIdValidation.valid) {
      return res.status(400).json({
        error: chainIdValidation.error,
        details: chainIdValidation.details,
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
    const numericAmount = parseFloat(formattedAmount);

    // 5. Fetch sender's guard
    const pactClient = getClient(chainId);
    const accountDetailsCmd = Pact.builder
      .execution(`(coin.details "${sender}")`)
      .setMeta({
        chainId: ensureChainIdString(chainId),
        sender: sender,
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
          details: "Could not retrieve sender account details from blockchain",
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

    // 6. Prepare transaction metadata
    const txMeta = {
      creationTime: creationTime(),
      ttl: parseInt(ttl, 10),
      gasLimit: parseInt(gasLimit, 10),
      gasPrice: parseFloat(gasPrice),
      chainId: ensureChainIdString(chainId),
      sender,
      ...meta,
    };

    // 7. Create transaction
    try {
      // Define the correct capabilities format
      const capabilities = [
        {
          name: "coin.GAS",
          args: [],
        },
      ];

      // Add the appropriate transfer capability
      if (tokenAddress === "coin") {
        capabilities.push({
          name: "coin.TRANSFER",
          args: [sender, receiver, numericAmount],
        });
      } else {
        capabilities.push({
          name: `${tokenAddress}.TRANSFER`,
          args: [sender, receiver, numericAmount],
        });
      }

      // Build the transaction command
      let pactCode;
      const envData = {};

      if (tokenAddress === "coin") {
        // Native KDA transfer
        pactCode = `(coin.transfer "${sender}" "${receiver}" ${numericAmount})`;
      } else {
        // Fungible token transfer using fungible-v2 standard
        pactCode = `(${tokenAddress}.transfer "${sender}" "${receiver}" ${numericAmount})`;
      }

      // Create the transaction command
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
        nonce: `transfer:${Date.now()}:${Math.random()
          .toString(36)
          .substring(2, 15)}`,
      };

      // Generate transaction hash
      let transactionHash;
      try {
        const cmdString = JSON.stringify(pactCommand);
        transactionHash = generateTransactionHash(cmdString);
      } catch (hashError) {
        console.error("Failed to generate transaction hash:", hashError);
        return res.status(500).json({
          error: "Transaction hash generation failed",
          details:
            hashError.message || "Unable to create a valid transaction hash",
        });
      }

      // Return the transaction and metadata
      return res.status(200).json({
        transaction: {
          cmd: JSON.stringify(pactCommand),
          hash: transactionHash,
          sigs: [null], // Client will replace with signature
        },
        metadata: {
          sender,
          receiver,
          amount: numericAmount,
          tokenAddress,
          chainId,
          networkId: KADENA_NETWORK_ID,
          estimatedGas: txMeta.gasLimit * txMeta.gasPrice,
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
