# Kadena Trader API

A FastAPI service for generating and managing Kadena trading agent code.

## Features

- Trading agent prompt evaluation and improvement
- JavaScript code generation for trading agents
- Health check endpoint

## Setup

1. Create a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Create a `.env` file with your OpenAI API key:

```
OPENAI_API_KEY=your_api_key_here
```

4. Run the server:

```bash
uvicorn api:app --reload
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Health Check

```
GET /health
```

Returns the service health status.

### Evaluate and Improve Prompt

```
POST /prompt
```

Evaluates a trading agent prompt and provides improvement suggestions.

Request body:

```json
{
  "prompt": "string",
  "history": ["string"] // optional
}
```

### Generate Trading Agent Code

```
POST /code
```

Generates JavaScript code for a trading agent based on the provided prompt.

Request body:

```json
{
  "prompt": "string",
  "history": ["string"] // optional
}
```

## Response Format

All responses are in JSON format. Successful responses will contain the requested data, while error responses will include an error message and appropriate HTTP status code.

### Example Success Response

```json
{
  "code": "// Generated JavaScript code",
  "interval": "rate(30 minutes)"
}
```

### Example Error Response

```json
{
  "detail": "Error message"
}
```

## Error Handling

The API uses standard HTTP status codes:

- 200: Success
- 400: Bad Request
- 500: Internal Server Error

All errors are logged to `kadena_trader.log` for debugging purposes.
