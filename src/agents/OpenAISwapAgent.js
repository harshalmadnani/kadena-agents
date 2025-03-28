import SwapAgent from './SwapAgent.js';
import OpenAI from 'openai';

/**
 * OpenAISwapAgent extends SwapAgent with GPT capabilities
 */
class OpenAISwapAgent extends SwapAgent {
  constructor() {
    super();
    this.openai = new OpenAI({
      apiKey:
        'xxx',
    });
    this.systemPrompt = this.getSystemPrompt();
  }

  /**
   * Extract JSON from GPT's response, handling markdown formatting
   */
  extractJSON(text) {
    // Remove markdown code block syntax if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    // Remove any trailing or leading whitespace
    text = text.trim();

    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`Invalid JSON in response: ${text}`);
    }
  }

  /**
   * Get the system prompt for GPT
   */
  getSystemPrompt() {
    return `You are a DeFi swap assistant that helps users trade tokens on a decentralized exchange.
Your task is to analyze user requests and extract swap parameters accurately.

For each request, identify:
1. The input token (from)
2. The output token (to)
3. The amount to swap
4. Any specific conditions (slippage, minimum output)

Respond with ONLY a JSON object in the following format (no additional text):
{
  "inputToken": string,
  "outputToken": string,
  "amount": number,
  "slippage": number (optional),
  "minOutput": number (optional),
  "confidence": number (0-1)
}`;
  }

  /**
   * Process natural language request using GPT
   */
  async processNaturalLanguage(userRequest, availableTokens) {
    try {
      const tokenContext = Object.values(availableTokens)
        .map((token) => `${token.name} (${token.code})`)
        .join(', ');

      const messages = [
        { role: 'system', content: this.systemPrompt },
        { role: 'system', content: `Available tokens: ${tokenContext}` },
        { role: 'user', content: userRequest },
      ];

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        temperature: 0.1,
        max_tokens: 200,
      });

      const result = this.extractJSON(response.choices[0].message.content);

      if (!result.inputToken || !result.outputToken || !result.amount) {
        throw new Error('Invalid swap parameters extracted from natural language request');
      }

      return {
        fromToken: result.inputToken.toUpperCase(),
        toToken: result.outputToken.toUpperCase(),
        amount: result.amount,
        slippage: result.slippage || 0.01,
        confidence: result.confidence || 1.0,
      };
    } catch (error) {
      throw new Error(`Failed to process natural language request: ${error.message}`);
    }
  }

  /**
   * Find token using GPT for fuzzy matching
   */
  async findTokenWithGPT(tokenQuery, availableTokens) {
    const messages = [
      {
        role: 'system',
        content: `You are a token matching assistant. Given a user's token query and a list of available tokens, 
                 find the best matching token. Return only the exact token code as a plain string, no JSON or additional text.`,
      },
      {
        role: 'system',
        content: `Available tokens: ${JSON.stringify(
          Object.values(availableTokens).map((t) => ({
            name: t.name,
            code: t.code,
          }))
        )}`,
      },
      { role: 'user', content: tokenQuery },
    ];

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.1,
      max_tokens: 50,
    });

    const matchedToken = response.choices[0].message.content
      .trim()
      .replace(/```\n?/g, '') // Remove code blocks if present
      .replace(/"/g, '') // Remove quotes if present
      .trim();

    return availableTokens[matchedToken] || null;
  }

  /**
   * Process a complete swap request with GPT-enhanced understanding
   */
  async processSwapRequest(input) {
    try {
      const parsedRequest = await this.processNaturalLanguage(input.request, input.availableTokens);
      const fromToken = await this.findTokenWithGPT(parsedRequest.fromToken, input.availableTokens);
      const toToken = await this.findTokenWithGPT(parsedRequest.toToken, input.availableTokens);

      if (!fromToken || !toToken) {
        throw new Error('Could not find matching tokens for the request');
      }

      this.configure({
        slippage: parsedRequest.slippage,
        ...input.config,
      });

      const unsignedTx = await this.generateSwapCommand({
        fromToken,
        toToken,
        amount: parsedRequest.amount,
        userAccount: input.userAccount,
        isExactIn: true,
      });

      const pairReserves = await this.getPairReserves(fromToken.code, toToken.code);
      const outputAmount = this.computeOut(parsedRequest.amount, pairReserves);
      const priceImpact = this.computePriceImpact(parsedRequest.amount, outputAmount, pairReserves);

      return {
        parsedRequest,
        gptConfidence: parsedRequest.confidence,
        details: {
          fromToken,
          toToken,
          inputAmount: parsedRequest.amount,
          outputAmount,
          priceImpact,
          slippage: this.slippage,
          unsignedTx,
        },
      };
    } catch (error) {
      throw new Error(`Failed to process swap request: ${error.message}`);
    }
  }

  /**
   * Get enhanced swap description using GPT
   */
  async getEnhancedSwapDescription(details) {
    const prompt = `Given the following swap details, provide a clear and informative description for the user:
    - Input: ${details.inputAmount} ${details.fromToken.name}
    - Output: ${details.outputAmount} ${details.toToken.name}
    - Price Impact: ${(details.priceImpact * 100).toFixed(2)}%
    - Slippage Tolerance: ${(details.slippage * 100).toFixed(2)}%

    Include any relevant warnings or suggestions based on the price impact and other factors.
    Keep the response concise but informative. Respond with plain text only, no markdown or formatting.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful DeFi assistant explaining swap details to users. Provide clear, plain text responses without any markdown or special formatting.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    return response.choices[0].message.content.trim();
  }
}

export default OpenAISwapAgent;
