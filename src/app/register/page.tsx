"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, Key, Mail, User, AlertCircle, ArrowRight, LogIn, UserPlus } from "lucide-react";
import { signUpAction } from "../authActions";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<string>("#3b82f6");

  const colors = [
    { value: "#3b82f6", label: "Blue" },
    { value: "#10b981", label: "Emerald" },
    { value: "#8b5cf6", label: "Purple" },
    { value: "#f59e0b", label: "Amber" },
    { value: "#ec4899", label: "Pink" },
    { value: "#06b6d4", label: "Cyan" }
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("color", selectedColor);

    try {
      const res = await signUpAction(formData);
      if (res && !res.success) {
        setError(res.message);
        setIsLoading(false);
      } else {
        // Redirect is handled by the server action, but in case it's not:
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
          <Link href="/login" className="auth-tab-btn">
            <LogIn className="icon-xs" />
            <span>Sign In</span>
          </Link>
          <div className="auth-tab-btn active">
            <UserPlus className="icon-xs" />
            <span>Create Account</span>
          </div>
        </div>

        {error && (
          <div className="auth-alert-box error">
            <AlertCircle className="icon-xs" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="portal-form">
          <div className="form-group">
            <label className="form-label required">Full Name</label>
            <div className="input-with-icon">
              <User className="input-icon" />
              <input 
                type="text" 
                name="name" 
                className="form-input" 
                placeholder="e.g. Kavin M, Rahul" 
                required 
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label required">Email Address</label>
            <div className="input-with-icon">
              <Mail className="input-icon" />
              <input 
                type="email" 
                name="email" 
                className="form-input" 
                placeholder="name@company.com" 
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
                placeholder="Create password (min 3 characters)" 
                required 
                minLength={3}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Role / Designation</label>
            <div className="input-with-icon">
              <Briefcase className="input-icon" />
              <input 
                type="text" 
                name="role" 
                className="form-input" 
                placeholder="e.g. Frontend Developer, QA Engineer" 
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Avatar Color</label>
            <div className="color-picker-row">
              {colors.map((color) => (
                <label 
                  key={color.value} 
                  className={`color-circle ${selectedColor === color.value ? "selected" : ""}`} 
                  style={{ backgroundColor: color.value, cursor: "pointer", position: "relative" }}
                >
                  <input 
                    type="radio" 
                    name="portalUserColor" 
                    value={color.value}
                    checked={selectedColor === color.value}
                    onChange={() => setSelectedColor(color.value)}
                    style={{ opacity: 0, position: "absolute", width: "100%", height: "100%", cursor: "pointer" }}
                    disabled={isLoading}
                  />
                  {selectedColor === color.value && (
                    <span className="selected-dot"></span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block btn-glow"
            disabled={isLoading}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "1rem" }}
          >
            <UserPlus className="icon-sm" />
            <span>{isLoading ? "Creating Account..." : "Create Account & Sign In"}</span>
          </button>
        </form>

        <div className="auth-switch-link">
          <span>Already have an account? </span>
          <Link href="/login" className="link-btn">
            Sign In instead
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
        .color-picker-row {
          display: flex;
          gap: 8px;
          margin-top: 0.25rem;
        }
        .color-circle {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid transparent;
          transition: transform 0.15s ease;
        }
        .color-circle.selected {
          transform: scale(1.1);
          border-color: var(--text-primary);
        }
        .selected-dot {
          width: 6px;
          height: 6px;
          background-color: #ffffff;
          border-radius: 50%;
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
