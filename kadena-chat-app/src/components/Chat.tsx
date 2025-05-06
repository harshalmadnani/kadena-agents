import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  chatApi,
  SwapResponse,
  TransactionData,
  TransactionResponse,
} from "../services/api";
import walletService, { SignAndSubmitResult } from "../services/walletService";
import WalletInfo from "./WalletInfo";
import "./Chat.css";

interface Message {
  role: "user" | "assistant";
  content: string;
  isMarkdown?: boolean;
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

const Chat: React.FC = () => {
  const { user, logout } = useAuth();
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
    // Check if it's a transaction response
    if (response.transaction) {
      const txResponse = response as TransactionResponseData;
      let formattedResponse = "Transaction Generated:\n\n";

      if (txResponse.quote) {
        formattedResponse += `Exchange Details:\n`;
        formattedResponse += `- Input Amount: ${txResponse.quote.expectedIn}\n`;
        formattedResponse += `- Output Amount: ${txResponse.quote.expectedOut}\n`;
        formattedResponse += `- Price Impact: ${txResponse.quote.priceImpact}%\n`;
        formattedResponse += `- Slippage Tolerance: ${
          txResponse.quote.slippage * 100
        }%\n\n`;
      }

      formattedResponse += `Transaction Hash: ${txResponse.transaction.hash}\n`;
      formattedResponse += `Chain ID: ${
        JSON.parse(txResponse.transaction.cmd).meta?.chainId || "Unknown"
      }\n\n`;

      formattedResponse += `Do you want to sign and submit this transaction?`;

      return formattedResponse;
    }

    // Default JSON formatting for other object types
    return JSON.stringify(response, null, 2);
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

    if (!inputValue.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: inputValue,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setError(null);
    setPendingTransaction(null);
    setTransactionResult(null);

    try {
      const response = await chatApi.sendQuery({
        query: userMessage.content,
        history: [],
      });

      // Convert response to string based on its type
      let responseContent: string;
      let isMarkdown = false;

      if (typeof response.response === "string") {
        responseContent = response.response;
        isMarkdown = true; // Set to true for string responses (non-transactions)
      } else if (response.response && "transaction" in response.response) {
        // Store transaction for later signing
        setPendingTransaction(response.response as TransactionResponse);
        responseContent = formatTransactionResponse(response.response);
        isMarkdown = false; // No markdown for transactions
      } else {
        // Format object responses based on their structure
        responseContent = formatTransactionResponse(response.response);
        isMarkdown = false;
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
        content: errorMessage,
        isMarkdown: false,
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
            ? `Transaction submitted successfully!\n\nRequest Key: ${result.requestKey}\n\nYou can track this transaction on the blockchain explorer.`
            : `Transaction failed: ${result.errorMessage || "Unknown error"}`,
        isMarkdown: true,
      };

      setMessages((prev) => [...prev, resultMessage]);

      // Clear the pending transaction after processing
      setPendingTransaction(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setError(errorMessage);

      const errorResultMessage: Message = {
        role: "assistant",
        content: `Transaction signing failed: ${errorMessage}`,
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
        <div
          className={`messages-container ${showWallet ? "with-wallet" : ""}`}
        >
          {messages.length === 0 ? (
            <div className="empty-state">
              <h2>Welcome to Kadena Chat</h2>
              <p>Ask anything about Kadena blockchain!</p>
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
                Signing and submitting transaction...
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {showWallet && (
          <div className="wallet-sidebar">
            <WalletInfo />
          </div>
        )}
      </div>

      <form className="input-container" onSubmit={handleSendMessage}>
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
          disabled={isLoading || isSubmittingTx || !inputValue.trim()}
        >
          {isLoading ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
};

export default Chat;
