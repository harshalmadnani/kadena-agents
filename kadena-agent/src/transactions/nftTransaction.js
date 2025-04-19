const {
  createUnsignedTransaction,
  createGasCap,
  localQuery,
  getAccountDetails,
} = require("../utils/pactUtils");
const config = require("../config");

// Constants for mainnet
const MARMALADE_NAMESPACE = "marmalade-v2";
const GAS_LIMIT = 15000;
const GAS_PRICE = 0.0000001;
const TTL = 600; // 10 minutes

/**
 * Create a token ID hash for NFT minting
 * @param {Object} params - Parameters for token ID creation
 * @param {number} params.precision - Token precision
 * @param {Object} params.guard - Token guard
 * @param {string} params.uri - Token URI
 * @param {string} params.chainId - Chain ID for the token
 * @returns {Promise<string>} - Generated token ID
 */
const createTokenId = async ({ precision, guard, uri, policies, chainId }) => {
  console.log("[createTokenId] Creating token ID with params:", {
    precision,
    guard: { ...guard },
    uri,
    policies,
    chainId,
  });

  try {
    // Construct the token specs
    const tokenSpecs = {
      precision: precision || 0,
      uri: uri,
      policies: policies || [],
    };

    // Create the code to generate a token ID
    const code = `
      (namespace "${MARMALADE_NAMESPACE}")
      (use marmalade-nft-tool)
      (create-token-id ${JSON.stringify(tokenSpecs)})
    `;

    // Make a local query to generate the token ID
    const result = await localQuery(code, chainId);
    console.log("[createTokenId] Token ID created:", result.data);
    return result.data || "";
  } catch (error) {
    console.error("[createTokenId] Error creating token ID:", error);
    throw new Error(`Failed to create token ID: ${error.message}`);
  }
};

/**
 * Create an unsigned NFT minting transaction
 * @param {Object} params - Minting parameters
 * @param {string} params.uri - NFT URI/metadata
 * @param {string} params.account - Account minting the NFT
 * @param {string} params.mintTo - Recipient of the minted NFT
 * @param {Object} params.guard - NFT guard (access control)
 * @param {string} params.collectionId - Collection ID if minting to a collection
 * @param {Array} params.royalties - Royalty recipients and percentages
 * @param {string} params.chainId - Chain ID for the transaction
 * @returns {Promise<Object>} - Unsigned transaction
 */
const createNftMintTransaction = async ({
  uri,
  account,
  mintTo,
  guard,
  collectionId,
  royalties = [],
  chainId = config.network.chainId,
}) => {
  console.log("[createNftMintTransaction] Starting NFT mint with params:", {
    uri,
    account,
    mintTo,
    guard: { ...guard },
    collectionId,
    royalties,
    chainId,
  });

  try {
    // Get account details for the minting account
    console.log("[createNftMintTransaction] Getting account details");
    const accountDetails = await getAccountDetails(account, chainId);

    // Use the account guard if no guard provided
    guard = guard || {
      pred: accountDetails.guard?.pred || "keys-all",
      keys: accountDetails.guard?.keys || [],
    };

    // Set the recipient to the account if not provided
    mintTo = mintTo || account;

    // Prepare royalty information
    const royaltyRecipients = royalties.map((r) => ({
      account: r.account,
      percentage: r.percentage || 0.05, // 5% default
    }));

    // Create the NFT minting code
    console.log("[createNftMintTransaction] Creating minting code");
    const mintingCode = `
      (namespace "${MARMALADE_NAMESPACE}")
      (use marmalade-nft-tool)
      
      (let*
        (
          (account "${account}")
          (recipient "${mintTo}")
          (uri ${JSON.stringify(uri)})
          (guard ${JSON.stringify(guard)})
          ${collectionId ? `(collection-id "${collectionId}")` : ""}
          (royalty-spec [${royaltyRecipients
            .map(
              (r) =>
                `{ "account": "${r.account}", "percentage": ${r.percentage} }`
            )
            .join(", ")}])
        )
        (marmalade-nft-tool.mint-nft
          {
            "account": account,
            "recipient": recipient,
            "uri": uri,
            "guard": guard,
            ${collectionId ? `"collection-id": collection-id,` : ""}
            "royalty-spec": royalty-spec
          }
        )
      )
    `;
    console.log("[createNftMintTransaction] Minting code created");

    // Create capabilities for gas and minting
    const capabilities = [
      createGasCap(account),
      {
        name: "coin.GAS",
        args: [account],
      },
      {
        name: `${MARMALADE_NAMESPACE}.ledger.MINT`,
        args: [account, recipient, uri, guard],
      },
      {
        name: `${MARMALADE_NAMESPACE}.ledger.CREATE-TOKEN`,
        args: [account, uri, guard],
      },
    ];

    // Add collection capability if needed
    if (collectionId) {
      capabilities.push({
        name: `${MARMALADE_NAMESPACE}.collection-policy-v1.TOKEN-COLLECTION`,
        args: [collectionId],
      });
    }

    // Create the transaction
    console.log(
      "[createNftMintTransaction] Creating transaction on chain:",
      chainId
    );
    const { transaction, cmd } = createUnsignedTransaction(
      mintingCode,
      capabilities,
      chainId,
      {},
      GAS_LIMIT,
      GAS_PRICE,
      account
    );
    console.log("[createNftMintTransaction] Transaction created successfully");

    return {
      transaction,
      cmd,
      chainId,
    };
  } catch (error) {
    console.error(
      "[createNftMintTransaction] Error creating NFT mint transaction:",
      error
    );
    throw new Error(
      `Failed to create NFT minting transaction: ${error.message}`
    );
  }
};

module.exports = {
  createTokenId,
  createNftMintTransaction,
};
