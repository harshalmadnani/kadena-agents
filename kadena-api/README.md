# Kadena API Server

A REST API server for interacting with Kadena blockchain, providing endpoints for token swaps, NFT minting, and collection management.

## Features

- ✅ Token swapping with EchoDEX/Kaddex
- ✅ Price quotes for token pairs
- ✅ NFT creation and minting with Marmalade v2
- ✅ Collection creation for NFTs
- ✅ Support for all Kadena chains (0-19)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd kadena-api

# Install dependencies
npm install

# Start the server
npm start
```

## Configuration

The server configuration is defined in the top section of the `server.js` file:

```javascript
const KADENA_NETWORK_ID = "mainnet01"; // Or 'testnet04'
const KADENA_API_HOST = `https://api.chainweb.com`; // Or `https://api.testnet.chainweb.com`
const KADDEX_NAMESPACE = "kaddex"; // EchoDEX namespace (usually 'kaddex')
const NETWORK_VERSION = "0.0";
```

For production deployment, these values should be moved to environment variables.

## Chain Support

The API supports all Kadena chains (0-19). All endpoints that accept a `chainId` parameter will:

- Accept any chain ID from 0 to 19
- Convert numeric chain IDs to strings automatically
- Default to chain 2 if no chainId is provided
- Validate that chain IDs are within the valid range (0-19)

## API Endpoints

### GET Health Check

```
GET /health
```

Returns the health status of the API service.

**Response**:

```json
{
  "status": "healthy",
  "timestamp": "2023-08-01T12:00:00Z",
  "version": "1.0.0"
}
```

### GET Token Quote

```
POST /quote
```

Gets price quotes for swapping tokens.

**Request Body**:

```json
{
  "tokenInAddress": "coin",
  "tokenOutAddress": "kaddex.kdx",
  "amountIn": "10.0",
  "chainId": "0" // Chain ID (0-19), defaults to "2" if not specified
}
```

OR

```json
{
  "tokenInAddress": "coin",
  "tokenOutAddress": "kaddex.kdx",
  "amountOut": "5.0",
  "chainId": "0" // Chain ID (0-19), defaults to "2" if not specified
}
```

**Response (for amountIn)**:

```json
{
  "amountOut": "42.123456789012"
}
```

**Response (for amountOut)**:

```json
{
  "amountIn": "2.123456789012"
}
```

### Create Swap Transaction

```
POST /swap
```

Creates an unsigned transaction for swapping tokens.

**Request Body**:

```json
{
  "tokenInAddress": "coin",
  "tokenOutAddress": "kaddex.kdx",
  "amountIn": "10.0",
  "account": "k:d61e615aec4e895c0006f7f2e56b37d36f18f35cce28286ad33e5bc52ded867a",
  "slippage": "0.005",
  "chainId": "0" // Chain ID (0-19), defaults to "2" if not specified
}
```

OR

```json
{
  "tokenInAddress": "coin",
  "tokenOutAddress": "kaddex.kdx",
  "amountOut": "5.0",
  "account": "k:d61e615aec4e895c0006f7f2e56b37d36f18f35cce28286ad33e5bc52ded867a",
  "slippage": "0.005",
  "chainId": "0" // Chain ID (0-19), defaults to "2" if not specified
}
```

**Response**:

```json
{
  "transaction": {
    "cmd": "...",
    "hash": "...",
    "sigs": [...],
    "metadata": {...}
  }
}
```

### Launch NFT

```
POST /launch-nft
```

Creates an unsigned transaction for minting an NFT.

**Request Body**:

```json
{
  "account": "k:d61e615aec4e895c0006f7f2e56b37d36f18f35cce28286ad33e5bc52ded867a",
  "guard": {
    "keys": [
      "d61e615aec4e895c0006f7f2e56b37d36f18f35cce28286ad33e5bc52ded867a"
    ],
    "pred": "keys-all"
  },
  "mintTo": "k:3ca4ce859657c96a86a960787f75ce27bb5e5476f0b596957c7ca9f8d6d50811",
  "uri": "ipfs://bafkreib...",
  "precision": 0,
  "policy": "DEFAULT_COLLECTION_NON_UPDATABLE",
  "collectionId": "c:abcdef1234...:module",
  "name": "My NFT",
  "description": "An example NFT",
  "chainId": "0"
}
```

For royalty-enabled NFTs:

```json
{
  "account": "k:d61e615aec4e895c0006f7f2e56b37d36f18f35cce28286ad33e5bc52ded867a",
  "guard": {
    "keys": [
      "d61e615aec4e895c0006f7f2e56b37d36f18f35cce28286ad33e5bc52ded867a"
    ],
    "pred": "keys-all"
  },
  "mintTo": "k:3ca4ce859657c96a86a960787f75ce27bb5e5476f0b596957c7ca9f8d6d50811",
  "uri": "ipfs://bafkreib...",
  "precision": 0,
  "policy": "DEFAULT_COLLECTION_ROYALTY_NON_UPDATABLE",
  "collectionId": "c:abcdef1234...:module",
  "royalties": 2.5,
  "royaltyRecipient": "k:d61e615aec4e895c0006f7f2e56b37d36f18f35cce28286ad33e5bc52ded867a",
  "name": "My NFT",
  "description": "An example NFT with royalties",
  "chainId": "0"
}
```

**Response**:

```json
{
  "transaction": {
    "cmd": "...",
    "hash": "...",
    "sigs": [...],
    "metadata": {...}
  },
  "tokenId": "t:abcdef1234567890..."
}
```

### Create Collection

```
POST /create-collection
```

Creates an unsigned transaction for creating a new NFT collection.

**Request Body**:

```json
{
  "account": "k:d61e615aec4e895c0006f7f2e56b37d36f18f35cce28286ad33e5bc52ded867a",
  "guard": {
    "keys": [
      "d61e615aec4e895c0006f7f2e56b37d36f18f35cce28286ad33e5bc52ded867a"
    ],
    "pred": "keys-all"
  },
  "name": "My Collection",
  "description": "An example NFT collection",
  "totalSupply": 10000,
  "chainId": "0" // Chain ID (0-19), defaults to "2" if not specified
}
```

**Response**:

```json
{
  "transaction": {
    "cmd": "...",
    "hash": "...",
    "sigs": [...],
    "metadata": {...}
  }
}
```

### Transfer Endpoint

The `/transfer` endpoint generates unsigned transaction data for token transfers between accounts.

### Request

```http
POST /transfer
Content-Type: application/json

