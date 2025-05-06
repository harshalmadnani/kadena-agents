import { createClient, addSignatures } from "@kadena/client";
import magic from "./magic";
import { chainId, networkId, rpcUrl } from "./magic";
import { TransactionResponse } from "./api";

// Add proper type declaration for Magic Kadena extension methods
declare module "magic-sdk" {
  interface KadenaExtension {
    // Update the method signatures based on the actual Magic SDK implementation
    getUserInfo(): Promise<{ publicKey: string; accountName?: string }>;
    signTransaction(hash: string): Promise<any>;
  }

  // Add proper type declarations for UserModule
  interface UserModule {
    getMetadata(): Promise<{ publicAddress?: string; email?: string }>;
  }
}

export interface SignAndSubmitResult {
  requestKey: string;
  hash: string;
  status: "success" | "failure";
  errorMessage?: string;
}

// Create a Kadena client
const client = createClient(rpcUrl);

const walletService = {
  /**
   * Signs a transaction using Magic wallet and submits it to the Kadena blockchain
   * @param txResponse The transaction response from the API
   * @returns The result of the transaction submission
   */
  signAndSubmitTransaction: async (
    txResponse: TransactionResponse
  ): Promise<SignAndSubmitResult> => {
    try {
      // Log the entire transaction response for debugging
      console.log("Original transaction response:", txResponse);

      // Handle the transaction command which may be a string or object
      let txCmd;
      if (typeof txResponse.transaction.cmd === "string") {
        try {
          // Try to parse it as JSON
          txCmd = txResponse.transaction.cmd;
        } catch (parseError) {
          console.error("Error parsing transaction command:", parseError);
          // If it's not valid JSON but a string, use it directly
          txCmd = txResponse.transaction.cmd;
        }
      } else {
        // If it's already an object, use it directly
        txCmd = txResponse.transaction.cmd;
      }

      console.log("Processed transaction command:", txCmd);

      // Use the hash from the API response directly - no need to generate it locally now
      const transactionHash = txResponse.transaction.hash;
      console.log("Transaction hash:", transactionHash);

      // Create a transaction object that matches the format expected by Kadena client
      const transaction = {
        cmd: txCmd,
        hash: transactionHash,
        sigs: [],
      };

      console.log("Transaction to sign:", transaction);

      try {
        // Access the Magic wallet properly
        console.log("Magic instance:", magic);

        // Debug available methods
        console.log(
          "Magic methods:",
          Object.getOwnPropertyNames(Object.getPrototypeOf(magic)),
          "Extensions:",
          Object.keys((magic as any).rpcProvider)
        );

        let publicKey;

        // If we still don't have the public key, try alternative methods
        if (!publicKey) {
          // Try to access the Kadena extension directly
          // Different versions of Magic SDK might have different method names
          try {
            if (
              (magic as any).kadena &&
              typeof (magic as any).kadena.getUserInfo === "function"
            ) {
              const kadenaInfo = await (magic as any).kadena.getUserInfo();
              publicKey = kadenaInfo.publicKey;
              console.log("Kadena user info:", kadenaInfo);
            }
          } catch (kadenaInfoError) {
            console.warn("Could not get Kadena user info:", kadenaInfoError);
          }
        }

        console.log("Using public key for signing:", publicKey);

        // Sign the transaction using Magic wallet
        // Magic's API might require accessing the kadena extension differently
        let signature;
        try {
          signature = await (magic as any).kadena.signTransaction(
            transaction.hash
          );
          console.log("Signature:", signature);
        } catch (signError) {
          console.error("Error in direct signing:", signError);

          // Alternative approach through different method names
          try {
            signature = await (magic as any).kadena.sign({
              network: networkId,
              chainId: chainId,
              payload: {
                hash: transaction.hash,
              },
            });
          } catch (altSignError) {
            console.error("Alternative signing also failed:", altSignError);
            throw new Error(
              "Could not sign transaction with any available method"
            );
          }
        }

        console.log("Signature result type:", typeof signature);
        console.log("Signature result:", signature);

        // Format the signature properly based on the response format from Magic
        let sigValue;

        // Handle different signature formats
        if (typeof signature === "string") {
          // If it's a string that looks like "[object Object]", it's a string representation of an object
          if (signature === "[object Object]") {
            throw new Error("Received invalid signature from wallet");
          }
          // Otherwise use the string value directly
          sigValue = signature;
        } else if (signature && typeof signature === "object") {
          // If it has a sig property, use that
          if (signature.sig) {
            sigValue = signature.sig;
          }
          // Or if it has a signature property
          else if (signature.signature) {
            sigValue = signature.signature;
          }
          // Last resort: try to stringify the object if it has neither property
          else {
            try {
              sigValue = JSON.stringify(signature);
            } catch (stringifyError) {
              console.error("Error stringifying signature:", stringifyError);
              throw new Error("Could not format signature for transaction");
            }
          }
        } else {
          throw new Error("Received invalid signature type from wallet");
        }

        // Create properly formatted signature
        const formattedSignature = {
          sig: sigValue,
          pubKey: signature?.pubKey || publicKey,
        };

        console.log("Formatted signature:", formattedSignature);

        // Add signature to the transaction using the addSignatures helper
        const signedTx = addSignatures(transaction, signature);

        console.log("Signed transaction:", signedTx);

        // Ensure the cmd is properly stringified for submission if it's not already a string
        const submissionTx = {
          ...signedTx,
          cmd:
            typeof signedTx.cmd === "string"
              ? signedTx.cmd
              : JSON.stringify(signedTx.cmd),
        };

        console.log("Transaction for submission:", submissionTx);

        // Submit the signed transaction to the blockchain
        const transactionDescriptor = await client.submit(submissionTx);

        console.log("Transaction descriptor:", transactionDescriptor);

        // Wait for the transaction to be processed
        const response = await client.listen(transactionDescriptor);

        console.log("Transaction response:", response);

        if (response.result.status === "success") {
          return {
            requestKey: transactionDescriptor.requestKey,
            hash: transaction.hash,
            status: "success",
          };
        } else {
          // Handle error response - convert complex error object to string
          let errorMessage = "Transaction failed";

          if (response.result.error) {
            // If it's already a string, use it directly
            if (typeof response.result.error === "string") {
              errorMessage = response.result.error;
            } else {
              // If it's an object, stringify it
              try {
                errorMessage = JSON.stringify(response.result.error);
              } catch (e) {
                // Fallback if JSON stringify fails
                errorMessage = `Transaction failed: ${
                  response.result.error.message || "Unknown error"
                }`;
              }
            }
          }

          return {
            requestKey: transactionDescriptor.requestKey,
            hash: transaction.hash,
            status: "failure",
            errorMessage,
          };
        }
      } catch (error: unknown) {
        console.error("Error in signature process:", error);
        throw new Error(
          `Failed to sign transaction: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    } catch (error: unknown) {
      console.error("Error in transaction preparation:", error);
      throw new Error(
        `Failed to prepare transaction: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  },

  /**
   * Checks the status of a submitted transaction
   * @param requestKey The request key returned from transaction submission
   * @returns Transaction status details
   */
  checkTransactionStatus: async (requestKey: string): Promise<any> => {
    try {
      // Query the blockchain for transaction status
      const result = await client.listen({
        requestKey: requestKey,
        networkId,
        chainId,
      });

      return result;
    } catch (error) {
      console.error("Error checking transaction status:", error);
      throw error;
    }
  },
};

export default walletService;
