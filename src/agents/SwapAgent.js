import Pact from '../mocks/pact.js';
import { reduceBalance } from '../utils/reduceBalance.js';
import { CHAIN_ID, NETWORK, NETWORKID, KADDEX_NAMESPACE, NETWORK_VERSION } from '../constants/contextConstants.js';

/**
 * Core SwapAgent class to handle token swap functionality
 */
class SwapAgent {
  constructor() {
    this.BURN_WALLET = 'c:KI4cQnLt-DLK31X7mKay1c3DNPr-adIel5op8CkEOYo';
    this.BURN_FEE = 0.01; // 1% burn fee
    this.FEE = 0.003; // 0.3% trading fee

    // Initialize with default values
    this.slippage = 0.01; // 1% default slippage
    this.ttl = 600; // 10 minutes
    this.enableGasStation = false;
  }

  /**
   * Configure agent settings
   */
  configure(config = {}) {
    this.slippage = config.slippage || this.slippage;
    this.ttl = config.ttl || this.ttl;
    this.enableGasStation = config.enableGasStation || this.enableGasStation;
  }

  /**
   * Check if token requires burn fee
   */
  isBurnToken(tokenAddress) {
    return tokenAddress !== 'coin' && tokenAddress.includes('n_e309f0fa7cf3a13f93a8da5325cdad32790d2070.heron');
  }

  /**
   * Calculate burn amount for applicable tokens
   */
  calculateBurnAmount(amount, precision) {
    return reduceBalance(amount * this.BURN_FEE, precision);
  }

  /**
   * Calculate output amount for direct swaps
   */
  computeOut(amountIn, reserves) {
    const reserveIn = Number(reserves.token0);
    const reserveOut = Number(reserves.token1);
    const numerator = amountIn * (1 - this.FEE) * reserveOut;
    const denominator = reserveIn + amountIn * (1 - this.FEE);
    return denominator !== 0 ? numerator / denominator : 0;
  }

  /**
   * Calculate input amount required for desired output
   */
  computeIn(amountOut, reserves) {
    const reserveIn = Number(reserves.token0);
    const reserveOut = Number(reserves.token1);
    const numerator = reserveIn * amountOut;
    const denominator = (reserveOut - amountOut) * (1 - this.FEE);
    return denominator !== 0 ? numerator / denominator : 0;
  }

  /**
   * Calculate price impact of a swap
   */
  computePriceImpact(amountIn, amountOut, reserves) {
    const reserveIn = Number(reserves.token0);
    const reserveOut = Number(reserves.token1);
    const midPrice = reserveIn !== 0 ? reserveOut / reserveIn : 0;
    const exactQuote = amountIn * midPrice;
    return exactQuote !== 0 ? (exactQuote - amountOut) / exactQuote : 0;
  }

  /**
   * Generate unsigned swap transaction command
   */
  async generateSwapCommand({ fromToken, toToken, amount, userAccount, isExactIn = true, gasLimit = 150000, gasPrice = 0.000001 }) {
    try {
      const pairReserves = await this.getPairReserves(fromToken.code, toToken.code);
      const hasBurnToken = this.isBurnToken(fromToken.code) || this.isBurnToken(toToken.code);

      const fromAmount = reduceBalance(amount, fromToken.precision);
      const toAmount = this.computeOut(fromAmount, pairReserves);
      const toAmountWithSlippage = reduceBalance(toAmount * (1 - this.slippage), toToken.precision);

      const pactCode = this.generatePactCode({
        fromToken,
        toToken,
        userAccount,
        hasBurnToken,
        isExactIn,
      });

      const caps = this.generateCaps({
        fromToken,
        toToken,
        fromAmount,
        toAmountWithSlippage,
        userAccount,
        pairAccount: pairReserves.account,
        hasBurnToken,
      });

      return {
        pactCode,
        caps,
        sender: this.enableGasStation ? 'kaddex-free-gas' : userAccount,
        gasLimit,
        gasPrice,
        chainId: CHAIN_ID,
        ttl: this.ttl,
        envData: {
          'user-ks': userAccount.guard,
          token0Amount: fromAmount,
          token1Amount: toAmount,
          token0AmountWithSlippage: fromAmount * (1 + this.slippage),
          token1AmountWithSlippage: toAmountWithSlippage,
          ...(hasBurnToken && {
            token0BurnAmount: this.calculateBurnAmount(fromAmount, fromToken.precision),
            token1BurnAmount: this.calculateBurnAmount(toAmount, toToken.precision),
          }),
        },
        networkId: NETWORKID,
        networkVersion: NETWORK_VERSION,
      };
    } catch (error) {
      throw new Error(`Failed to generate swap command: ${error.message}`);
    }
  }

