import os
import json
import requests
import datetime
import logging
from typing import Dict, List, Any, Optional, Union, Tuple, Literal
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('kadena_api.log')
    ]
)
logger = logging.getLogger(__name__)

# LangChain imports
from langchain.agents import Tool, AgentExecutor, create_openai_functions_agent
from langchain.schema import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.agents import AgentFinish, AgentActionMessageLog
from langchain.tools import BaseTool

from config import API_KEY, MODEL_NAME
from agent import run_kadena_agent_with_context

# Load environment variables from .env file
load_dotenv()

# Get OpenAI API key from environment variables
os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")
os.environ["API_KEY"] = os.getenv("API_KEY")

# Initialize FastAPI
app = FastAPI(
    title="Kadena AI Agent API",
    description="API for Kadena blockchain query processing using AI",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows the specified origin
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.get("/", summary="Health check endpoint")
async def health_check():
    """
    Health check endpoint that returns the status of the service and its dependencies.
    """
    logger.info("Health check request received")
    try:
        openai_status = "healthy"
        logger.info("OpenAI status check successful")
    except Exception as e:
        openai_status = f"error: {str(e)}"
        logger.error(f"OpenAI status check failed: {str(e)}")

    try:
        # Check Kadena API connection
        logger.info("Checking Kadena API connection")
        response = requests.get(
            "https://kadena-agents.onrender.com/",
            headers={'Content-Type': 'application/json', 'x-api-key': API_KEY}
        )
        response.raise_for_status()
        kadena_status = "healthy"
        logger.info("Kadena API connection check successful")
    except Exception as e:
        kadena_status = f"error: {str(e)}"
        logger.error(f"Kadena API connection check failed: {str(e)}")

    logger.info("Health check completed successfully")
    return {
        "status": "ok",
        "version": "1.0.0",
        "dependencies": {
            "openai": openai_status,
            "kadena_api": kadena_status
        },
        "timestamp": datetime.datetime.utcnow().isoformat()
    }

# Initialize OpenAI model
model = ChatOpenAI(model="o4-mini")

from typing import Dict, Any, Literal, Optional
import requests
from langchain.tools import BaseTool

class KadenaTransactionTool(BaseTool):
    name: str = "kadena_transaction"
    description: str = """Generate unsigned transactions for Kadena blockchain operations.
    Use this tool when you need to create transactions for:
    - Token transfers
    - Token swaps
    - NFT minting
    - Collection creation
    
    The tool requires specific parameters based on the operation type:
    
    For quotes:
    - endpoint: "quote"
    - tokenInAddress: Input token address
    - tokenOutAddress: Output token address
    - amountIn OR amountOut: Amount to quote
    - chainId: Chain ID (must be "2")  
    
    For transfers:
    - endpoint: "transfer"
    - tokenAddress: Token contract address (e.g. "coin" for KDA)
    - sender: Sender's account (k:account format)
    - receiver: Receiver's account (k:account format)
    - amount: Amount to transfer
    - chainId: Chain ID (must be "2")
    
    For swaps:
    - endpoint: "swap"
    - tokenInAddress: Input token address
    - tokenOutAddress: Output token address
    - account: User's account (k:account format)
    - amountIn OR amountOut: Amount to swap
    - chainId: Chain ID (must be "2")
    - slippage: Optional slippage tolerance (default 0.005)
    
    For NFT minting:
    - endpoint: "nft/launch"
    - name: NFT name
    - account: User's account (k:account format)
    - guard: Guard object with keys and pred
    - mintTo: Account to mint to (k:account format)
    - uri: IPFS URI or metadata link
    - collectionId: Collection ID
    - chainId: Chain ID (must be "2")
    - Optional: precision, policy, royalties, royaltyRecipient, description
    
    For collection creation:
    - endpoint: "nft/collection"
    - account: User's account (k:account format)
    - guard: Guard object with keys and pred
    - name: Collection name
    - chainId: Chain ID (must be "2")
    - Optional: description, totalSupply
    """
    
    def _run(self, endpoint: Literal["quote", "transfer", "swap", "nft/launch", "nft/collection"], body: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate an unsigned transaction by calling the Kadena API.
        
        Args:
            endpoint: The API endpoint to call
            body: The request body containing transaction parameters
            
        Returns:
            Dict containing the unsigned transaction data or error information
        """
        # Validate endpoint
        valid_endpoints = {'quote', 'transfer', 'swap', 'nft/launch', 'nft/collection'}
        if endpoint not in valid_endpoints:
            return {"error": f"Invalid endpoint. Must be one of: {valid_endpoints}"}
        
        # Validate required parameters based on endpoint
        required_params = {
            'quote': ['tokenInAddress', 'tokenOutAddress', 'chainId'],
            'transfer': ['tokenAddress', 'sender', 'receiver', 'amount', 'chainId'],
            'swap': ['tokenInAddress', 'tokenOutAddress', 'account', 'chainId'],
            'nft/launch': ['name', 'account', 'guard', 'mintTo', 'uri', 'collectionId', 'chainId'],
            'nft/collection': ['account', 'guard', 'name', 'chainId']
        }
        
        # Special validation for swap endpoint
        if endpoint == 'swap':
            if 'amountIn' in body and 'amountOut' in body:
                return {"error": "Cannot specify both amountIn and amountOut for swap"}
            if 'amountIn' not in body and 'amountOut' not in body:
                return {"error": "Must specify either amountIn or amountOut for swap"}
            
        # Special validation for quote endpoint
        if endpoint == 'quote':
            if 'amountIn' in body and 'amountOut' in body:
                return {"error": "Cannot specify both amountIn and amountOut for quote"}
            if 'amountIn' not in body and 'amountOut' not in body:
                return {"error": "Must specify either amountIn or amountOut for quote"}
        
        # Check required parameters
        missing_params = [param for param in required_params[endpoint] 
                         if param not in body]
        if missing_params:
            return {"error": f"Missing required parameters: {missing_params}"}
        
        # Validate chainId
        if int(body.get('chainId')) > 19 or int(body.get('chainId')) < 0:
            return {"error": "Invalid chainId. Must be between 0 and 19"}
        
        # Make API request
        try:
            response = requests.post(
                f"https://kadena-agents.onrender.com/{endpoint}",
                json=body,
                headers={'Content-Type': 'application/json', 'x-api-key': 'Commune_dev1'}
            )
            
            # Handle specific error cases
            if response.status_code == 400:
                error_data = response.json()
                return {"error": f"Bad Request: {error_data.get('error', 'Unknown error')}"}
            elif response.status_code == 500:
                error_data = response.json()
                return {"error": f"Server Error: {error_data.get('error', 'Unknown error')}"}
                
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_data = e.response.json()
                    return {"error": f"API Error: {error_data.get('error', str(e))}"}
                except ValueError:
                    return {"error": f"API request failed: {str(e)}"}
            return {"error": f"API request failed: {str(e)}"}
    
    async def _arun(self, endpoint: Literal["transfer", "swap", "nft/launch", "nft/collection", "quote"], body: Dict[str, Any]) -> Dict[str, Any]:
        """Async version of the tool."""
        return self._run(endpoint, body)
    
class KadenaAnalysisTool(BaseTool):
    name: str = "kadena_analysis"
    description: str = """Analyze user queries and provide responses as K-Agent.
    This tool is used to get AI-generated responses for user queries about Kadena blockchain.
    
    Parameters:
    - query: The user's input query
    - systemPrompt: The system prompt that defines K-Agent's character and context
    """
    
    def _run(self, query: str, systemPrompt: str) -> Dict[str, Any]:
        """
        Send a query to the analysis endpoint and get K-Agent's response.
        
        Args:
            query: The user's input query
            systemPrompt: The system prompt defining K-Agent's character
            
        Returns:
            Dict containing the analysis response or error information
        """
        try:
            response = requests.post(
                'https://analyze-slaz.onrender.com/analyze',
                json={
                    'query': query,
                    'systemPrompt': systemPrompt                
                    },
                headers={'Content-Type': 'application/json'}
            )
            
            # Handle specific error cases
            if response.status_code == 400:
                error_data = response.json()
                return {"error": f"Bad Request: {error_data.get('error', 'Unknown error')}"}
            elif response.status_code == 500:
                error_data = response.json()
                return {"error": f"Server Error: {error_data.get('error', 'Unknown error')}"}
                
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_data = e.response.json()
                    return {"error": f"API Error: {error_data.get('error', str(e))}"}
                except ValueError:
                    return {"error": f"API request failed: {str(e)}"}
            return {"error": f"API request failed: {str(e)}"}
    
    async def _arun(self, query: str, systemPrompt: str) -> Dict[str, Any]:
        """Async version of the tool."""
        return self._run(query, systemPrompt)
    
    
class QueryRequest(BaseModel):
    query: str = Field(..., description="The user's query about Kadena blockchain")
    history: Optional[List[str]] = Field(None, description="Previous conversation history")

@app.post("/query", summary="Process a natural language query about Kadena blockchain")
async def process_query(request: QueryRequest):
    logger.info("Received query request")
    try:
        logger.info("Processing query with agent")
        result = run_kadena_agent_with_context(request.query, request.history)
        logger.info("Successfully processed query")
        return result
    except Exception as e:
        logger.error(f"Error processing query: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
