import os
import json
import requests
from typing import Dict, List, Any, Optional, Union, Tuple

# LangChain imports
from langchain.agents import Tool, AgentExecutor, create_openai_functions_agent
from langchain.memory import ConversationBufferMemory
from langchain.schema import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
# Set your OpenAI API key
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get OpenAI API key from environment variables
os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")

TRANSACTIONS_CODE = """
/**
 * @description JavaScript client for Kadena blockchain API operations
 * 
 * This module provides functions to interact with Kadena blockchain through a REST API,
 * allowing token transfers, swaps, and price quotes.
 */

/**
 * Makes a request to the Kadena API
 * @param {string} endpoint - The API endpoint to call
 * @param {Object} body - The request body containing parameters
 * @returns {Promise<Object>} The API response
 * @private
 */
async function makeRequest(endpoint, body)

/**
 * Validates a chain ID parameter
 * @param {string|number} chainId - The chain ID to validate
 * @returns {string} The validated chain ID as a string
 * @private
 */
function validateChainId(chainId)

/**
 * Transfer tokens from one account to another
 * 
 * @param {Object} params - Transfer parameters
 * @param {string} params.tokenAddress - Token contract address
 * @param {string} params.sender - Sender account
 * @param {string} params.receiver - Receiver account
 * @param {string|number} params.amount - Amount to transfer
 * @param {string|number} params.chainId - Chain ID (0-19)
 * @param {Object} [params.meta] - Additional metadata
 * @param {number} [params.gasLimit] - Gas limit for transaction
 * @param {number} [params.gasPrice] - Gas price for transaction
 * @param {number} [params.ttl] - Transaction time-to-live
 * @returns {Promise<Object>} Transfer transaction data containing:
 *   - transaction: Object containing:
 *      - cmd: The Pact command JSON string
 *      - hash: Transaction hash
 *      - sigs: Array of signatures (null if not signed)
 *   - metadata: Object containing:
 *      - sender: Sender account
 *      - receiver: Receiver account
 *      - amount: Transfer amount
 *      - tokenAddress: Token contract address
 *      - chainId: Chain ID
 *      - networkId: Network ID (e.g., "mainnet01")
 *      - estimatedGas: Estimated gas cost
 *      - formattedAmount: Formatted transfer amount
 */
async function transfer({
  tokenAddress,
  sender,
  receiver,
  amount,
  chainId,
  meta,
  gasLimit,
  gasPrice,
  ttl
})

/**
 * Swap one token for another using Kaddex/EchoDEX
 * 
 * @param {Object} params - Swap parameters
 * @param {string} params.tokenInAddress - Address of input token
 * @param {string} params.tokenOutAddress - Address of output token
 * @param {string} params.account - Sender account
 * @param {string|number} params.chainId - Chain ID (0-19)
 * @param {string|number} [params.amountIn] - Amount to swap (either amountIn or amountOut must be provided)
 * @param {string|number} [params.amountOut] - Desired output amount (either amountIn or amountOut must be provided)
 * @param {number} [params.slippage] - Maximum acceptable slippage
 * @returns {Promise<Object>} Swap transaction data containing:
 *   - transaction: Object containing:
 *      - cmd: The Pact command JSON string with swap details
 *      - hash: Transaction hash
 *      - sigs: Array of signatures (null if not signed)
 *   - quote: Object containing:
 *      - expectedIn: The exact input amount
 *      - expectedOut: The expected output amount
 *      - slippage: Applied slippage tolerance
 *      - priceImpact: Price impact percentage
 */
async function swap({
  tokenInAddress,
  tokenOutAddress,
  account,
  chainId,
  amountIn,
  amountOut,
  slippage
})

/**
 * Get price quotes for swapping tokens
 * 
 * @param {Object} params - Quote parameters
 * @param {string} params.tokenInAddress - Address of input token
 * @param {string} params.tokenOutAddress - Address of output token
 * @param {string|number} params.chainId - Chain ID (0-19)
 * @param {string|number} [params.amountIn] - Input amount to get output quote (either amountIn or amountOut must be provided)
 * @param {string|number} [params.amountOut] - Desired output amount to get input quote (either amountIn or amountOut must be provided)
 * @returns {Promise<Object>} Quote response containing:
 *   - amountIn: Required input amount (when amountOut is provided)
 *   - amountOut: Expected output amount (when amountIn is provided)
 *   - priceImpact: Price impact percentage as a string
 */
async function quote({
  tokenInAddress,
  tokenOutAddress,
  chainId,
  amountIn,
  amountOut
})
"""

