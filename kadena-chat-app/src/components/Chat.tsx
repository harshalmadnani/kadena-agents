import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../context/WalletContext";
import {
  chatApi,
  TransactionData,
  TransactionResponse,
  QuoteResponse,
  TransactionMetadata,
  NFTMetadata,
  TransactionQuote,
} from "../services/api";
import walletService, { SignAndSubmitResult } from "../services/walletService";
import WalletInfo from "./WalletInfo";
import "./Chat.css";
import { getAllBalances } from "../utils/transactions";

interface Message {
  role: "user" | "assistant";
  content: string;
  isMarkdown?: boolean;
}

interface UserContext {
  accountName: string;
  publicKey: string;
  chainId: string;
}

// Define transaction response interface
interface TransactionResponseData {
  transaction: {
    cmd: string;
    hash: string;
    sigs: (string | null)[];
  };
  quote?: {
    expectedIn: string;
    expectedOut: string;
    slippage: number;
    priceImpact: string;
  };
  [key: string]: any;
}

const SendButton = () => (
  <span
    style={{
      fontSize: "14px",
      fontWeight: 500,
      color: "#000000",
    }}
  >
    Send
  </span>
);

const LoadingDots = () => (
  <div className="loading-dots">
    <div className="dot"></div>
    <div className="dot"></div>
    <div className="dot"></div>
  </div>
);