  /**
   * Get pair reserves from blockchain
   */
  async getPairReserves(token0, token1) {
    try {
      const data = await Pact.fetch.local(
        {
          pactCode: `
          (use ${KADDEX_NAMESPACE}.exchange)
          (let*
            (
              (p (get-pair ${token0} ${token1}))
              (reserveA (reserve-for p ${token0}))
              (reserveB (reserve-for p ${token1}))
              (pairAccount (at 'account p))
            )[reserveA reserveB pairAccount])
          `,
          meta: Pact.lang.mkMeta('', CHAIN_ID, 0.000001, 150000, Math.floor(Date.now() / 1000), this.ttl),
        },
        NETWORK
      );

      if (data.result.status === 'success') {
        return {
          token0: data.result.data[0],
          token1: data.result.data[1],
          account: data.result.data[2],
        };
      }
      throw new Error('Failed to get pair reserves');
    } catch (error) {
      throw new Error(`Error fetching pair reserves: ${error.message}`);
    }
  }

  /**
   * Generate Pact code for swap transaction
   */
  generatePactCode({ fromToken, toToken, userAccount, hasBurnToken, isExactIn }) {
    const pactTokenArray = `${fromToken.code} ${toToken.code}`;

    const burnTransfers = [];
    if (hasBurnToken) {
      if (this.isBurnToken(fromToken.code)) {
        burnTransfers.push(
          `(${fromToken.code}.transfer ${JSON.stringify(userAccount)} ${JSON.stringify(this.BURN_WALLET)} (read-decimal 'token0BurnAmount))`
        );
      }
      if (this.isBurnToken(toToken.code)) {
        burnTransfers.push(
          `(${toToken.code}.transfer ${JSON.stringify(userAccount)} ${JSON.stringify(this.BURN_WALLET)} (read-decimal 'token1BurnAmount))`
        );
      }
    }

    const swapFunction = isExactIn ? 'swap-exact-in' : 'swap-exact-out';

    if (hasBurnToken) {
      return `
        (let (
          (res   
           (${KADDEX_NAMESPACE}.exchange.${swapFunction}
            (read-decimal 'token0Amount)
            (read-decimal 'token1AmountWithSlippage)
            [${pactTokenArray}]
            ${JSON.stringify(userAccount)}
            ${JSON.stringify(userAccount)}
            (read-keyset 'user-ks)
          ))
        )
          ${burnTransfers.join('\n')}
          res
        )
      `;
    }

    return `
      (${KADDEX_NAMESPACE}.exchange.${swapFunction}
        (read-decimal 'token0Amount)
        (read-decimal 'token1AmountWithSlippage)
        [${pactTokenArray}]
        ${JSON.stringify(userAccount)}
        ${JSON.stringify(userAccount)}
        (read-keyset 'user-ks)
      )
    `;
  }

  /**
   * Generate capabilities for swap transaction
   */
  generateCaps({ fromToken, toToken, fromAmount, toAmountWithSlippage, userAccount, pairAccount, hasBurnToken }) {
    const baseCaps = [
      ...(this.enableGasStation
        ? [Pact.lang.mkCap('Gas Station', 'free gas', `${KADDEX_NAMESPACE}.gas-station.GAS_PAYER`, ['kaddex-free-gas', { int: 1 }, 1.0])]
        : [Pact.lang.mkCap('gas', 'pay gas', 'coin.GAS')]),
    ];

    const burnCaps = [];
    if (hasBurnToken) {
      if (this.isBurnToken(fromToken.code)) {
        burnCaps.push(
          Pact.lang.mkCap('burn transfer capability', 'transfer burn fee', `${fromToken.code}.TRANSFER`, [
            userAccount,
            this.BURN_WALLET,
            this.calculateBurnAmount(fromAmount, fromToken.precision),
          ])
        );
      }
      if (this.isBurnToken(toToken.code)) {
        burnCaps.push(
          Pact.lang.mkCap('burn transfer capability', 'transfer burn fee', `${toToken.code}.TRANSFER`, [
            userAccount,
            this.BURN_WALLET,
            this.calculateBurnAmount(toAmountWithSlippage, toToken.precision),
          ])
        );
      }
    }

    const swapCaps = [
      Pact.lang.mkCap('transfer capability', 'transfer token in', `${fromToken.code}.TRANSFER`, [userAccount, pairAccount, fromAmount]),
    ];

    return [...baseCaps, ...burnCaps, ...swapCaps];
  }
}

export default SwapAgent;
