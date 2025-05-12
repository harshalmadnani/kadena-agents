import { kadenaKeyPairsFromRandom } from "@kadena/hd-wallet";
import {
  KMSClient,
  ImportKeyMaterialCommand,
  GetParametersForImportCommand,
} from "@aws-sdk/client-kms";
import dotenv from "dotenv";
import crypto from "crypto";

const MAINNET = {
  networkId: "mainnet01",
  chainId: "2",
  accountPrefix: "k:",
};

const keyPairs = kadenaKeyPairsFromRandom(1);
const { publicKey, secretKey } = keyPairs[0];
const account = `${MAINNET.accountPrefix}${publicKey}`;

console.log("Generated Kadena Wallet (MAINNET):");
console.log("Network ID:", MAINNET.networkId);
console.log("Chain ID:", MAINNET.chainId);
console.log("Public Key:", publicKey);
console.log("Private Key:", secretKey);
console.log("Account:", account);
