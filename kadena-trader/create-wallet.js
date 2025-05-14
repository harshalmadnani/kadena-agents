import { kadenaKeyPairsFromRandom } from "@kadena/hd-wallet";
import { sign } from "@kadena/cryptography-utils";
import { Pact } from "@kadena/client";
import { createClient } from "@kadena/client";
import pkg from "@kadena/types";
const { IKeyPair } = pkg;

// Generate keypairs
const keyPairs = kadenaKeyPairsFromRandom(1)[0];

const keyPair = {
  publicKey: keyPairs.publicKey,
  secretKey: keyPairs.secretKey,
};

const publicKey = keyPairs.publicKey;

// Create Kadena client
export const chainId = "2";
export const networkId = "mainnet01";
export const rpcUrl = `https://api.chainweb.com/chainweb/0.0/${networkId}/chain/${chainId}/pact`;

const client = createClient(rpcUrl);

// Create account transaction
const createAccountTransaction = Pact.builder
  .execution(`(coin.create-account "k:${publicKey}" (read-keyset "user-ks"))`)
  .addData({
    "user-ks": {
      keys: [publicKey],
      pred: "keys-all",
    },
  })
  .setMeta({
    chainId: chainId,
    networkId: networkId,
    gasLimit: 100000,
    gasPrice: 0.0000001,
    sender: `k:${publicKey}`,
    ttl: 7200,
  })
  .createTransaction();

// Sign and send transaction
const cmd = JSON.stringify(createAccountTransaction);
const signature = sign(cmd, keyPair);

// Add signature to transaction
const signedTx = {
  ...createAccountTransaction,
  sigs: [
    {
      sig: signature["sig"],
      pubKey: publicKey,
    },
  ],
};

// Send transaction
client
  .submit(signedTx)
  .then((response) => {
    console.log("Transaction submitted:", response);
  })
  .catch((error) => {
    console.error("Error submitting transaction:", error);
  });

console.log("Public Key:", publicKey);
