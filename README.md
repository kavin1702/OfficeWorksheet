# 🚀 WorkPulse — Office Daily Worksheet & Task Tracker (Cloud + Mobile Ready)

A modern, responsive office daily worksheet web application built to track daily work logs, project tasks, and statuses (`Completed`, `In Progress`, `Pending`, `Blocked`, `Under Review`). Designed to work seamlessly across **Laptops, Desktops, and Mobile Phones (Android / iOS)** with **free real-time cloud database storage**.

---

## ✨ Features Overview

- 📱 **Multi-Device & Mobile-First**: Touch-friendly interface, mobile bottom navigation bar, floating action button, and PWA "Add to Home Screen" support.
- ☁️ **Online Cloud Database (Supabase PostgreSQL)**: Data is stored online in the cloud so you can view, add, and update records from anywhere. Any change on your phone updates on your laptop in real-time.
- ⚡ **Offline Resilience & Auto-Sync**: Works even when offline or on poor network; automatically syncs when reconnected.
- 📋 **Daily Status Workflow**:
  - Track **Date**, **Project Name**, **Work Description**, **Status**, **Hours Spent**, **Priority**, and **Remarks**.
  - **1-Click Status Switcher**: Update task status directly from the table or mobile card.
  - **Carry Forward Pending Tasks**: 1-click button to bring yesterday's unfinished work into today's log.
  - **Duplicate Task**: Clone ongoing tasks into today's worksheet with 1 click.
- 🔍 **Smart Filters & Search**:
  - Filter by *Today*, *Yesterday*, *This Week*, *This Month*, or *Custom Date Range*.
  - Instant project dropdown filter and keyword search.
- 📊 **Analytics Dashboard**: Visual donut chart for status breakdown and bar chart for hours per project.
- 💬 **WhatsApp / Slack / Email Daily Report Generator**: Generates formatted status reports ready to copy with 1 click.
- 📥 **Excel / CSV Import & Export**:
  - **Export**: Download formatted Excel (`.xlsx`), CSV, JSON backup, or print PDF timesheet.
  - **Import**: Drag-and-drop your existing office records to import past data in seconds.

---

## 🚀 How to Run Locally

1. Open the project folder:
   `C:\Users\Lenovo\.gemini\antigravity\scratch\office-daily-worksheet`
2. Simply double-click **`index.html`** to open it in Chrome, Edge, or any modern browser!

---

## ☁️ How to Connect Free Cloud Database (Supabase in 2 Minutes)

To store your data in the cloud permanently and access it from both phone and laptop:

1. Go to [supabase.com](https://supabase.com) and create a **Free Account**.
2. Click **New Project** and choose a project name (e.g. `office-worksheet`).
3. In your Supabase project dashboard, click **SQL Editor** on the left menu.
4. Click **New Query**, paste the following SQL, and click **Run**:

```sql
-- Create table for daily worksheet entries
CREATE TABLE IF NOT EXISTS daily_worksheets (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  project_name TEXT NOT NULL,
  work TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'In Progress',
  hours_worked NUMERIC DEFAULT 0,
  priority TEXT DEFAULT 'Medium',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security and Public Access
ALTER TABLE daily_worksheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all access" ON daily_worksheets FOR ALL USING (true) WITH CHECK (true);
```

5. Go to **Project Settings** -> **API**.
6. Copy your **Project URL** (e.g., `https://xyz.supabase.co`) and **anon public key**.
7. In the WorkPulse web app, click **Cloud Sync** (top right) or the **Cloud Status Pill**, paste your URL and API Key, and click **Save & Sync Now**!

---

## 📱 How to Use on Your Mobile Phone

### Method 1: Free Online Hosting (Recommended)
You can host this static web app for free in 30 seconds on **Vercel**, **Netlify**, or **GitHub Pages**:
- **Vercel / Netlify**: Simply drag and drop the `office-daily-worksheet` folder into [Netlify Drop](https://app.netlify.com/drop). You will get a live secure URL (e.g., `https://my-office-worksheet.netlify.app`).
- Open that URL on your phone's browser, tap **Share / Menu** -> **"Add to Home Screen"**.
- It installs as a native mobile app and syncs with your laptop!

### Method 2: Local WiFi Network
1. If running a local server on your laptop (e.g. `npx serve .` or Python `http.server`), open your laptop's local IP address (e.g., `http://192.168.1.15:8080`) on your mobile browser connected to the same Wi-Fi.

---

## 📥 How to Import Your Existing Office Data

1. Click **Import / Export** in the top bar.
2. Switch to the **Import Data** tab.
3. Drag & drop your Excel (`.xlsx`) or CSV file containing your past office records.
4. The system automatically maps columns (`Date`, `Project Name`, `Work Description`, `Status`, `Hours`, `Remarks`).
5. Review the preview and click **Confirm Import**!
