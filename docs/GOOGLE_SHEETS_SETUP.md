# Connect WorkPulse to Google Sheets (free)

WorkPulse stores every work log as one row in a Google Sheet. The connection
uses a **Google Apps Script web app**, which is free on any Google account.
You do not need a Google Cloud project, a billing account, or a credit card.

```
Browser ──► WorkPulse server (Vercel) ──► Apps Script web app ──► Google Sheet
          (password-protected API)      (needs the secret)     ("WorkEntries" tab)
```

The browser never sees the Apps Script URL or the secret. Only the server does.

## 1. Create the sheet and the script (about 5 minutes)

1. Go to <https://sheets.new> and name the sheet, for example **WorkPulse Data**.
2. In the sheet, open **Extensions → Apps Script**.
3. Delete the sample code, paste everything from [`apps-script/Code.gs`](../apps-script/Code.gs), and click **Save**.
4. Click the gear icon **Project Settings** → **Script Properties** → **Add script property**:
   - Property: `API_SECRET`
   - Value: a long random text. You can make one with
     `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`
5. Click **Deploy → New deployment**. Choose type **Web app** and set:
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click **Deploy**, then **Authorize access** and allow it.
   Google shows "Google hasn't verified this app" because you wrote it yourself: click
   **Advanced → Go to (project name) (unsafe)**. This is normal for personal scripts.
7. Copy the **Web app URL**. It ends in `/exec`.

"Anyone" access is safe here: the script refuses every request that does not carry your secret.

## 2. Add the settings to Vercel

Vercel → your project → **Settings → Environment Variables**. Add these for Production and Preview:

| Name | Value |
| --- | --- |
| `APP_PASSWORD` | The password you will type to open WorkPulse |
| `SESSION_SECRET` | Another long random text |
| `GOOGLE_SCRIPT_URL` | The `/exec` URL from step 1.7 |
| `GOOGLE_SCRIPT_SECRET` | Exactly the same text as `API_SECRET` |
| `APP_USER_NAME` | Your name, shown on each log |
| `APP_USER_EMAIL` | Your email, saved on each log |

Then **Deployments → ⋯ → Redeploy** so the new settings are used.

## 3. Check it works

1. Open the site and sign in with `APP_PASSWORD`.
2. The footer says **Saved to Google Sheets**.
3. Click **Google Sheets → Test connection**. It shows the row count.
4. Add a work log. A new row appears in the **WorkEntries** tab within a second or two.
5. Had data saved in the browser before? Click **Google Sheets → Upload this browser's old data**.

## Will Google charge me?

No. Google Sheets and Apps Script are free with a normal Google account. There are daily limits,
but a personal work log stays far below them:

| Limit (free Gmail account) | Size | What it means for WorkPulse |
| --- | --- | --- |
| Cells per spreadsheet | 10 million | 16 columns per log, so about 600,000 logs |
| Apps Script run time | 6 minutes per call, 90 minutes per day of triggers | Each save takes well under 1 second |
| Simultaneous script runs | 30 | Fine for one person or a small team |

If a limit is ever reached, Google stops the request for that day. It never bills you.

## If something goes wrong

| What you see | Fix |
| --- | --- |
| Banner "Google Sheets is set up incorrectly" | The message names the missing setting. Add it in Vercel and redeploy. |
| "Apps Script did not return JSON" | The deployment is not "Anyone", or the URL is not the `/exec` one. Redeploy the web app. |
| "Unauthorized: wrong secret" | `GOOGLE_SCRIPT_SECRET` and `API_SECRET` are different. Make them identical. |
| You edited `Code.gs` but nothing changed | Apps Script serves the deployed version. Use **Deploy → Manage deployments → Edit → New version**. The URL stays the same. |
| Dates look odd in the sheet | Keep the `workDate` column formatted as **Plain text** (the script sets this for you). |

Editing rows by hand in the sheet is fine. Keep the header row and the `id` column as they are.