TRANSACTIONS_USAGE = """
// Example 1: Transfer KDA tokens
  try {
    const result = await transfer({
      tokenAddress: 'coin', // 'coin' is the KDA token
      sender: 'k:sender_account_key',
      receiver: 'k:receiver_account_key',
      amount: '10.0',
      chainId: '2'
    });
    console.log('Transfer transaction:', result);
  } catch (error) {
    console.error('Transfer failed:', error.message);
  }


// Example 2: Get a quote for swapping tokens
  try {
    const result = await quote({
      tokenInAddress: 'coin', // KDA
      tokenOutAddress: 'kaddex.kdx', // KDX token
      amountIn: '100.0',
      chainId: '2'
    });
    console.log('Swap quote:', result);
    console.log(`Expected output: ${result.amountOut}`);
    console.log(`Price impact: ${result.priceImpact}`);
  } catch (error) {
    console.error('Quote failed:', error.message);
  }


// Example 3: Execute a token swap
  try {
    const result = await swap({
      tokenInAddress: 'coin', // KDA
      tokenOutAddress: 'kaddex.kdx', // KDX token
      account: 'k:account_key',
      amountIn: '50.0',
      slippage: 0.01, // 1% slippage tolerance
      chainId: '2'
    });
    console.log('Swap transaction:', result);
  } catch (error) {
    console.error('Swap failed:', error.message);
  }
*/
"""

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

BASELINE_JS = """
[CODE]
// Baseline function for Kadena blockchain transactions
// This code provides the infrastructure for:
// 1. Retrieving keys from AWS KMS
// 2. Transaction signing
// 3. Transaction submission
// The AI model should focus on implementing the transaction creation logic. The TRANSACTIONS functions will be pre-defined.

/**
 * Main baseline function that orchestrates the entire process
 */
async function baselineFunction() {
  try {
    // 1. Retrieve keys from KMS
    console.log("Retrieving keys from KMS...");
    const keyPair = await getKeys();
    console.log("Keys retrieved successfully");

    const balances = await getBalances("k:" + keyPair.publicKey);
    console.log(balances);

    // 2. Create transaction (placeholder)
    console.log("Creating transaction...");

    // ENTER AI CODE HERE

    console.log("Transaction created:", transaction);

    // 3. Sign the transaction
    console.log("Signing transaction...");
    const signature = await signTransaction(transaction, keyPair);
    console.log("Transaction signed successfully");

    // 4. Submit the transaction
    console.log("Submitting transaction...");
    const result = await submitTransaction({
      ...transaction,
      signature,
    });
    console.log("Transaction submitted successfully:", result);

    return result;
  } catch (error) {
    console.error("Error in baseline function:", error);
    throw error;
  }
}
[/CODE]
"""

