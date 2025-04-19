const express = require("express");
const cors = require("cors");
const {
  processQuery,
  processAdditionalParams,
} = require("./services/agentService");
const config = require("./config");

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Process a natural language query
app.post("/api/query", async (req, res) => {
  try {
    const {
      query,
      defaultParams = {},
      conversationId,
      additionalParams,
      currentParams,
    } = req.body;

    // If this is a follow-up with additional parameters
    if (additionalParams && currentParams) {
      const result = await processAdditionalParams(
        currentParams,
        additionalParams
      );
      return res.status(result.success ? 200 : 400).json({
        ...result,
        conversationId,
      });
    }

    // Initial query must have a query string
    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Query is required",
      });
    }

    // Process the initial query
    const result = await processQuery(query, defaultParams);

    // Generate a simple conversation ID if needed
    const responseConversationId =
      conversationId || `conversation-${Date.now()}`;

    return res.status(result.success ? 200 : 400).json({
      ...result,
      conversationId: responseConversationId,
    });
  } catch (error) {
    console.error("Error processing API request:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Get server configuration
app.get("/api/config", (req, res) => {
  // Return public configuration only
  res.status(200).json({
    network: {
      id: config.network.id,
      chainId: config.network.chainId,
    },
  });
});

// Start the server
const PORT = config.server.port;
app.listen(PORT, () => {
  console.log(`Kadena Agent is running on port ${PORT}`);
});

module.exports = app;
