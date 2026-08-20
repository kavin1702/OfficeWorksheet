"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Briefcase, Key, Mail, User, AlertCircle, ArrowRight } from "lucide-react";
import { signUpAction } from "../authActions";

export default function RegisterPage() {
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await signUpAction(formData);
      if (res && !res.success) {
        setError(res.message);
      }
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Briefcase className="brand-icon" style={{ width: "24px", height: "24px", color: "#ffffff" }} />
          </div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Get started with WorkPulse daily task tracker</p>
        </div>

        {error && (
          <div className="auth-error-box">
            <AlertCircle className="icon-sm" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label required">Full Name</label>
            <div className="auth-input-wrapper">
              <User className="auth-input-icon" />
              <input 
                type="text" 
                name="name" 
                className="form-input auth-input" 
                placeholder="John Doe" 
                required 
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label required">Email Address</label>
            <div className="auth-input-wrapper">
              <Mail className="auth-input-icon" />
              <input 
                type="email" 
                name="email" 
                className="form-input auth-input" 
                placeholder="you@company.com" 
                required 
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label required">Password</label>
            <div className="auth-input-wrapper">
              <Key className="auth-input-icon" />
              <input 
                type="password" 
                name="password" 
                className="form-input auth-input" 
                placeholder="••••••••" 
                required 
                minLength={6}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label required">Confirm Password</label>
            <div className="auth-input-wrapper">
              <Key className="auth-input-icon" />
              <input 
                type="password" 
                name="confirmPassword" 
                className="form-input auth-input" 
                placeholder="••••••••" 
                required 
                minLength={6}
                disabled={isLoading}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-glow auth-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? "Creating Account..." : "Create Account"}
            <ArrowRight className="icon-sm" style={{ marginLeft: "8px" }} />
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{" "}
          <Link href="/login" className="auth-link">
            Sign In
          </Link>
        </div>
      </div>

      <style jsx global>{`
        .auth-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background-color: var(--bg-primary);
          padding: 1.5rem;
        }
        .auth-card {
          width: 100%;
          max-width: 440px;
          background-color: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 2.5rem;
          box-shadow: var(--shadow-lg);
        }
        .auth-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .auth-logo {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          border-radius: var(--radius-md);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
          box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);
        }
        .auth-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }
        .auth-subtitle {
          font-size: 0.85rem;
          color: var(--text-muted);
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .auth-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .auth-input-icon {
          position: absolute;
          left: 12px;
          color: var(--text-muted);
          width: 16px;
          height: 16px;
          pointer-events: none;
        }
        .auth-input {
          padding-left: 36px !important;
          width: 100%;
        }
        .auth-submit-btn {
          width: 100%;
          padding: 0.75rem !important;
          font-weight: 600 !important;
          margin-top: 0.5rem;
        }
        .auth-error-box {
          background-color: var(--status-blocked-bg);
          border: 1px solid var(--status-blocked-border);
          color: var(--status-blocked-text);
          padding: 0.75rem 1rem;
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .auth-footer {
          text-align: center;
          margin-top: 1.5rem;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        .auth-link {
          color: var(--brand-primary);
          font-weight: 500;
          text-decoration: none;
        }
        .auth-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
