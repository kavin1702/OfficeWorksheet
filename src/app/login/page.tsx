"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, Key, Mail, AlertCircle, LogIn, UserPlus } from "lucide-react";
import { loginAction } from "../authActions";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await loginAction(formData);
      if (res && !res.success) {
        setError(res.message);
        setIsLoading(false);
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-portal-screen">
      <div className="auth-portal-card">
        <div className="auth-portal-header">
          <div className="auth-brand-badge">
            <Briefcase className="brand-icon-lg" style={{ color: "#ffffff" }} />
          </div>
          <h1 className="auth-portal-title">WorkPulse</h1>
          <p className="auth-portal-subtitle">Office Daily Worksheet & Multi-User Tracker</p>
          <div className="auth-sync-status">
            <span className="status-dot online"></span>
            <span>Google Sheets & Cloud Connected</span>
          </div>
        </div>

        <div className="auth-portal-tabs">
          <div className="auth-tab-btn active">
            <LogIn className="icon-xs" />
            <span>Sign In</span>
          </div>
          <Link href="/register" className="auth-tab-btn">
            <UserPlus className="icon-xs" />
            <span>Create Account</span>
          </Link>
        </div>

        {error && (
          <div className="auth-alert-box error">
            <AlertCircle className="icon-xs" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="portal-form">
          <div className="form-group">
            <label className="form-label required">Email Address or Username</label>
            <div className="input-with-icon">
              <Mail className="input-icon" />
              <input 
                type="text" 
                name="email" 
                className="form-input" 
                placeholder="e.g. kavin@office.com or your email" 
                required 
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label required">Password</label>
            <div className="input-with-icon">
              <Key className="input-icon" />
              <input 
                type="password" 
                name="password" 
                className="form-input" 
                placeholder="Enter your password" 
                required 
                disabled={isLoading}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block btn-glow"
            disabled={isLoading}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "1rem" }}
          >
            <LogIn className="icon-sm" />
            <span>{isLoading ? "Signing In..." : "Sign In to My Worksheet"}</span>
          </button>
        </form>

        <div className="auth-switch-link">
          <span>Don't have an account? </span>
          <Link href="/register" className="link-btn">
            Create one now
          </Link>
        </div>

        <div className="auth-features-footer">
          <div className="feature-item"><span className="text-emerald">✓</span> Separate Workspaces</div>
          <div className="feature-item"><span className="text-blue">✓</span> Interactive Calendar</div>
          <div className="feature-item"><span className="text-purple">✓</span> Phone & PC Sync</div>
        </div>
      </div>

      <style jsx global>{`
        .auth-portal-screen {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background-color: var(--bg-primary);
          padding: 1.5rem;
        }
        .auth-portal-card {
          width: 100%;
          max-width: 440px;
          background-color: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 2rem;
          box-shadow: var(--shadow-lg);
        }
        .auth-portal-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .auth-brand-badge {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.75rem;
          box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);
        }
        .auth-portal-title {
          font-family: 'Outfit', sans-serif;
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }
        .auth-portal-subtitle {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin: 0.25rem 0 0.5rem 0;
        }
        .auth-sync-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background-color: var(--bg-subtle);
          padding: 0.25rem 0.65rem;
          border-radius: 20px;
          font-size: 0.7rem;
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
        }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .status-dot.online {
          background-color: #10b981;
          box-shadow: 0 0 8px #10b981;
        }
        .auth-portal-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          background-color: var(--bg-subtle);
          padding: 0.25rem;
          border-radius: var(--radius-md);
          margin-bottom: 1.5rem;
          border: 1px solid var(--border-color);
        }
        .auth-tab-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0.55rem;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-secondary);
          border: none;
          background: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
        }
        .auth-tab-btn.active {
          background-color: var(--bg-surface);
          color: var(--text-primary);
          box-shadow: var(--shadow-sm);
        }
        .auth-alert-box {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          margin-bottom: 1.25rem;
        }
        .auth-alert-box.error {
          background-color: var(--status-blocked-bg);
          border: 1px solid var(--status-blocked-border);
          color: var(--status-blocked-text);
        }
        .portal-form {
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
        }
        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }
        .input-icon {
          position: absolute;
          left: 12px;
          width: 16px;
          height: 16px;
          color: var(--text-muted);
          pointer-events: none;
        }
        .form-input {
          padding-left: 36px !important;
          width: 100%;
        }
        .auth-switch-link {
          text-align: center;
          margin-top: 1.25rem;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .link-btn {
          color: var(--brand-primary);
          font-weight: 500;
          border: none;
          background: none;
          cursor: pointer;
          text-decoration: none;
        }
        .link-btn:hover {
          text-decoration: underline;
        }
        .auth-features-footer {
          display: flex;
          justify-content: space-between;
          border-top: 1px solid var(--border-color);
          margin-top: 1.75rem;
          padding-top: 1rem;
          font-size: 0.72rem;
          color: var(--text-muted);
        }
        .feature-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .text-emerald { color: #10b981; }
        .text-blue { color: #3b82f6; }
        .text-purple { color: #8b5cf6; }
      `}</style>
    </div>
  );
}
