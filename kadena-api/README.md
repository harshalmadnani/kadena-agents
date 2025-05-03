# Kadena API Server

A RESTful API service for interacting with the Kadena blockchain, supporting token transfers, swaps, and NFT operations.

## Features

- Token transfers with proper transaction hash generation
- NFT creation and minting (Marmalade V2 compatible)
- DEX swap operations
- Secure API key authentication
- Robust error handling

## Setup

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file in the root directory with the following variables:

```
PORT=3000
KADENA_NETWORK_ID=mainnet01
KADENA_API_HOST=https://api.chainweb.com
API_KEY=your_secure_api_key
```

### Running the Server

```bash
npm start
```

## Authentication

All API endpoints (except `/health`) require an API key for authentication:

- Include the API key in the `x-api-key` header of your requests
- If no API key is provided, the API will return a 401 Unauthorized response
- If an invalid API key is provided, the API will return a 403 Forbidden response

## Transaction Hash Generation

The API uses the official Kadena cryptography utilities for transaction hash generation:

- Hashes are generated using the `hash` function from `@kadena/cryptography-utils`
- All transaction commands are stringified before hashing for consistent results
- The hash is returned in the response as the `hash` field in the transaction object

## API Endpoints

### Health Check

```
GET /health
```

No authentication required. Returns basic server information and status.

### Token Transfer

```
POST /transfer
```

Generates an unsigned token transfer transaction.

**Request Body:**

```json
{
  "tokenAddress": "coin",
  "sender": "k:account-public-key",
  "receiver": "k:recipient-public-key",
  "amount": 10.0,
  "chainId": "2"
}
```

### NFT Collection Creation

```
POST /nft/collection
```

Creates a new NFT collection using Marmalade V2.

**Request Body:**

```json
{
  "account": "k:creator-public-key",
  "guard": {
    "keys": ["creator-public-key"],
    "pred": "keys-all"
  },
  "name": "My Collection",
  "description": "An example NFT collection",
  "totalSupply": 10000,
  "chainId": "2"
}
```

### NFT Launch (Create and Mint)

```
POST /nft/launch
```

Creates and mints a new NFT associated with a collection.

**Request Body:**

```json
{
  "account": "k:creator-public-key",
  "guard": {
    "keys": ["creator-public-key"],
    "pred": "keys-all"
  },
  "mintTo": "k:recipient-public-key",
  "uri": "ipfs://QmHash...",
  "collectionId": "collection:NsqEe1r2KRAPjOMKoBgCULocLYtu5Ornu7hNn3NCPhI",
  "chainId": "2",
  "name": "My NFT",
  "description": "An example NFT"
}
```

### Token Swap

```
POST /swap
```

Generates an unsigned swap transaction for DEX operations.

**Request Body:**

```json
{
  "tokenInAddress": "coin",
  "tokenOutAddress": "kaddex.kdx",
  "amountIn": 10.0,
  "account": "k:account-public-key",
  "slippage": "0.005",
  "chainId": "2"
}
```

## Response Format

All successful responses follow this format:

```json
{
  "transaction": {
    "cmd": "string", // The JSON stringified transaction command
    "hash": "string", // The cryptographic hash of the transaction
    "sigs": [null] // The placeholder for signatures
  },
  "metadata": {
    /* Additional contextual information */
  }
}
```

Error responses follow this format:

```json
{
  "error": "Error type or code",
  "details": "Detailed error message"
}
```

## Client Integration

When integrating with a client application, you should:

1. Request the transaction from the API using appropriate parameters
2. Sign the transaction using a wallet or signing service
3. Submit the signed transaction to the Kadena blockchain

The API generates a transaction hash that can be used for signing, but client wallets may also compute their own hash from the `cmd` string.
