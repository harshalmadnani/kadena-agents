import OpenAISwapAgent from './OpenAISwapAgent.js';

// Mock token data with correct codes
const mockTokens = {
  'coin': {
    name: 'KDA',
    code: 'coin',
    precision: 12
  },
  'n_582fed11af00dc626812cd7890bb88e72067f28c.bro': {
    name: 'BRO',
    code: 'n_582fed11af00dc626812cd7890bb88e72067f28c.bro',
    precision: 12
  },
  'n_e309f0fa7cf3a13f93a8da5325cdad32790d2070.heron': {
    name: 'HERON',
    code: 'n_e309f0fa7cf3a13f93a8da5325cdad32790d2070.heron',
    precision: 12
  }
};

const mockPairReserves = {
  token0: 100000.0,
  token1: 50000.0,
  account: 'swap-account'
};

const runAISwapDemo = async (userInput) => {
  try {
    // Initialize OpenAI agent
    const agent = new OpenAISwapAgent();

    const mockUserAccount = {
      account: "k:d61e615aec4e895c0006f7f2e56b37d36f18f35cce28286ad33e5bc52ded867a",
      guard: {
        keys: ["d61e615aec4e895c0006f7f2e56b37d36f18f35cce28286ad33e5bc52ded867a"],
        pred: "keys-all"
      }
    };

    // Mock getPairReserves to return test data
    agent.getPairReserves = async () => mockPairReserves;

    // Process the request
    console.log(`\nProcessing request: "${userInput}"`);
    console.log('----------------------------------------');

    // First, test natural language processing
    const parsed = await agent.processNaturalLanguage(userInput, mockTokens);
    console.log('\nNatural Language Processing:');
    console.log('----------------------------');
    console.log('From Token:', parsed.fromToken);
    console.log('To Token:', parsed.toToken);
    console.log('Amount:', parsed.amount);
    console.log('Slippage:', parsed.slippage);
    console.log('Confidence:', parsed.confidence);

    // Then process complete swap
    const result = await agent.processSwapRequest({
      request: userInput,
      availableTokens: mockTokens,
      userAccount: mockUserAccount,
      config: {
        enableGasStation: true
      }
    });

    // Get enhanced description
    const description = await agent.getEnhancedSwapDescription(result.details);

    // Log swap details
    console.log('\nSwap Details:');
    console.log('-------------');
    console.log('Input:', `${result.details.inputAmount} ${result.details.fromToken.name}`);
    console.log('Output:', `${result.details.outputAmount.toFixed(6)} ${result.details.toToken.name}`);
    console.log('Price Impact:', `${(result.details.priceImpact * 100).toFixed(2)}%`);
    console.log('Slippage:', `${(result.details.slippage * 100).toFixed(2)}%`);

    console.log('\nAI Description:');
    console.log('--------------');
    console.log(description);

    // Log the unsigned transaction
    console.log('\nUnsigned Transaction:');
    console.log('--------------');
    console.log('Pact Code:');
    console.log(result.details.unsignedTx.pactCode);
    console.log('\nCapabilities:');
    console.log(JSON.stringify(result.details.unsignedTx.caps, null, 2));
    console.log('\nTransaction Data:');
    console.log(JSON.stringify({
      sender: result.details.unsignedTx.sender,
      chainId: result.details.unsignedTx.chainId,
      gasLimit: result.details.unsignedTx.gasLimit,
      gasPrice: result.details.unsignedTx.gasPrice,
      ttl: result.details.unsignedTx.ttl,
      networkId: result.details.unsignedTx.networkId
    }, null, 2));
    console.log('\nEnvironment Data:');
    console.log(JSON.stringify(result.details.unsignedTx.envData, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  }
};

// Get user input from command line
const userInput = process.argv[2];

if (!userInput) {
  console.error('Please provide a swap request. Example:');
  console.error('node demo.js "swap 100 KDA for BRO with 1% slippage"');
  process.exit(1);
}

// Run demo with user input
console.log('=================================');
console.log('AI Swap Agent Demo');
console.log('=================================');

runAISwapDemo(userInput)
  .then(() => {
    console.log('\n=================================');
    console.log('Demo Complete');
    console.log('=================================');
  })
  .catch(error => {
    console.error('Demo failed:', error);
    process.exit(1);
  });
