import { performAISwap, parseSwapRequest, getSwapDescription } from '../index';
import { CHAIN_ID, NETWORK, NETWORKID, KADDEX_NAMESPACE } from '../../constants/contextConstants';

// Mock token data
const mockTokens = {
  'coin': {
    name: 'KDA',
    code: 'coin',
    precision: 12
  },
  'token:bro': {
    name: 'BRO',
    code: 'n_582fed11af00dc626812cd7890bb88e72067f28c.bro',
    precision: 12
  },
  'token:heron': {
    name: 'HERON',
    code: 'n_e309f0fa7cf3a13f93a8da5325cdad32790d2070.heron',
    precision: 12
  }
};

// Mock Pact.fetch.local response for reserves
global.Pact = {
  fetch: {
    local: jest.fn().mockImplementation(() => Promise.resolve({
      result: {
        status: 'success',
        data: [
          100000.0, // token0 reserve
          50000.0,  // token1 reserve
          'swap-account' // pair account
        ]
      }
    }))
  },
  lang: {
    mkMeta: jest.fn(),
    mkCap: jest.fn()
  }
};

describe('Swap Agents Integration Tests', () => {
  const mockUserAccount = {
    account: 'k:test-account',
    guard: {
      keys: ['test-key'],
      pred: 'keys-all'
    }
  };

  describe('parseSwapRequest', () => {
    it('correctly parses various natural language inputs', () => {
      const testCases = [
        {
          input: 'swap 100 from KDA to BRO',
          expected: { amount: 100, fromToken: 'KDA', toToken: 'BRO' }
        },
        {
          input: 'sell 50.5 KDA get HERON',
          expected: { amount: 50.5, fromToken: 'KDA', toToken: 'HERON' }
        },
        {
          input: 'spend 75 input KDA output BRO',
          expected: { amount: 75, fromToken: 'KDA', toToken: 'BRO' }
        }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = parseSwapRequest(input);
        expect(result).toEqual(expected);
      });
    });

    it('throws error for invalid input formats', () => {
      const invalidInputs = [
        'swap KDA to BRO', // missing amount
        '100 KDA', // missing destination
        'swap hundred KDA to BRO' // invalid amount format
      ];

      invalidInputs.forEach(input => {
        expect(() => parseSwapRequest(input)).toThrow();
      });
    });
  });

  describe('performAISwap', () => {
    it('generates valid swap transaction for KDA to BRO', async () => {
      const input = {
        request: 'swap 100 from KDA to BRO',
        availableTokens: mockTokens,
        userAccount: mockUserAccount,
        config: {
          slippage: 0.01,
          ttl: 600,
          enableGasStation: false
        }
      };

      const result = await performAISwap(input);

      // Verify the structure of the response
      expect(result).toHaveProperty('parsedRequest');
      expect(result).toHaveProperty('details');
      expect(result.details).toHaveProperty('unsignedTx');
      
      // Verify the transaction details
      const tx = result.details.unsignedTx;
      expect(tx).toHaveProperty('pactCode');
      expect(tx).toHaveProperty('caps');
      expect(tx).toHaveProperty('sender');
      expect(tx).toHaveProperty('chainId', CHAIN_ID);
      expect(tx).toHaveProperty('networkId', NETWORKID);
    });

    it('handles burn fees for HERON token', async () => {
      const input = {
        request: 'swap 100 from KDA to HERON',
        availableTokens: mockTokens,
        userAccount: mockUserAccount
      };

      const result = await performAISwap(input);
      
      // Verify burn fee handling in transaction
      expect(result.details.unsignedTx.pactCode).toContain('transfer');
      expect(result.details.unsignedTx.envData).toHaveProperty('token1BurnAmount');
    });

    it('calculates correct price impact', async () => {
      const input = {
        request: 'swap 1000 from KDA to BRO',
        availableTokens: mockTokens,
        userAccount: mockUserAccount
      };

      const result = await performAISwap(input);
      
      // Verify price impact calculation
      expect(result.details).toHaveProperty('priceImpact');
      expect(result.details.priceImpact).toBeGreaterThan(0);
      expect(result.details.priceImpact).toBeLessThan(1);
    });
  });

  describe('getSwapDescription', () => {
    it('generates readable description with all required details', () => {
      const swapDetails = {
        fromToken: { name: 'KDA' },
        toToken: { name: 'BRO' },
        inputAmount: 100,
        outputAmount: 48.5,
        priceImpact: 0.02,
        slippage: 0.01
      };

      const description = getSwapDescription(swapDetails);
      
      expect(description).toContain('100 KDA');
      expect(description).toContain('48.5 BRO');
      expect(description).toContain('2.00%'); // price impact
      expect(description).toContain('1.00%'); // slippage
    });
  });
});
