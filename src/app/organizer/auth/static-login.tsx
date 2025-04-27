"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";

export default function StaticLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please enter both username and password");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        username,
        password,
      });

      if (result?.error) {
        setError("Invalid username or password");
      } else if (result?.ok) {
        // Force a full page reload to ensure cookies are properly set
        window.location.href = "/organizer/dashboard";
      }
    } catch (err) {
      setError("An error occurred during login");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "100px auto", padding: "2rem", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", borderRadius: "10px", backgroundColor: "white" }}>
      <h1 style={{ textAlign: "center", marginBottom: "0.5rem", fontSize: "1.8rem" }}>Techlympics 2025</h1>
      <h2 style={{ textAlign: "center", marginBottom: "1.5rem", fontSize: "1.3rem", fontWeight: "normal", color: "#555" }}>Organizer Portal</h2>
      
      {error && (
        <div style={{ backgroundColor: "#ffebee", color: "#d32f2f", padding: "0.8rem", borderRadius: "4px", marginBottom: "1rem" }}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: "1.2rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ width: "100%", padding: "0.8rem", border: "1px solid #ddd", borderRadius: "4px", fontSize: "1rem", boxSizing: "border-box" }}
            required
          />
        </div>
        
        <div style={{ marginBottom: "1.2rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: "0.8rem", border: "1px solid #ddd", borderRadius: "4px", fontSize: "1rem", boxSizing: "border-box" }}
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "0.8rem",
            backgroundColor: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "1rem",
            fontWeight: "500",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