const Chat: React.FC = () => {
  const { user, logout } = useAuth();
  const { balances } = useWallet();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingTransaction, setPendingTransaction] =
    useState<TransactionResponse | null>(null);
  const [transactionResult, setTransactionResult] =
    useState<SignAndSubmitResult | null>(null);
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom whenever messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Format transaction response for display
  const formatTransactionResponse = (response: any): string => {
    // Handle quote-only response
    if ("amountOut" in response && "priceImpact" in response) {
      const quoteResponse = response as QuoteResponse;
      return (
        `### Quote Details\n` +
        `- **${quoteResponse.text}:** ${quoteResponse.amountOut}\n` +
        `- **Price Impact:** ${quoteResponse.priceImpact}%\n`
      );
    }

    // Handle transaction response
    if (response.transaction) {
      const txResponse = response as TransactionResponse;
      let formattedResponse = `## Transaction Generated\n`;

      // Handle swap quote details
      if (txResponse.quote) {
        formattedResponse +=
          `### Exchange Details\n` +
          `- **Input Amount:** ${txResponse.quote.expectedIn}\n` +
          `- **Output Amount:** ${txResponse.quote.expectedOut}\n` +
          `- **Price Impact:** ${txResponse.quote.priceImpact}%\n` +
          `- **Slippage Tolerance:** ${txResponse.quote.slippage}%\n\n`;
      }

      // Handle transfer metadata
      if (txResponse.metadata && "sender" in txResponse.metadata) {
        const metadata = txResponse.metadata as TransactionMetadata;
        formattedResponse +=
          `### Transfer Details\n` +
          `- **From:** ${metadata.sender}\n` +
          `- **To:** ${metadata.receiver}\n` +
          `- **Amount:** ${metadata.formattedAmount}\n` +
          `- **Token:** ${metadata.tokenAddress}\n` +
          `- **Estimated Gas:** ${metadata.estimatedGas} KDA\n\n`;
      }

      // Handle NFT metadata
      if (txResponse.metadata && "uri" in txResponse.metadata) {
        const metadata = txResponse.metadata as NFTMetadata;
        formattedResponse +=
          `### NFT Details\n` +
          `- **Name:** ${metadata.name}\n` +
          `- **Description:** ${metadata.description}\n` +
          `- **Collection:** ${metadata.collection}\n` +
          `- **Royalties:** ${metadata.royalties}\n` +
          `- **URI:** ${metadata.uri}\n\n`;
      }

      // Handle collection ID
      if (txResponse.collectionId) {
        formattedResponse +=
          `### Collection Details\n` +
          `- **Collection ID:** ${txResponse.collectionId}\n\n`;
      }

      // Handle token ID
      if (txResponse.tokenId) {
        formattedResponse +=
          `### Token Details\n` + `- **Token ID:** ${txResponse.tokenId}\n\n`;
      }

      // Add transaction details
      formattedResponse +=
        `### Transaction Details\n` +
        `- **Hash:** \`${txResponse.transaction.hash}\`\n` +
        `- **Chain ID:** ${
          JSON.parse(txResponse.transaction.cmd).meta?.chainId || "Unknown"
        }\n` +
        `- **Network:** ${
          JSON.parse(txResponse.transaction.cmd).networkId || "Unknown"
        }\n\n` +
        `**Do you want to sign and submit this transaction?**`;

      return formattedResponse;
    }

    // Default JSON formatting for other response types
    return `\`\`\`json\n${JSON.stringify(response, null, 2)}\n\`\`\``;
  };

  // Function to convert markdown text to HTML (basic implementation)
  const renderMarkdown = (content: string): string => {
    // Convert headers: # Header -> <h1>Header</h1>
    let html = content
      .replace(/^### (.*$)/gm, "<h3>$1</h3>")
      .replace(/^## (.*$)/gm, "<h2>$1</h2>")
      .replace(/^# (.*$)/gm, "<h1>$1</h1>");

    // Convert bold: **text** -> <strong>text</strong>
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Convert italic: *text* -> <em>text</em>
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

    // Convert lists: - item -> <li>item</li>
    html = html
      .replace(/^\s*- (.*$)/gm, "<li>$1</li>")
      .replace(/<li>(.*)<\/li>/g, "<ul><li>$1</li></ul>");

    // Convert links: [text](url) -> <a href="url">text</a>
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

    // Convert code blocks
    html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");

    // Convert inline code: `code` -> <code>code</code>
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Convert paragraphs: add <p> tags
    html = html.replace(/^\s*(\S[\s\S]*?)(?=^\s*$|^\s*[#-]|$)/gm, "<p>$1</p>");

    // Replace newlines with breaks
    html = html.replace(/\n/g, "<br>");

    return html;
  };

  // Function to render message content based on type
  const renderMessageContent = (message: Message) => {
    if (message.isMarkdown && message.role === "assistant") {
      return (
        <div
          className="markdown-content"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
        />
      );
    }

    return <div>{message.content}</div>;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || !user?.accountName) return;

    // Create context string
    const context = {
      accountName: user.accountName,
      publicKey: user.publicKey || "not available",
      guard: {
        keys: [user.publicKey || "not available"],
        pred: "keys-all",
      },
      chainId: "2",
      balances: balances, // Include balances in the context
    };

    const contextString = "User Details: " + JSON.stringify(context);

    console.log(contextString);

    // Combine context with user query
    const enhancedQuery = `${inputValue}\n${contextString}`;

    const userMessage: Message = {
      role: "user",
      content: inputValue, // Show original message to user
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setError(null);
    setPendingTransaction(null);
    setTransactionResult(null);

    try {
      const response = await chatApi.sendQuery({
        query: enhancedQuery,
        history: [],
      });

      let responseContent: string;
      let isMarkdown = true; // Default to true for all assistant messages

      if (typeof response.response === "string") {
        responseContent = response.response;
      } else if (response.response && "transaction" in response.response) {
        setPendingTransaction(response.response as TransactionResponse);
        responseContent = formatTransactionResponse(response.response);
      } else {
        responseContent = formatTransactionResponse(response.response);
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: responseContent,
        isMarkdown: isMarkdown,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setError(errorMessage);

      const assistantMessage: Message = {
        role: "assistant",
        content: `# ❌ Error\n\n${errorMessage}`,
        isMarkdown: true,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignAndSubmitTransaction = async () => {
    if (!pendingTransaction || !user?.accountName) {
      setError("No transaction to sign or user not logged in");
      return;
    }

    setIsSubmittingTx(true);
    try {
      const result = await walletService.signAndSubmitTransaction(
        pendingTransaction
      );
      setTransactionResult(result);

      // Add a new message showing the transaction result
      const resultMessage: Message = {
        role: "assistant",
        content:
          result.status === "success"
            ? `## ✅ Transaction Submitted Successfully!\n` +
              `**Request Key:** \`${result.requestKey}\`\n` +
              `You can track this transaction on the blockchain explorer.`
            : `## ❌ Transaction Failed\n` +
              `${result.errorMessage || "Unknown error"}\n` +
              `Please try again or contact support if the issue persists.`,
        isMarkdown: true,
      };

      setMessages((prev) => [...prev, resultMessage]);
      setPendingTransaction(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setError(errorMessage);

      const errorResultMessage: Message = {
        role: "assistant",
        content:
          `## ❌ Transaction Signing Failed\n` +
          `${errorMessage}\n` +
          `Please check your wallet connection and try again.`,
        isMarkdown: true,
      };

      setMessages((prev) => [...prev, errorResultMessage]);
    } finally {
      setIsSubmittingTx(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const toggleWallet = () => {
    setShowWallet(!showWallet);
  };

  const handleConfirmTransaction = () => {
    if (pendingTransaction) {
      handleSignAndSubmitTransaction();
    }
  };

  const handleCancelTransaction = () => {
    setPendingTransaction(null);

    const cancelMessage: Message = {
      role: "assistant",
      content: "Transaction cancelled.",
      isMarkdown: true,
    };

    setMessages((prev) => [...prev, cancelMessage]);
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="user-info">
          <div className="user-avatar">
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="user-details">
            <div className="user-name">{user?.email || "User"}</div>
            <div className="user-wallet">
              {user?.accountName || "No wallet connected"}
            </div>
          </div>
        </div>
        <div className="header-actions">
          <button className="wallet-toggle" onClick={toggleWallet}>
            {showWallet ? "Hide Wallet" : "Show Wallet"}
          </button>
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="empty-state">
              <h2>Welcome to Agent K</h2>
              <p>The supreme Kadena being</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`message ${
                  message.role === "user" ? "user-message" : "assistant-message"
                } ${
                  error && index === messages.length - 1 ? "error-message" : ""
                }`}
              >
                <div className="message-content">
                  {renderMessageContent(message)}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="message assistant-message">
              <div className="message-content loading">
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
              </div>
            </div>
          )}

          {/* Transaction confirmation buttons */}
          {pendingTransaction && !isSubmittingTx && !transactionResult && (
            <div className="transaction-actions">
              <button
                className="confirm-button"
                onClick={handleConfirmTransaction}
                disabled={isSubmittingTx}
              >
                Sign & Submit
              </button>
              <button
                className="cancel-button"
                onClick={handleCancelTransaction}
                disabled={isSubmittingTx}
              >
                Cancel
              </button>
            </div>
          )}

          {isSubmittingTx && (
            <div className="message assistant-message">
              <div className="message-content loading">
                <span style={{ marginRight: "0.5rem" }}>
                  <b>Signing and submitting transaction</b>
                </span>
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {showWallet && (
          <div className="wallet-overlay">
            <div className="wallet-overlay-backdrop" onClick={toggleWallet} />
            <div className="wallet-overlay-content">
              <WalletInfo />
              <button className="wallet-overlay-close" onClick={toggleWallet}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="input-container">
        <form onSubmit={handleSendMessage}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message here..."
            disabled={isLoading || isSubmittingTx}
          />
          <button
            type="submit"
            className="send-button"
            disabled={!inputValue.trim() || isLoading || isSubmittingTx}
          >
            {isLoading ? <LoadingDots /> : <SendButton />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
