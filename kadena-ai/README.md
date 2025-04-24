# Kadena AI Agent API

A Python-based API server for processing natural language queries about the Kadena blockchain and generating unsigned transactions.

## Installation

1. Clone the repository
2. Install dependencies:

```bash
pip install langchain langchain_openai requests python-dotenv
```

3. Create a `.env` file in the root directory with your OpenAI API key:

```
OPENAI_API_KEY=your_openai_api_key_here
```

## Usage

1. Start the server:

```bash
python api.py
```

This will start the HTTP server on port 8000.

2. Query the API:

```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "How do I transfer KDA to another account?", "history": []}'
```

## Endpoints

- `GET /`: Health check endpoint
- `POST /query`: Process a natural language query about Kadena blockchain

### Query Request Format

```json
{
  "query": "Your query about Kadena blockchain",
  "history": ["Optional list of previous conversation messages"]
}
```

### Response Format

```json
{
  "response": "AI-generated response or transaction data",
  "intermediate_steps": [],
  "history": ["Updated conversation history"]
}
```

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required)
