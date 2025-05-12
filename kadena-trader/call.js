// call.js

// Import the DCA agent entrypoint from baseline.js
const { startDcaAgent } = require("./baseline");

// Example account and balances
const account =
  "k:d61e615aec4e895c0006f7f2e56b37d36f18f35cce28286ad33e5bc52ded867a"; // must include "k:" prefix
const balances = {
  coin: "12.3456", // KDA balance as a string
  "n_b742b4e9c600892af545afb408326e82a6c0c6ed.zUSD": "3.21", // zUSD balance as a string
  // Add other token balances as needed
};

// Start the DCA agent
startDcaAgent({ account, balances });
