import requests
from typing import Dict, List, Any, Optional, Literal
from langchain.agents import Tool, AgentExecutor, create_openai_functions_agent
from langchain.schema import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.agents import AgentFinish, AgentActionMessageLog
from langchain.tools import BaseTool

from config import (
    API_KEY, MODEL_NAME, GPT4_MODEL, API_DOCS, TOKENS,
    KADENA_API_BASE_URL, ANALYSIS_API_URL, MAX_HISTORY_LENGTH
)

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
    - account: User's account (k:account format)
    - guard: Guard object with keys and pred
    - mintTo: Account to mint to (k:account format)
    - uri: IPFS URI or metadata link
    - collectionId: Collection ID
    - chainId: Chain ID (must be "2")
    - Optional: precision, policy, royalties, royaltyRecipient, name, description
    
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
            'nft/launch': ['account', 'guard', 'mintTo', 'uri', 'collectionId', 'chainId'],
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
                f"{KADENA_API_BASE_URL}/{endpoint}",
                json=body,
                headers={'Content-Type': 'application/json', 'x-api-key': API_KEY}
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
        """
        try:
            response = requests.post(
                ANALYSIS_API_URL,
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

def run_kadena_agent_with_context(query: str, history: List[str] = None) -> Dict[str, Any]:
    """
    Run the Kadena agent with history and tool calling.
    """
    # Initialize history if not provided
    if history is None:
        history = []
    
    # Limit history to last 5 conversations (10 messages - 5 pairs of Q&A)
    if len(history) > MAX_HISTORY_LENGTH:
        history = history[-MAX_HISTORY_LENGTH:]
    
    # Create tools
    tools = [
        KadenaTransactionTool(),
        KadenaAnalysisTool()
    ]
    
    # Format history for the prompt
    formatted_history = "\n".join(history) if history else "No previous conversation"
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """
        You are <Agent K>, a supreme being with deep knowledge of the Kadena Blockchain.

        Your task is to assist users with all things Kadena, including answering user queries and generating unsigned transactions as per their requirements.
        You will be provided with the user's account name, public key, their guard and chainId. You will also be provided with the balances of all the user's tokens.
        You will have access to any previous conversations with the user and their present queries 
        Thus, you must take all these into account to be sentient, smart and most effective.

        Previous conversation(s):
        {formatted_history}

        In order to accomplish this, you have access to the following tools:
          1. Transaction Generation API — generating unsigned transaction data based on user intent.
          2. Query Answering API — answering any queries about the Kadena Blockchain, that you cannot already answer.

        Here are some resources to help you in your task:
          1. Documentation for Transactions:
            {API_DOCS}
            This documentation contains guidance on requirements from the user to successfully call 
            the Transactions API to generate unsigned transactions to fulfill user requests.
            If chainId is not provided, assume it is 2.
          2. Documentation for Tokens:
            {TOKENS}
            This documentation contains information about all the tokens on the Kadena Blockchain.

        When a user query arrives:
        1. Analyze intent:
          - If a transaction intent (transfer, swap, mint_nft, create_collection, quotes):
            a) Extract 'action' and 'params' by matching against API_DOCS.
            b) Validate required_params; if missing, request the user to provide them.
            c) Once complete, call Transaction Generation API and return full JSON response.
          - If an informational query:
            a) Check if you can answer the question based on the information you have available to you (User Account Info, Token Balances, Previous Conversations, Tokens Info, etc.)
            b) If you can answer the question, then do so.
            c) If you cannot answer the question, then call the Query Answering API
            d) Pass the the question, any extra information you have that maybe appropriate 
               and a system prompt with a character description of yourself.
            d) Process the answer based on any available previous context or knowledge.
          - Special Case:
            a) If the user asks you for the value or price of a token, use the quotes transaction tool to get the price of the token.
            b) if the user asks for a value of any token, return it in terms of KDA and if they ask for vlaue of KDA, return in terms of zUSD.
        2. Always:
          - Think step-by-step before responding (internally).
          - Return structured JSON.
        """),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
        ("human", "{input}")
    ])
    
    # Create the agent
    agent = create_openai_functions_agent(
        llm=ChatOpenAI(model=MODEL_NAME),
        tools=tools,
        prompt=prompt
    )
    
    # Initialize agent input with required fields
    agent_input = {
        "input": query,
        "intermediate_steps": [],  # Initialize empty intermediate steps
        "API_DOCS": API_DOCS,
        "TOKENS": TOKENS,
        "history": history,  # Pass history directly
        "formatted_history": formatted_history  # Add formatted history
    }
    
    # Process the query with the agent
    response = agent.invoke(agent_input)

    result = response

    if isinstance(response, AgentFinish):
        result = response.return_values['output']
    elif isinstance(response, AgentActionMessageLog):
        tool_input = response.tool_input
        tool = response.tool
        print("Using " + tool)
        if tool == 'kadena_analysis':
            tool_output = KadenaAnalysisTool()._run(query=tool_input['query'], systemPrompt=tool_input['systemPrompt'])
            
            gpt4_model = ChatOpenAI(model=GPT4_MODEL)
            processing_prompt = ChatPromptTemplate.from_messages([
                ("system", """
                Given raw data from the Kadena API, process it and return a response to show to the user.
                 
                If there is an error, do your best to answer the user's query. If you cannot answer the user's query, then ask them to try again later.
                """),
                ("human", "{raw_data}")
            ])
            
            processed_output = gpt4_model.invoke(
                processing_prompt.format(raw_data=tool_output)
            )
            result = processed_output.content
        elif tool == 'kadena_transaction':
            tool_output = KadenaTransactionTool()._run(endpoint=tool_input['endpoint'], body={k:v for k,v in tool_input.items() if k != 'endpoint'})

            # Check for error in transaction output
            if isinstance(tool_output, dict) and 'error' in tool_output:
                gpt4_model = ChatOpenAI(model=GPT4_MODEL)
                error_prompt = ChatPromptTemplate.from_messages([
                    ("system", """
                    You are a helpful assistant explaining Kadena transaction errors to users.
                    Your task is to:
                    1. Explain the error in simple, user-friendly terms
                    2. Suggest possible solutions or workarounds
                    3. Provide context about why this error might have occurred
                    4. If applicable, mention any specific requirements or constraints
                    
                    Be empathetic and helpful while maintaining technical accuracy.
                    """),
                    ("human", """
                    Transaction Error Details:
                    Error: {error}
                    Details: {details}
                    Original Query: {query}
                    """)
                ])
                
                error_explanation = gpt4_model.invoke(
                    error_prompt.format(
                        error=tool_output.get('error', 'Unknown error'),
                        details=tool_output.get('details', 'No additional details available'),
                        query=query
                    )
                )
                result = error_explanation.content
            else:
                if tool_input['endpoint'] == 'quote':
                    result ={ **tool_output , 
                             "text": "Quote in terms of " + tool_input['tokenOutAddress']}
                else:
                    result = tool_output

    # Add new conversation to history
    history.extend([
        "Human: "+query,
        "AI: "+str(result)
    ])
    
    # Ensure history stays within limit
    if len(history) > MAX_HISTORY_LENGTH:
        history = history[-MAX_HISTORY_LENGTH:]
    
    return {
        "response": result,
        "intermediate_steps": response.intermediate_steps if hasattr(response, 'intermediate_steps') else [],
        "history": history
    } 