# Browser tests

These run the real app in Chromium against a fake Google Sheet that executes the
real `apps-script/Code.gs`, then save what landed in the sheet.

```bash
npm run build
./tests/e2e/start-servers.sh     # fake Apps Script on :4010, app on :3100
node tests/e2e/run.mjs           # needs Playwright: npm i -g playwright && npx playwright install chromium
kill $(cat .e2e-pids)
```

Output goes to `tests/e2e/output/`: screenshots, the exported Excel file, the JSON
backup, and `sheet-output.csv` (exactly what the Google Sheet contains).
