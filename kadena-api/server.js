// Load environment variables first
require("dotenv").config();

console.log("Server.js is being loaded...");
console.log("Environment variables:", {
  API_KEY: process.env.API_KEY,
  PORT: process.env.PORT,
});

const express = require("express");
const cors = require("cors");
const config = require("./config");
const { PORT, RATE_LIMIT, API_KEY, KADENA_NETWORK_ID, KADENA_API_HOST } =
  config;

let rateLimit, helmet, morgan;
try {
  rateLimit = require("express-rate-limit");
  helmet = require("helmet");
  morgan = require("morgan");
} catch (err) {
  console.warn("Optional dependencies not available");
}

// --- Express App Setup ---
const app = express();

// --- Middleware ---
if (rateLimit) {
  const apiLimiter = rateLimit({
    windowMs: RATE_LIMIT.windowMs,
    max: RATE_LIMIT.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many requests",
      details: "Rate limit exceeded",
    },
  });
  app.use(apiLimiter);
}

if (helmet) {
  app.use(helmet());
}

if (morgan) {
  app.use(morgan("dev"));
}

app.use(cors());
app.use(express.json());

// API key middleware
app.use((req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey) {
    return res.status(401).json({
      error: "Unauthorized",
      details: "API key is required",
    });
  }

  if (!API_KEY.has(apiKey)) {
    return res.status(403).json({
      error: "Forbidden",
      details: "Invalid API key",
    });
  }

  next();
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    details: err.message,
  });
});

// --- Routes ---
app.use("/", require("./routes/health"));
app.use("/swap", require("./routes/swap"));
app.use("/nft", require("./routes/nft"));
app.use("/transfer", require("./routes/transfer"));

// --- Server Start ---
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Kadena API server listening on port ${PORT}`);
    console.log(
      `Targeting Kadena Network ID: ${KADENA_NETWORK_ID} on ${KADENA_API_HOST}`
    );
    console.log("---");
    console.log("Available Endpoints:");
    console.log("/health (Health check endpoint)");
    console.log(
      "/quote (Body: { tokenInAddress, tokenOutAddress, amountIn | amountOut, chainId: '0-19' })"
    );
    console.log(
      "/swap (Body: { tokenInAddress, tokenOutAddress, amountIn | amountOut, account, slippage?, chainId: '0-19' })"
    );
    console.log(
      "/nft/launch (Body: { account, guard, mintTo, uri, precision?, policy?, collectionId, royalties?, royaltyRecipient?, name?, description?, chainId: '0-19' })"
    );
    console.log(
      "/nft/collection (Body: { account, guard, name, description?, totalSupply?, chainId: '0-19' })"
    );
    console.log(
      "/transfer (Body: { tokenAddress, sender, receiver, amount, chainId: '0-19', meta?, gasLimit?, gasPrice?, ttl? })"
    );
  });
}

// Export app for routes
module.exports = { app };