{
  "tokenAddress": "coin", // or fungible token address
  "sender": "k:d61e615aec4e895c0006f7f2e56b37d36f18f35cce28286ad33e5bc52ded867a", // sender's account
  "receiver": "k:3ca4ce859657c96a86a960787f75ce27bb5e5476f0b596957c7ca9f8d6d50811", // receiver's account
  "amount": "10.0", // amount to transfer
  "chainId": "0", // chain ID (0-19), defaults to "2" if not specified
  "meta": {}, // optional metadata
  "gasLimit": 2500, // optional gas limit
  "gasPrice": 0.00000001, // optional gas price
  "ttl": 600 // optional time-to-live in seconds
}
```

### Response

```json
{
  "transaction": {
    "cmd": "...",
    "hash": "...",
    "sigs": []
  },
  "metadata": {
    "sender": "k:d61e615aec4e895c0006f7f2e56b37d36f18f35cce28286ad33e5bc52ded867a",
    "receiver": "k:3ca4ce859657c96a86a960787f75ce27bb5e5476f0b596957c7ca9f8d6d50811",
    "amount": 10.0,
    "tokenAddress": "coin",
    "chainId": "0",
    "networkId": "mainnet01"
  }
}
```

### Error Responses

- `400 Bad Request`: Missing required parameters or invalid amount
- `500 Internal Server Error`: Failed to generate transfer transaction

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200 OK`: Request succeeded
- `400 Bad Request`: Invalid input parameters
- `404 Not Found`: Requested resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server-side error

Error responses include a JSON object with an `error` field and optional `details`:

```json
{
  "error": "Invalid input parameters",
  "details": "amountIn must be greater than 0"
}
```

## Examples

### JavaScript Example (Node.js)

```javascript
const axios = require("axios");

async function getQuote() {
  try {
    const response = await axios.post("http://localhost:3000/quote", {
      tokenInAddress: "coin",
      tokenOutAddress: "kaddex.kdx",
      amountIn: "10.0",
      chainId: "0", // Chain ID (0-19), defaults to "2" if not specified
    });

    console.log("Expected output amount:", response.data.amountOut);
  } catch (error) {
    console.error(
      "Error fetching quote:",
      error.response?.data || error.message
    );
  }
}

getQuote();
```

### cURL Example

```bash
curl -X POST http://localhost:3000/quote \
  -H "Content-Type: application/json" \
  -d '{
    "tokenInAddress": "coin",
    "tokenOutAddress": "kaddex.kdx",
    "amountIn": "10.0",
    "chainId": "0" # Chain ID (0-19), defaults to "2" if not specified
  }'
```

## Production Deployment

For production deployment, consider the following:

1. Use environment variables for configuration
2. Set up proper logging
3. Implement rate limiting
4. Add security headers
5. Use HTTPS
6. Set up monitoring and alerts
7. Use a process manager like PM2

### Example with PM2

```bash
# Install PM2
npm install -g pm2

# Start the server with PM2
pm2 start server.js --name kadena-api

# View logs
pm2 logs kadena-api

# Monitor the application
pm2 monit
```

## Testing

```bash
# Run tests
npm test
```

## License

MIT
