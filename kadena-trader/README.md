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

# Kadena Trader Lambda Function

This is a Lambda function for the Kadena trading bot.

## Prerequisites

- Node.js 18 or higher
- AWS CLI configured with appropriate credentials
- AWS IAM role with Lambda execution permissions

## Environment Variables

The following environment variables need to be set in your Lambda configuration:

- `API_KEY`: Your Kadena API key
- `PRIVATE_KEY`: Your Kadena private key
- `PUBLIC_KEY`: Your Kadena public key

## Deployment Steps

1. Install dependencies:
```bash
npm install
```

2. Create a deployment package:
```bash
npm run build
```

3. Deploy to AWS Lambda:
```bash
npm run deploy
```

## Manual Deployment

If you prefer to deploy manually:

1. Create a new Lambda function in AWS Console
2. Set the runtime to Node.js 18.x
3. Upload the `function.zip` file
4. Configure the environment variables
5. Set the handler to `baseline.handler`
6. Configure the function timeout (recommended: 30 seconds)
7. Set memory to 256MB (adjust based on your needs)

## IAM Role Requirements

The Lambda function needs an IAM role with the following permissions:

- AWSLambdaBasicExecutionRole
- Custom permissions for any AWS services you're using

## Testing

You can test the function using the AWS Lambda console or by invoking it through API Gateway if configured.

## Monitoring

Monitor your function using:
- CloudWatch Logs
- CloudWatch Metrics
- X-Ray (if enabled)
