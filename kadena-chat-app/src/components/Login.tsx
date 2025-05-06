import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { login, loginWithSpireKey } = useAuth();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await login(email);
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpireKeyLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await loginWithSpireKey();
    } catch (err) {
      console.error("SpireKey login error:", err);
      setError("SpireKey login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Welcome to Agent K</h1>
        <p>Sign in to access your chat interface and wallet</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleEmailLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login with Magic Link"}
          </button>
        </form>

        <div className="divider">
          <span>OR</span>
        </div>

        <button
          onClick={handleSpireKeyLogin}
          className="btn btn-secondary"
          disabled={isLoading}
        >
          {isLoading ? "Logging in..." : "Login with SpireKey"}
        </button>
      </div>
    </div>
  );
};

export default Login;
