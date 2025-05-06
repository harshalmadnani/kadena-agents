import { Magic } from "magic-sdk";
import { KadenaExtension } from "@magic-ext/kadena";

// Kadena blockchain configuration
export const chainId = "2";
export const networkId = "mainnet01";
export const rpcUrl = `https://api.chainweb.com/chainweb/0.0/${networkId}/chain/${chainId}/pact`;

// Initialize Magic instance with Kadena extension
const magic = new Magic(process.env.REACT_APP_MAGIC_API_KEY || "", {
  extensions: [
    new KadenaExtension({
      rpcUrl,
      chainId,
      networkId,
      createAccountsOnChain: true,
    }),
  ],
});

export default magic;
