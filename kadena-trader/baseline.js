// DCA Trading Agent for Kadena Blockchain
// Buys 1 zUSD using KDA every 30 minutes if 1 KDA > 0.6 zUSD

const kadenaApi = require("./kadenaApi"); // adjust path as needed

// Configuration
const CHAIN_ID = "2";
const KDA_TOKEN = "coin";
const USD_TOKEN = "n_b742b4e9c600892af545afb408326e82a6c0c6ed.zUSD";
const USD_PER_TRADE = "1"; // buy 1 zUSD each time
const PRICE_THRESHOLD = 0.6; // in zUSD per KDA
const SLIPPAGE = 0.005; // 0.5%
const INTERVAL_MS = 15 * 1000; // 15 seconds

// Initialize API key from env
/**
 * Get current market price of 1 KDA in zUSD
 * @returns {Promise<number>}
 */
async function getKdaPriceInUsd() {
  const quoteRes = await kadenaApi.quote({
    tokenInAddress: KDA_TOKEN,
    tokenOutAddress: USD_TOKEN,
    amountIn: "1",
    chainId: CHAIN_ID,
  });
  return parseFloat(quoteRes.amountOut);
}

/**
 * Get required KDA to buy a given amount of zUSD
 * @param {string} usdAmount
 * @returns {Promise<number>}
 */
async function getRequiredKdaForUsd(usdAmount) {
  const quoteRes = await kadenaApi.quote({
    tokenInAddress: KDA_TOKEN,
    tokenOutAddress: USD_TOKEN,
    amountOut: usdAmount,
    chainId: CHAIN_ID,
  });
  return parseFloat(quoteRes.amountIn);
}

/**
 * Execute the swap: KDA -> zUSD
 * @param {string} usdAmount
 * @param {string} account
 * @returns {Promise<Object>}
 */
async function executeSwap(usdAmount, account) {
  return await kadenaApi.swap({
    tokenInAddress: KDA_TOKEN,
    tokenOutAddress: USD_TOKEN,
    account: account,
    amountOut: usdAmount,
    slippage: SLIPPAGE,
    chainId: CHAIN_ID,
  });
}

/**
 * Start the DCA agent
 * @param {Object} params
 * @param {string} params.account - "k:..." Kadena account key
 * @param {Object} params.balances - User balances, e.g. { coin: "123.45", ... }
 */
function startDcaAgent({ account, balances }) {
  let kdaBalance = parseFloat(balances[KDA_TOKEN] || "0");

  // perform one iteration: price check + possible swap
  async function iteration() {
    try {
      const price = await getKdaPriceInUsd();
      console.log(`[DCA] Current KDA price: ${price} zUSD`);

      if (price <= PRICE_THRESHOLD) {
        console.log(
          `[DCA] Price below threshold (${PRICE_THRESHOLD}), skipping trade.`
        );
        return;
      }

      const requiredKda = await getRequiredKdaForUsd(USD_PER_TRADE);
      console.log(`[DCA] KDA needed for 1 zUSD: ${requiredKda}`);

      if (requiredKda > kdaBalance) {
        console.log("[DCA] Insufficient KDA balance, stopping agent.");
        clearInterval(timerId);
        return;
      }

      // execute swap
      const tx = await executeSwap(USD_PER_TRADE, account);
      console.log("[DCA] Swap executed:", tx);

      // deduct spent KDA from local balance
      kdaBalance -= requiredKda;
      console.log(`[DCA] Remaining KDA balance (approx): ${kdaBalance}`);

      if (kdaBalance <= 0) {
        console.log("[DCA] KDA depleted, stopping agent.");
        clearInterval(timerId);
      }
    } catch (err) {
      console.error("[DCA] Error in iteration:", err.message);
    }
  }

  // run first iteration immediately
  iteration();

  // schedule subsequent iterations
  const timerId = setInterval(iteration, INTERVAL_MS);
}

// Export the agent entrypoint
module.exports = { startDcaAgent };
