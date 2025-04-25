import os
import json
import requests
from typing import Dict, List, Any, Optional, Union, Tuple, Literal
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# LangChain imports
from langchain.agents import Tool, AgentExecutor, create_openai_functions_agent
from langchain.schema import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.agents import AgentFinish, AgentActionMessageLog
from langchain.tools import BaseTool

# Load environment variables from .env file
load_dotenv()

# Get OpenAI API key from environment variables
os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")

# API documentation
API_DOCS = {
    # Token transfer
    "transfer": {
        "description": "Transfer tokens from one account to another",
        "required_params": [
            "tokenAddress", # Usually 'coin' for KDA
            "sender", # Sender account (k:account)
            "receiver", # Receiver account (k:account)
            "amount", # Amount to transfer
            "chainId" # Chain ID (usually "2")
        ],
        "optional_params": ["meta", "gasLimit", "gasPrice", "ttl"],
        "endpoint": "/transfer"
    },
    
    # Token swapping
    "swap": {
        "description": "Swap one token for another using Kaddex/EchoDEX",
        "required_params": [
            "tokenInAddress", # Address of the token to swap from
            "tokenOutAddress", # Address of the token to swap to
            "account", # User's account (k:account)
            "chainId" # Chain ID (usually "2")
        ],
        "conditional_params": [
            {"name": "amountIn", "description": "Amount of input token", "condition": "Exact input amount"}, 
            {"name": "amountOut", "description": "Amount of output token", "condition": "Exact output amount"}
        ],
        "optional_params": [{"name": "slippage", "default": "0.005", "description": "Slippage tolerance (0.005 = 0.5%)"}],
        "endpoint": "/swap"
    },
    
    # Quote for token swaps
    "quote": {
        "description": "Get a price quote for swapping tokens",
        "required_params": [
            "tokenInAddress", # Address of the token to swap from
            "tokenOutAddress", # Address of the token to swap to
            "chainId" # Chain ID (usually "2")
        ],
        "conditional_params": [
            {"name": "amountIn", "description": "Amount of input token", "condition": "Exact input amount"}, 
            {"name": "amountOut", "description": "Amount of output token", "condition": "Exact output amount"}
        ],
        "endpoint": "/quote"
    },
    
    # NFT minting
    "mint_nft": {
        "description": "Create and mint an NFT on Marmalade v2",
        "required_params": [
            "account", # User's account (k:account)
            "guard", # Guard for the token
            "mintTo", # Account to mint to
            "uri", # URI for the NFT (usually IPFS link)
            "precision", # Decimal precision (0 for NFT)
            "policy", # Policy module for the NFT
            "name", # Name of the NFT
            "description", # Description of the NFT
            "chainId" # Chain ID (usually "2")
        ],
        "optional_params": ["collectionId", "royalties", "royaltyRecipient"],
        "endpoint": "/launch-nft"
    },
    
    # Collection creation
    "create_collection": {
        "description": "Create a new NFT collection",
        "required_params": [
            "account", # User's account (k:account)
            "guard", # Guard for the collection
            "name", # Collection name
            "description", # Collection description
            "totalSupply", # Total supply of the collection
            "chainId" # Chain ID (usually "2")
        ],
        "endpoint": "/create-collection"
    }
}

