# Kadena API Server

A REST API server for interacting with Kadena blockchain, providing endpoints for token swaps, NFT minting, and collection management.

## Features

- ✅ Token swapping with EchoDEX/Kaddex
- ✅ Price quotes for token pairs
- ✅ NFT creation and minting with Marmalade v2
- ✅ Collection creation for NFTs

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
  "chainId": "2"
}
```

OR

```json
{
  "tokenInAddress": "coin",
  "tokenOutAddress": "kaddex.kdx",
  "amountOut": "5.0",
  "chainId": "2"
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
  "account": "k:abcdef1234567890...",
  "slippage": "0.005",
  "chainId": "2"
}
```

OR

```json
{
  "tokenInAddress": "coin",
  "tokenOutAddress": "kaddex.kdx",
  "amountOut": "5.0",
  "account": "k:abcdef1234567890...",
  "slippage": "0.005",
  "chainId": "2"
}
```

**Response**:

```json
{
  "unsignedTransaction": {
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
  "account": "k:abcdef1234567890...",
  "guard": {
    "keys": ["abcdef1234567890..."],
    "pred": "keys-all"
  },
  "mintTo": "k:abcdef1234567890...",
  "uri": "ipfs://bafkreib...",
  "precision": 0,
  "policy": "DEFAULT_COLLECTION_NON_UPDATABLE",
  "collectionId": "c:abcdef1234...:module",
  "name": "My NFT",
  "description": "An example NFT",
  "chainId": "2"
}
```

For royalty-enabled NFTs:

```json
{
  "account": "k:abcdef1234567890...",
  "guard": {
    "keys": ["abcdef1234567890..."],
    "pred": "keys-all"
  },
  "mintTo": "k:abcdef1234567890...",
  "uri": "ipfs://bafkreib...",
  "precision": 0,
  "policy": "DEFAULT_COLLECTION_ROYALTY_NON_UPDATABLE",
  "collectionId": "c:abcdef1234...:module",
  "royalties": 2.5,
  "royaltyRecipient": "k:abcdef1234567890...",
  "name": "My NFT",
  "description": "An example NFT with royalties",
  "chainId": "2"
}
```

**Response**:

```json
{
  "unsignedTransaction": {
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
  "account": "k:abcdef1234567890...",
  "guard": {
    "keys": ["abcdef1234567890..."],
    "pred": "keys-all"
  },
  "name": "My Collection",
  "description": "An example NFT collection",
  "totalSupply": 10000,
  "chainId": "2"
}
```

**Response**:

```json
{
  "unsignedTransaction": {
    "cmd": "...",
    "hash": "...",
    "sigs": [...],
    "metadata": {...}
  }
}
```

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
      chainId: "2",
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
    "chainId": "2"
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
