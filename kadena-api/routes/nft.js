const express = require("express");
const router = express.Router();
const { KADENA_NETWORK_ID } = require("../config");
const { Pact } = require("@kadena/client");
const {
  getClient,
  ensureChainIdString,
  validateChainId,
  creationTime,
} = require("../utils");

/**
 * POST /nft/launch
 * Generates an unsigned NFT creation and minting transaction (Marmalade v2).
 */
router.post("/launch", async (req, res) => {
  try {
    const {
      account,
      guard,
      mintTo,
      uri,
      precision = 0,
      policy = "DEFAULT_COLLECTION_NON_UPDATABLE",
      collectionId,
      royalties = 0,
      royaltyRecipient = null,
      chainId = "2",
      name,
      description,
    } = req.body;

    // Validate required parameters
    const chainIdValidation = validateChainId(chainId);
    if (!chainIdValidation.valid) {
      return res.status(400).json({
        error: chainIdValidation.error,
        details: chainIdValidation.details,
      });
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
        error: "Missing required parameters",
        details: "account, guard, mintTo, uri, and collectionId are required",
      });
    }

    // Validate account formats
    if (!account.startsWith("k:") || !mintTo.startsWith("k:")) {
      return res.status(400).json({
        error: "Invalid account format",
        details: "account and mintTo must start with k:",
      });
    }

    // Validate royalty parameters
    if (policy.includes("ROYALTY")) {
      if (royalties <= 0) {
        return res.status(400).json({
          error: "Invalid royalty",
          details: "Royalties must be greater than 0 for royalty policies",
        });
      }

      if (!royaltyRecipient || !royaltyRecipient.startsWith("k:")) {
        return res.status(400).json({
          error: "Missing/Invalid royalty recipient",
          details:
            "royaltyRecipient is required and must start with k: for royalty policies",
        });
      }
    }

    // Validate guard keys
    if (guard.keys.some((k) => typeof k !== "string" || k.length !== 64)) {
      return res.status(400).json({
        error: "Invalid guard keys",
        details: "Guard keys must be 64-character hex public keys",
      });
    }

    const pactClient = getClient(chainId);

    // Fetch account's guard
    const accountDetailsCmd = Pact.builder
      .execution(`(coin.details "${account}")`)
      .setMeta({ chainId: ensureChainIdString(chainId), sender: account })
      .setNetworkId(KADENA_NETWORK_ID)
      .createTransaction();

    let accountGuard;
    try {
      const accountDetailsData = await pactClient.local(accountDetailsCmd, {
        preflight: false,
        signatureVerification: false,
      });

      if (!accountDetailsData?.result?.data?.guard) {
        throw new Error("Account not found");
      }

      accountGuard = accountDetailsData.result.data.guard;
    } catch (error) {
      return res.status(404).json({
        error: "Account not found",
        details: error.message,
      });
    }

    try {
      // Generate token ID
      let policyName =
        policy === "DEFAULT_COLLECTION_NON_UPDATABLE"
          ? "marmalade-v2.non-fungible-policy-v1"
          : policy === "DEFAULT_COLLECTION_ROYALTY_NON_UPDATABLE"
          ? "marmalade-v2.royalty-policy-v1"
          : policy;

      const tokenIdCmd = Pact.builder
        .execution(
          `(use marmalade-v2.ledger)(use marmalade-v2.util-v1)
           (create-token-id { 'precision: ${precision}, 'policies: [${policyName}], 'uri: "${uri}"} (read-keyset 'ks))`
        )
        .setMeta({
          chainId: String(chainId),
          gasLimit: 80000,
          gasPrice: 0.0000001,
        })
        .addKeyset("ks", accountGuard.pred, ...accountGuard.keys)
        .setNetworkId(KADENA_NETWORK_ID)
        .createTransaction();

      const tokenIdResult = await pactClient.dirtyRead(tokenIdCmd);

      if (!tokenIdResult?.result?.data) {
        throw new Error(
          tokenIdResult?.result?.error?.message || "Failed to generate token ID"
        );
      }

      const tokenId = tokenIdResult.result.data;

      // Get mintTo account's guard
      const mintToGuardCmd = Pact.builder
        .execution(`(coin.details "${mintTo}")`)
        .setMeta({ chainId: ensureChainIdString(chainId) })
        .setNetworkId(KADENA_NETWORK_ID)
        .createTransaction();

      const mintToGuardData = await pactClient.local(mintToGuardCmd, {
        preflight: false,
        signatureVerification: false,
      });

      if (!mintToGuardData?.result?.data?.guard) {
        return res.status(404).json({
          error: "MintTo account not found",
          details: "Could not retrieve mintTo account details",
        });
      }

      const mintToGuard = mintToGuardData.result.data.guard;

      // Construct NFT creation and minting code
      const pactCode = `(use marmalade-v2.ledger)
(use marmalade-v2.util-v1)
(create-token 
  ${JSON.stringify(tokenId)} 
  ${precision} 
  (read-msg 'uri) 
  [${policyName}] 
  (read-keyset 'ks)
) 
(mint 
  ${JSON.stringify(tokenId)} 
  (read-msg 'mintTo) 
  (read-keyset 'mintToKs) 
  1.0
)`;

      // Prepare environment data
      const envData = {
        uri,
        mintTo,
        collection_id: collectionId,
        name: name || "",
        description: description || "",
      };

      if (royalties > 0 && policy.includes("ROYALTY")) {
        envData.royaltyData = {
          royalty: royalties / 100,
          recipient: royaltyRecipient,
        };
      }

      // Define capabilities
      const capabilities = [
        {
          name: "Gas",
          args: [],
          pred: "coin.GAS",
        },
        {
          name: "Create Token",
          pred: "marmalade-v2.ledger.CREATE-TOKEN",
          args: [tokenId, precision, uri, guard],
        },
        {
          name: "Mint",
          pred: "marmalade-v2.ledger.MINT",
          args: [tokenId, mintTo, { decimal: "1.0" }],
        },
        {
          name: "Enforce Collection",
          pred: "marmalade-v2.collection-policy-v1.TOKEN-COLLECTION",
          args: [collectionId, tokenId],
        },
      ];

      if (policy.includes("ROYALTY")) {
        capabilities.push({
          name: "Enforce Royalty",
          pred: "marmalade-v2.royalty-policy-v1.ENFORCE-ROYALTY",
          args: [tokenId],
        });
      }

      // Transaction metadata
      const txMeta = {
        chainId: ensureChainIdString(chainId),
        sender: account,
        gasLimit: 10000,
        gasPrice: 0.0000001,
        ttl: 28800,
        creationTime: creationTime(),
      };

      // Create transaction
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
            pubKey: accountGuard.keys[0],
            scheme: "ED25519",
            clist: capabilities,
          },
        ],
        meta: txMeta,
        nonce: `mint:${Date.now()}:${Math.random()
          .toString(36)
          .substring(2, 15)}`,
      };

      // Return transaction data
      return res.json({
        transaction: {
          cmd: JSON.stringify(pactCommand),
          hash: "hash_placeholder",
          sigs: [null],
        },
        tokenId: tokenId,
        metadata: {
          name: name || "",
          description: description || "",
          uri: uri,
          collection: collectionId,
          royalties: royalties > 0 ? `${royalties}%` : "0%",
        },
      });
    } catch (error) {
      console.error("Error preparing NFT transaction:", error);
      return res.status(500).json({
        error: "Transaction preparation failed",
        details: error.message,
      });
    }
  } catch (error) {
    console.error("Unhandled error in /nft/launch endpoint:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

/**
 * POST /nft/collection
 * Generates an unsigned transaction to create a new Marmalade collection.
 */
router.post("/collection", async (req, res) => {
  try {
    const {
      account,
      guard,
      name,
      description = "",
      totalSupply = 0,
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

    if (
      !account ||
      !guard ||
      !guard.keys ||
      !guard.keys.length ||
      !guard.pred ||
      !name
    ) {
      return res.status(400).json({
        error: "Missing required parameters",
        details: "account, guard, and name are required",
      });
    }

    // Validate account format
    if (!account.startsWith("k:")) {
      return res.status(400).json({
        error: "Invalid account format",
        details: "account must start with k:",
      });
    }

    // Validate guard keys
    if (guard.keys.some((k) => typeof k !== "string" || k.length !== 64)) {
      return res.status(400).json({
        error: "Invalid guard keys",
        details: "Guard keys must be 64-character hex public keys",
      });
    }

    const pactClient = getClient(chainId);

    // Fetch account's guard
    const accountDetailsCmd = Pact.builder
      .execution(`(coin.details "${account}")`)
      .setMeta({ chainId: ensureChainIdString(chainId), sender: account })
      .setNetworkId(KADENA_NETWORK_ID)
      .createTransaction();

    let accountGuard;
    try {
      const accountDetailsData = await pactClient.local(accountDetailsCmd, {
        preflight: false,
        signatureVerification: false,
      });

      if (!accountDetailsData?.result?.data?.guard) {
        throw new Error("Account not found");
      }

      accountGuard = accountDetailsData.result.data.guard;
    } catch (error) {
      return res.status(404).json({
        error: "Account not found",
        details: error.message,
      });
    }

    try {
      // Create collection ID
      const collectionIdCmd = Pact.builder
        .execution(
          `(use marmalade-v2.collection-policy-v1)
           (create-collection-id ${JSON.stringify(name)} (read-keyset 'ks))`
        )
        .setMeta({
          chainId: ensureChainIdString(chainId),
          gasLimit: 15000,
          gasPrice: 0.0000001,
          creationTime: creationTime(),
          ttl: 600,
        })
        .addKeyset("ks", accountGuard.pred, ...accountGuard.keys)
        .setNetworkId(KADENA_NETWORK_ID)
        .createTransaction();

      const collectionIdResult = await pactClient.dirtyRead(collectionIdCmd);

      if (!collectionIdResult?.result?.data) {
        throw new Error(
          collectionIdResult?.result?.error?.message ||
            "Failed to generate collection ID"
        );
      }

      const collectionId = collectionIdResult.result.data;

      // Construct collection creation code
      const pactCode = `(use marmalade-v2.collection-policy-v1)
(marmalade-v2.collection-policy-v1.create-collection
  ${JSON.stringify(collectionId)}
  (read-msg 'name)
  (read-integer 'totalSupply)
  (read-keyset 'ks))`;

      // Prepare environment data
      const envData = {
        name,
        description,
        collectionId,
        totalSupply: parseInt(totalSupply),
      };

      // Define capabilities
      const capabilities = [
        {
          name: "Gas",
          args: [],
          pred: "coin.GAS",
        },
        {
          name: "Create Collection",
          pred: "marmalade-v2.collection-policy-v1.ENFORCE-COLLECTION",
          args: [collectionId],
        },
      ];

      // Transaction metadata
      const txMeta = {
        chainId: ensureChainIdString(chainId),
        sender: account,
        gasLimit: 10000,
        gasPrice: 0.0000001,
        ttl: 28800,
        creationTime: creationTime(),
      };

      // Create transaction
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
            pubKey: accountGuard.keys[0],
            scheme: "ED25519",
            clist: capabilities,
          },
        ],
        meta: txMeta,
        nonce: `collection:${Date.now()}:${Math.random()
          .toString(36)
          .substring(2, 15)}`,
      };

      // Return transaction data
      return res.json({
        transaction: {
          cmd: JSON.stringify(pactCommand),
          hash: "hash_placeholder",
          sigs: [null],
        },
        collectionId: collectionId,
      });
    } catch (error) {
      console.error("Error building collection creation transaction:", error);
      return res.status(500).json({
        error: "Transaction preparation failed",
        details: error.message,
      });
    }
  } catch (error) {
    console.error("Unhandled error in /nft/collection endpoint:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

router.use((err, req, res, next) => {
  console.error("Unhandled error in NFT routes:", err);
  res.status(500).json({
    error: "Internal server error",
    details: err.message,
  });
});

module.exports = router;