TOKENS = """
mainnet:
  coin:
    symbol: KDA
    name: KDA
    description: Native token of Kadena
    img: img/kda.svg
    color: "#4a9079"
    totalSupply: 1000000000
    precision: 12
    socials:
      - type: website
        url: https://www.kadena.io/
      - type: twitter
        url: https://twitter.com/kadena_io
      - type: discord
        url: https://discord.com/invite/kadena
      - type: github
        url: https://github.com/kadena-io

  arkade.token:
    symbol: ARKD
    name: Arkade
    description:
    img: img/ark.png
    color: "#cc66ff"
    precision: 12
    socials:
      - type: website
        url: https://www.arkade.fun/
      - type: twitter
        url: https://twitter.com/ArkadeFun

  free.maga:
    symbol: MAGA
    name: MAGA
    description:
    img: img/maga.png
    color: "#9d0b32"
    precision: 12
    socials:
      - type: twitter
        url: https://x.com/MAGA_KDA

  free.crankk01:
    symbol: CRKK
    name: CRKK
    description:
    img: img/crankk.png
    color: "#7f6afc"
    precision: 12
    socials:
      - type: website
        url: https://crankk.io/


  free.cyberfly_token:
    symbol: CFLY
    name: CFLY
    description:
    img: img/cfly.svg
    color: "#1f1fc2"
    precision: 8
    socials: []

  free.finux:
    symbol: FINX
    name: FINUX
    description:
    img: img/finux.png
    color: "#23a45c"
    precision: 12
    socials: []

  free.kishu-ken:
    symbol: KISHK
    name: KISHK
    description: First Kadena memecoin 
    img: img/kishk.png
    color: "#cbcbcc"
    totalSupply: 1000000000000000.00
    circulatingSupply: 689488206446005.00
    precision: 12
    socials:
      - type: website
        url: https://kishuken.me/
      - type: twitter
        url: https://x.com/kishu_ken_kda
      - type: telegram
        url: https://t.me/kishukens
      
  kaddex.kdx:
    symbol: KDX
    name: KDX
    description: Kaddex / Ecko Token
    img: img/kdx.svg
    color: "#ff5271"
    totalSupply: 900699352.80
    circulatingSupply: 244,760,172.96
    precision: 12
    socials:
      - type: website
        url: https://ecko.finance/
      - type: github
        url: https://github.com/eckoDAO-org
      - type: twitter
        url: https://x.com/eckoDAO
      - type: discord
        url: https://discord.gg/eckodao

  n_625e9938ae84bdb7d190f14fc283c7a6dfc15d58.ktoshi:
    symbol: KTO
    name: KTO
    description: Katoshi
    img: img/ktoshi.png
    color: "#34daa8"
    precision: 15
    socials:
      - type: website
        url: https://ktoshi.com/
      - type: twitter
        url: https://x.com/ktoshis

  n_b742b4e9c600892af545afb408326e82a6c0c6ed.zUSD:
    symbol: zUSD
    name: zUSD
    description: Stable coin issued by Zelcore
    img: img/zUSD.svg
    color: "#8a62eb"
    precision: 18
    socials:
      - type: website
        url: https://zelcore.io/

  n_e309f0fa7cf3a13f93a8da5325cdad32790d2070.heron:
    symbol: HERON
    name: HERON
    description:
    img: img/heron.png
    totalSupply: 963142522
    circulatingSupply: 693142522
    color: "#a22726"
    precision: 12
    socials:
      - type: website
        url: https://www.heronheroes.com
      - type: twitter
        url: https://x.com/HeronHeroesKDA

  n_582fed11af00dc626812cd7890bb88e72067f28c.bro:
    symbol: BRO
    name: BRO
    description: Token of the Brother's Telegram group
    img: img/bro.png
    color: "#af826a"
    totalSupply: 100
    circulatingSupply: 80
    precision: 12
    socials:
        - type: website
          url: https://bro.pink/
        - type: twitter
          url: https://x.com/thebrothersdao

  runonflux.flux:
    symbol: FLUX
    name: FLUX
    description: Native token of the Flux blockchain
    img: img/flux-crypto.svg
    color: "#2b61d1"
    totalSupply: 440000000
    precision: 8
    socials:
      - type: website
        url: https://runonflux.io/
      - type: twitter
        url: https://t.me/zelhub
      - type: discord
        url: https://discord.gg/keVn3HDKZw

  free.wiza:
      symbol: WIZA
      name: WIZA
      description: Wizards Arena
      img: img/wizards.png
      color: "#ed0404"
      precision: 12
      socials:
        - type: website
          url: https://www.wizardsarena.net

  hypercent.prod-hype-coin:
    symbol: HYPE
    name: HYPE
    description: Hypercent token
    img: img/hypercent-crypto.svg
    color: "#c40a8d"
    totalSupply: 10000000
    precision: 12
    socials:
      - type: website
        url: https://hypercent.io/
      - type: twitter
        url: https://twitter.com/hypercentpad
      - type: discord
        url: https://discord.gg/dxVvdNhqaE
      - type: telegram
        url: http://t.me/HyperCent

  free.babena:
    symbol: BABE
    name: BABE
    description: Babena - First DEFI project on Kadena
    img: img/babena-logo.svg
    color: "#ffcc4d"
    totalSupply: 12967695
    precision: 12
    socials:
      - type: website
        url: https://babena.finance

  kdlaunch.token:
    symbol: KDL
    name: KDL
    description: KDLaunch
    img: img/kdl.svg
    color: "#4aa5b1"
    totalSupply: 100000000
    precision: 12
    socials:
      - type: website
        url: https://www.kdlaunch.com/
      - type: twitter
        url: https://twitter.com/KdLaunch
      - type: telegram
        url: https://t.me/KDLaunchOfficial
      - type: discord
        url: https://discord.com/invite/GghUdhmk6z

  kdlaunch.kdswap-token:
    symbol: KDS
    name: KDS
    description: KDSwap
    img: img/kds.svg
    color: "#6ebbf2"
    totalSupply: 100000000
    precision: 12
    socials:
      - type: website
        url: https://www.kdswap.exchange/
      - type: twitter
        url: https://twitter.com/KDSwap
      - type: telegram
        url: https://t.me/KDSwapOfficial
      - type: discord
        url: https://discord.com/invite/GghUdhmk6z

  n_2669414de420c0d40bbc3caa615e989eaba83d6f.highlander:
    symbol: HLR
    name: HLR
    description:
    img: img/uno.webp
    totalSupply: 1
    circulatingSupply: 1
    color: "#3d3939"
    precision: 12
    socials:
      - type: website
        url: https://youtu.be/dQw4w9WgXcQ?si=h0SS4HbaWxLgw2IA
  
  n_c89f6bb915bf2eddf7683fdea9e40691c840f2b6.cwc:
    symbol: CWC
    name: CWC
    description:
    img: img/cwc.webp
    totalSupply: 4000000
    circulatingSupply: 520
    color: "#a22726"
    precision: 12
    socials:
      - type: website
        url: guardiansofkadena.com
      - type: twitter
        url: https://x.com/GuardiansofKDA

  n_95d7fe012aa7e05c187b3fc8c605ff3b1a2c521d.MesutÖzilDönerKebabMerkel42Inu:
    symbol: KEBAB
    name: KEBAB
    description: This Token is a symbol of love to Döner Kebab and to the friendship between Germany and Turkey
    img: img/kebab.webp
    totalSupply: 100000000
    circulatingSupply: 100000000
    color: "#a22726"
    precision: 12
    socials: []
             
  n_95d7fe012aa7e05c187b3fc8c605ff3b1a2c521d.ShrekYodaTrumpMarsX12Inu:
    symbol: GREENCOIN
    name: GREENCOIN
    description: Cult for green coin, Trump and mars lovers.
    img: img/greencoin.webp
    totalSupply: 100000000
    circulatingSupply: 100000000
    color: "#a22726"
    precision: 12
    socials: []

  n_95d7fe012aa7e05c187b3fc8c605ff3b1a2c521d.SonGokuBezosPikachu12Inu:
    symbol: WLONG
    name: WLONG
    description: May the power of Wenlong be with us.
    img: img/wlong.webp
    totalSupply: 100000000
    circulatingSupply: 100000000
    color: "#a22726"
    precision: 12
    socials: []

  n_d8d407d0445ed92ba102c2ce678591d69e464006.TRILLIONCARBON:
    symbol: TCTC
    name: TCTC
    description: the official corporate token and ledger of Trillion Capital Toronto Corporation used for internal purposes
    img: img/tril.png
    totalSupply: 1000001
    circulatingSupply: 1000001
    color: "#a22726"
    precision: 12
    socials: 
      - type: website
        url: https://trillioncapital.ca
      - type: twitter
        url: https://twitter.com/TRILLIONCAP

  n_518dfea5f0d2abe95cbcd8956eb97f3238e274a9.AZUKI:
    symbol: AZUKI
    name: AZUKI
    description: Will Martino's beloved companion, AZUKI is a community managed token. Woof!.
    img: img/azuki.png
    totalSupply: 100000000
    circulatingSupply: 100000000
    color: "#218dc5"
    precision: 12
    socials:
      - type: website
        url: https://www.azukionkadena.fun
      - type: twitter
        url: https://x.com/AzukiKDA
      - type: telegram
        url: https://t.me/AzukiKDA

  n_71c27e6720665fb572433c8e52eb89833b47b49b.Peppapig:
    symbol: PP
    name: PP
    description:
    img: img/peppa.png
    totalSupply: 1000000000
    circulatingSupply: 1000000000
    color: "#a22726"
    precision: 12
    socials: 
      - type: telegram
        url: https://t.me/peppapigmemetokenkda

testnet:
  coin:
    symbol: KDA
    name: KDA
    description: Native token of Kadena
    img: img/kda.svg
    totalSupply: 1000000000
    socials:
      - type: website
        url: https://www.kadena.io/
      - type: twitter
        url: https://twitter.com/kadena_io
      - type: discord
        url: https://discord.com/invite/kadena
      - type: github
        url: https://github.com/kadena-io

blacklist:
  - lago.USD2
  - lago.kwBTC
  - lago.kwUSDC
  - free.elon
  - mok.token
  - free.docu
  - free.kpepe
  - free.backalley
  - free.kapybara-token
  - free.jodie-token
  - free.corona-token
  - free.KAYC
  - free.anedak
  - n_95d7fe012aa7e05c187b3fc8c605ff3b1a2c521d.MesutÖzilDönerKebabMerkel42Inu
"""

