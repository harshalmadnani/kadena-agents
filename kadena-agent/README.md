# Kadena AI Agent

An AI agent for interacting with the Kadena blockchain, capable of generating unsigned transactions based on natural language queries. The agent can handle token swapping and NFT minting operations.

## Features

- **Natural Language Processing**: Converts user queries into blockchain transactions
- **Token Swapping**: Generate unsigned swap transactions between any two tokens
- **NFT Minting**: Create unsigned transactions to mint NFTs in a collection
- **Explanation**: Provides human-readable explanations of the transactions
- **Interactive Workflow**: Asks follow-up questions for missing parameters
- **Kadindexer Integration**: Uses Kadindexer GraphQL API for blockchain data queries

## Setup

### Prerequisites

- Node.js (>= 14.x)
- npm or yarn
- An OpenAI API key
- A Kadindexer API key

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd kadena-agent
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables by creating a `.env` file:

```
# Network configuration
NETWORK_ID=mainnet01
CHAIN_ID=2
API_URL=https://api.mainnet.kadindexer.io/v0

# OpenAI configuration
OPENAI_API_KEY=your-api-key-here
OPENAI_MODEL=gpt-4-turbo-preview

# Server configuration
PORT=3000

# Kadindexer configuration
KADINDEXER_API_KEY=your-api-key-here
```

4. Start the server

```bash
npm start
```

## Usage

### API Endpoints

#### Process a Query

```
POST /api/query
```

Request body:

```json
{
  "query": "Swap 10 KDA for KDX using account k:abc123",
  "defaultParams": {
    "account": "k:example_account",
    "chainId": "1",
    "publicKey": "example-public-key"
  }
}
```

Response:

```json
{
  "success": true,
  "intent": "SWAP_TOKENS",
  "transaction": {
    "transaction": { ... },
    "cmd": { ... }
  },
  "explanation": "This transaction will swap 10 KDA for approximately 9.8 KDX with a 1% slippage tolerance.",
  "parameters": { ... },
  "conversationId": "conversation-1623847290123"
}
```

#### Handle Missing Parameters

If the user's query is missing required parameters, the agent will respond with follow-up questions:

Response with missing parameters:

```json
{
  "success": true,
  "needsMoreInfo": true,
  "missingParamsQuestions": {
    "intent": "SWAP_TOKENS",
    "questions": {
      "fromToken": "The token you want to swap from (e.g., 'coin', 'KDX')",
      "toToken": "The token you want to swap to",
      "amount": "The amount you want to swap",
      "account": "Your Kadena account address (e.g., k:example)",
      "slippage": "The slippage tolerance percentage (default: 1%)"
    },
    "required": {
      "fromToken": true,
      "toToken": true,
      "amount": true,
      "account": true,
      "slippage": false
    }
  },
  "currentParams": { ... },
  "conversationId": "conversation-1623847290123"
}
```

To provide the missing parameters, make a follow-up request:

```json
{
  "additionalParams": {
    "fromToken": "coin",
    "toToken": "KDX",
    "amount": "100",
    "account": "k:example_account",
    "slippage": "2"
  },
  "currentParams": { ... }, // Include the currentParams from the previous response
  "conversationId": "conversation-1623847290123"
}
```

#### Get Configuration

```
GET /api/config
```

Response:

```json
{
  "network": {
    "id": "testnet04",
    "chainId": "1"
  }
}
```

### Example Queries

#### Token Swapping

- "Swap 10 KDA for KDX"
- "I want to exchange 5 coin for token:example.token"
- "Trade 100 KDX for KDA with 2% slippage"

#### NFT Minting

- "Mint an NFT in collection my-collection-id"
- "Create a new NFT in collection abc123 with metadata at ipfs://example"
- "Mint an NFT to k:recipient with 5% royalties paid to k:creator"

## Client Integration Example

Here's a simple example of how to integrate the follow-up question workflow in a client application:

```javascript
async function processUserQuery(query, defaultParams = {}) {
  // Initial query
  const response = await fetch("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, defaultParams }),
  });

  const result = await response.json();

  // Check if we need to ask for more information
  if (result.success && result.needsMoreInfo) {
    // Ask the user for the missing information
    const additionalParams = {};

    // Here you would show UI elements to collect the missing parameters
    // For each question in result.missingParamsQuestions.questions
    // ...

    // Then make another request with the additional parameters
    const followUpResponse = await fetch("/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        additionalParams,
        currentParams: result.currentParams,
        conversationId: result.conversationId,
      }),
    });

    return await followUpResponse.json();
  }

  return result;
}
```

## Development

To run the server in development mode with hot reloading:

```bash
npm run dev
```

## Security Considerations

- This agent only generates **unsigned** transactions. The actual signing should be done by the user's wallet.
- Never expose your private keys or sensitive wallet information to this agent.
- Always review transaction details before signing.

## License

MIT

## Kadindexer API Integration

The agent uses the Kadindexer GraphQL API to interact with the Kadena blockchain. This provides a more efficient and flexible way to query blockchain data compared to the previous Chainweb REST API.

### Available Queries

The following Kadindexer GraphQL queries are implemented:

- **Account Details**: Get information about an account, including its guard and balance
- **Transaction Details**: Get detailed information about a specific transaction
- **Account Transactions**: Get a list of transactions for a specific account
- **Latest Block Height**: Get the latest block height for a specific chain

### Example Usage

```javascript
const {
  getAccountDetails,
  getTransactionDetails,
  getAccountTransactions,
  getLatestBlockHeight,
} = require("./src/utils/pactUtils");

// Get account details
const accountDetails = await getAccountDetails("k:account-name", "1");

// Get transaction details
const transactionDetails = await getTransactionDetails("request-key", "1");

// Get account transactions
const transactions = await getAccountTransactions("k:account-name", "1", 10);

// Get latest block height
const blockHeight = await getLatestBlockHeight("1");
```

For more information about the Kadindexer API, visit the [official documentation](https://kadindexer.gitbook.io/docs/queries).