def code(prompt: str) -> Dict[str, Any]:
    """
    Generate code for a trading agent based on the provided prompt.
    
    Args:
        prompt: The trading agent prompt to generate code for
        
    Returns:
        Dict containing the generated code and execution interval
    """
    model = ChatOpenAI(model="o4-mini")

    prompt_template = ChatPromptTemplate.from_messages([
        ("system", """
        You are <Agent K1>, a trading agent launcher created by Xade.

        Your task is to generate code to run on a serverless function to execute a user's trading positions on the Kadena Blockchain.
        You will be working only on mainnet01 and chain ID 2.
        You will be writing code in JavaScript.
        
        You will be provided with a prompt containing all the information required to handle and execute the trading position.
        You will be provided with the user's account details. You will also be provided with the balances of all the user's tokens.
        You will have access to all the functions you may need to include to achieve this task as well.

        Here are some resources to help you in your task:
        1. Transactions Documentation:
            {TRANSACTIONS_CODE}
            This snippet contains the docstring of functions to call the Transactions API to generate unsigned transactions. 
            These functuons will be pre-defined. You need to use them to generate transactions.
        2. Transactions Usage:
            {TRANSACTIONS_USAGE}
            This contains examples to call/access the various endpoints of the Transactions API.
        3. Documentation for Tokens:
            {TOKENS}
            This documentation contains information about all the tokens on the Kadena Blockchain.

        When a user prompt arrives:
        1. Analyze requirements:
        - Use the TOKENS documentation to validate any symbols or coins or addresses that the user provides.
        - Use the TRANSACTIONS CODE to understand the required functions and parameters.
        - Analyze the user's prompt to understand the steps required to execute the trading position.
        - Create a step-by-step plan to execute the trading position.
        2. Generate code:
        - Create a function for each step in the plan.
        - Hardcode all the parameters for each function based on the requirements, since all the parameters are known.
        - Use logic and knowledge of JavaScript syntax to write high-quality, efficient code for each function.
        - Use the TRANSACTIONS USAGE to understand how to call the various functions.
        - Input the code to create the transaction in the function provided. Input it in the area de-marked for you to do so.
        - Do not change any other code in the function. You can define variables wherever you want.

        - Special Case:
            a) If the user asks you for the value or price of a token, use the quotes transaction tool to get the price of the token.
            b) if the user asks for a value of any token, return it in terms of KDA and if they ask for vlaue of KDA, return in terms of zUSD.
        
        3. Always:
        - Think step-by-step before responding (internally).
        - Output the entire the baselineFunction().
        
        BASELINE FUNCTION:
        {BASELINE_JS}

        Output Format:
        > - Output Structured JSON with only the following keys:
        > - code (the code for baseline function)
        > - interval (AWS EventBridge schedule expression (e.g., "rate(5 minutes)", "cron(0 12 * * ? *)"))
        
        Notes:
            > - The user will not be involved in the execution. Thus, you must write impeccable code.
            > - The user's balance will be provided in the balances variable in the format: 
                {{
                coin: '4.998509',
                'kaddex.kdx': '1500',
                'n_b742b4e9c600892af545afb408326e82a6c0c6ed.zUSD': '0.5',
                'n_582fed11af00dc626812cd7890bb88e72067f28c.bro': '0.0015',
                'runonflux.flux': '1.70313993'
                }}
            > - Avoid over-engineering: keep the code simple yet effective.
            > - Whenever USD is mentioned, assume it is zUSD.
            > - Do not implement the continous execution logic. That will be handled by the AWS Lambda function.
            > - Remove all comments from the code.
        """),
        ("human", "{input}")
    ])

    formatted_prompt = prompt_template.format(
        input=prompt,
        TRANSACTIONS_CODE=TRANSACTIONS_CODE,
        TRANSACTIONS_USAGE=TRANSACTIONS_USAGE,
        TOKENS=TOKENS,
        BASELINE_JS=BASELINE_JS
    )

    response = model.invoke(formatted_prompt).content

    if response.startswith('```json'):
        response = response.replace('```json', '').replace('```', '').strip()
    elif response.startswith('```'):
        response = response.replace('```', '').strip()
    
    try:
        result = json.loads(response)
        return {
            "code": result['code'],
            "interval": result['interval']
        } 
    except json.JSONDecodeError:
        return {
            "error": "Failed to parse response as JSON",
            "raw_response": response
        }