class KadenaTransactionTool(BaseTool):
    name: str = "kadena_transaction"
    description: str = """Generate unsigned transactions for Kadena blockchain operations.
    Use this tool when you need to create transactions for:
    - Token transfers
    - Token swaps
    - NFT minting
    - Collection creation
    
    The tool requires specific parameters based on the operation type:
    
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
    - endpoint: "launch-nft"
    - account: User's account (k:account format)
    - guard: Guard object with keys and pred
    - mintTo: Account to mint to (k:account format)
    - uri: IPFS URI or metadata link
    - collectionId: Collection ID
    - chainId: Chain ID (must be "2")
    - Optional: precision, policy, royalties, royaltyRecipient, name, description
    
    For collection creation:
    - endpoint: "create-collection"
    - account: User's account (k:account format)
    - guard: Guard object with keys and pred
    - name: Collection name
    - chainId: Chain ID (must be "2")
    - Optional: description, totalSupply
    """
    
    def _run(self, endpoint: Literal["transfer", "swap", "launch-nft", "create-collection"], body: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate an unsigned transaction by calling the Kadena API.
        
        Args:
            endpoint: The API endpoint to call
            body: The request body containing transaction parameters
            
        Returns:
            Dict containing the unsigned transaction data or error information
        """
        # Validate endpoint
        valid_endpoints = {'transfer', 'swap', 'launch-nft', 'create-collection'}
        if endpoint not in valid_endpoints:
            return {"error": f"Invalid endpoint. Must be one of: {valid_endpoints}"}
        
        # Validate required parameters based on endpoint
        required_params = {
            'transfer': ['tokenAddress', 'sender', 'receiver', 'amount', 'chainId'],
            'swap': ['tokenInAddress', 'tokenOutAddress', 'account', 'chainId'],
            'launch-nft': ['account', 'guard', 'mintTo', 'uri', 'collectionId', 'chainId'],
            'create-collection': ['account', 'guard', 'name', 'chainId']
        }
        
        # Special validation for swap endpoint
        if endpoint == 'swap':
            if 'amountIn' in body and 'amountOut' in body:
                return {"error": "Cannot specify both amountIn and amountOut for swap"}
            if 'amountIn' not in body and 'amountOut' not in body:
                return {"error": "Must specify either amountIn or amountOut for swap"}
        
        # Check required parameters
        missing_params = [param for param in required_params[endpoint] 
                         if param not in body]
        if missing_params:
            return {"error": f"Missing required parameters: {missing_params}"}
        
        # Validate chainId
        if body.get('chainId') != "2":
            return {"error": "Currently only chainId 2 is supported"}
        
        # Make API request
        try:
            response = requests.post(
                f"https://kadena-agents.onrender.com/{endpoint}",
                json=body,
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
    
    async def _arun(self, endpoint: Literal["transfer", "swap", "launch-nft", "create-collection"], body: Dict[str, Any]) -> Dict[str, Any]:
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

# Define request models
class QueryRequest(BaseModel):
    query: str = Field(..., description="The user's query about Kadena blockchain")
    history: Optional[List[str]] = Field(None, description="Previous conversation history")

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

# Initialize OpenAI model
model = ChatOpenAI(model="o4-mini")

def run_kadena_agent_with_context(query: str, history: List[str] = None) -> Dict[str, Any]:
    """
    Run the Kadena agent with contextualized history and tool calling.
    
    Args:
        query: The user's input query
        history: Optional list of previous conversation messages
        
    Returns:
        Dict containing the agent's response and any tool outputs
    """
    # Initialize history if not provided
    if history is None:
        history = []
    
    # Create tools
    tools = [
        KadenaTransactionTool(),
        KadenaAnalysisTool()
    ]
    
    # Create the prompt template with agent_scratchpad
    prompt = ChatPromptTemplate.from_messages([
        ("system", """
        You are <K-Agent>, a supreme being with deep knowledge of the Kadena Blockchain.

        Your task is to assist users with all things Kadena, including answering all user queries 
        and even generating unsigned transactions as per their requirements.
        You will have access to any previous conversations with the user and their present queries 
        to help you be smart, sentient and most effective.

        In order to accomplish this, you have access to the following tools:
          1. Transaction Generation API — generating unsigned transaction data based on user intent.
          2. Query Answering API — answering all user queries about the Kadena Blockchain.

        Here are some resources to help you in your task:
          1. Documentation for Transactions:
            {API_DOCS}
            This documentation contains guidance on requirements from the user to successfully call 
            the Transactions API to generate unsigned transactions to fulfill user requests.
          2. Documentation for Tokens:
            {TOKENS}
            This documentation contains information about all the tokens on the Kadena Blockchain.

        When a user query arrives:
        1. Analyze intent:
          - If a transaction intent (transfer, swap, mint_nft, create_collection, obtain quotes):
            a) Extract 'action' and 'params' by matching against API_DOCS.
            b) Validate required_params; if missing, request the user to provide them.
            c) Once complete, call Transaction Generation API and return full JSON response.
          - If an informational query:
            a) Directly call Query Answering API with the question and formal character description.
            b) Process the answer based on any available previous context or knowledge.
        2. Always:
          - Think step-by-step before responding (internally).
          - Return structured JSON.
        """),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
        ("human", "{input}")
    ])

    contextualize_prompt = """
    You are a context provider for <K-Agent>, a supreme being with deep knowledge of the Kadena Blockchain.

    Given the previous conversation and the user's next input, your task is to provide the LLM with context and assign a task to it.

    The context must include all the knowledge from past conversations and the new user input synthesized.
    The task must be simply the operation to be performed by the LLM, created using information from both queries. However, you must not instruct the LLM, simply assign the task.

    However, you must only provide context from the previous conversation if it is directly relevant to the user's current query. Else, simply return the original user input.

    If a transaction is intended:
      1. Only provide context from previous conversations if it is directly relevant to the user's current query. Do NOT instruct the LLM, simply assign the task.
      2. For fresh transactions, do not provide any context from the previous conversation. 

    If information is asked or a query is to be fulfilled:
      1. Only provide context from the previous conversation if it is directly relevant to the user's current query. 
      2. Do NOT instruct the LLM, simply simply assign the task.

    Previous Conversation(s):
    {previous_conversation}
    """

    contextualize_prompt = ChatPromptTemplate.from_messages(
        [
            ("system", contextualize_prompt),
            ("human", "{input}"),
        ]
    )
    # Create the agent
    agent = create_openai_functions_agent(
        llm=model,
        tools=tools,
        prompt=prompt
    )
    
    # If there's history, contextualize the query
    if history:
        contextualized_query = model.invoke(
            contextualize_prompt.format(
                previous_conversation=history,
                input=query
            )
        )
        query = contextualized_query.content
        print(f"Contextualized Query: {query}")
    
    # Initialize agent input with required fields
    agent_input = {
        "input": query,
        "intermediate_steps": [],  # Initialize empty intermediate steps
        "API_DOCS": API_DOCS,
        "TOKENS": TOKENS
    }
    
    # Process the query with the agent
    response = agent.invoke(agent_input)

    result = response

    if isinstance(response, AgentFinish):
        result = response.return_values['output']
    elif isinstance(response, AgentActionMessageLog):
        tool_input = response.tool_input
        tool = response.tool
        if tool == 'kadena_analysis':
            tool_output = KadenaAnalysisTool()._run(query=tool_input['query'], systemPrompt=tool_input['systemPrompt'])
            result = tool_output['data']['rawData']
        elif tool == 'kadena_transaction':
            tool_output = KadenaTransactionTool()._run(endpoint=tool_input['endpoint'], body={k:v for k,v in tool_input.items() if k != 'endpoint'})
            result = tool_output

    history.extend([
        "Human: "+query,
        "AI: "+str(result)
    ])
    
    return {
        "response": result,
        "intermediate_steps": response.intermediate_steps if hasattr(response, 'intermediate_steps') else [],
        "history": history
    }

@app.post("/query", summary="Process a natural language query about Kadena blockchain")
async def process_query(request: QueryRequest):
    """
    Process a natural language query about Kadena blockchain.
    The agent will determine whether it's a transaction request or an informational query.
    """
    try:
        result = run_kadena_agent_with_context(request.query, request.history)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
