import OpenAISwapAgent from '../OpenAISwapAgent';

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
          100000.0,
          50000.0,
          'swap-account'
        ]
      }
    }))
  },
  lang: {
    mkMeta: jest.fn(),
    mkCap: jest.fn()
  }
};

describe('OpenAISwapAgent Tests', () => {
  let agent;
  
  const mockUserAccount = {
    account: 'k:test-account',
    guard: {
      keys: ['test-key'],
      pred: 'keys-all'
    }
  };

  beforeEach(() => {
    agent = new OpenAISwapAgent();
  });

  describe('Natural Language Processing', () => {
    it('correctly processes simple swap requests', async () => {
      const request = 'swap 100 KDA for BRO';
      
      const result = await agent.processNaturalLanguage(request, mockTokens);
      
      expect(result).toHaveProperty('fromToken', 'KDA');
      expect(result).toHaveProperty('toToken', 'BRO');
      expect(result).toHaveProperty('amount', 100);
      expect(result).toHaveProperty('confidence');
    });

    it('handles requests with slippage specification', async () => {
      const request = 'swap 50.5 KDA to BRO with 2% slippage';
      
      const result = await agent.processNaturalLanguage(request, mockTokens);
      
      expect(result).toHaveProperty('slippage', 0.02);
    });

    it('handles complex natural language inputs', async () => {
      const requests = [
        'I want to exchange 75 KDA tokens for BRO please',
        'convert my 100 KDA into BRO tokens',
        'trade 50 kadena coins for brother tokens',
        'need to swap 25 KDA to get some BRO'
      ];

      for (const request of requests) {
        const result = await agent.processNaturalLanguage(request, mockTokens);
        expect(result).toHaveProperty('fromToken');
        expect(result).toHaveProperty('toToken');
        expect(result).toHaveProperty('amount');
      }
    });
  });

  describe('Token Matching', () => {
    it('matches tokens with fuzzy search', async () => {
      const queries = [
        'kadena',
        'KDA',
        'brother coin',
        'BRO token'
      ];

      for (const query of queries) {
        const result = await agent.findTokenWithGPT(query, mockTokens);
        expect(result).toBeTruthy();
      }
    });

    it('handles misspelled token names', async () => {
      const misspelledQueries = [
        'kadina',
        'brot token',
        'brothr'
      ];

      for (const query of misspelledQueries) {
        const result = await agent.findTokenWithGPT(query, mockTokens);
        expect(result).toBeTruthy();
      }
    });
  });

  describe('Complete Swap Flow', () => {
    it('processes complete swap request successfully', async () => {
      const input = {
        request: 'swap 100 KDA for BRO tokens with 1% slippage',
        availableTokens: mockTokens,
        userAccount: mockUserAccount
      };

      const result = await agent.processSwapRequest(input);
      
      expect(result).toHaveProperty('parsedRequest');
      expect(result).toHaveProperty('gptConfidence');
      expect(result).toHaveProperty('details');
      expect(result.details).toHaveProperty('unsignedTx');
    });

    it('generates enhanced swap descriptions', async () => {
      const details = {
        fromToken: { name: 'KDA' },
        toToken: { name: 'BRO' },
        inputAmount: 100,
        outputAmount: 48.5,
        priceImpact: 0.02,
        slippage: 0.01
      };

      const description = await agent.getEnhancedSwapDescription(details);
      
      expect(description).toContain('KDA');
      expect(description).toContain('BRO');
      expect(description).toContain('100');
      expect(description).toContain('48.5');
    });

    it('handles errors gracefully', async () => {
      const invalidRequest = {
        request: 'invalid request without proper structure',
        availableTokens: mockTokens,
        userAccount: mockUserAccount
      };

      await expect(agent.processSwapRequest(invalidRequest)).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('handles invalid token pairs', async () => {
      const input = {
        request: 'swap 100 INVALIDTOKEN for BRO',
        availableTokens: mockTokens,
        userAccount: mockUserAccount
      };

      await expect(agent.processSwapRequest(input)).rejects.toThrow();
    });

    it('validates swap parameters', async () => {
      const invalidInputs = [
        'swap -100 KDA for BRO',
        'swap KDA for BRO',
        'swap billion KDA for BRO'
      ];

      for (const request of invalidInputs) {
        await expect(
          agent.processSwapRequest({
            request,
            availableTokens: mockTokens,
            userAccount: mockUserAccount
          })
        ).rejects.toThrow();
      }
    });
  });
});
