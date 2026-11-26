#!/usr/bin/env bash
# Starts the fake Apps Script (:4010) and the built app (:3100) for tests/e2e/run.mjs.
# Run `npm run build` first. Stop with: kill $(cat .e2e-pids)
set -e
PORT=4010 API_SECRET=test-secret node tests/fake-apps-script/server.mjs > .e2e-fake.log 2>&1 &
echo $! > .e2e-pids
APP_PASSWORD=test-pass SESSION_SECRET=e2e-session-secret-123 \
GOOGLE_SCRIPT_URL=http://127.0.0.1:4010/macros/s/TEST/exec GOOGLE_SCRIPT_SECRET=test-secret \
ALLOW_LOCAL_SCRIPT_URL=1 APP_USER_NAME=Kavin APP_USER_EMAIL=demo@workpulse.local \
  npx next start -p 3100 > .e2e-next.log 2>&1 &
echo $! >> .e2e-pids
for i in $(seq 1 40); do curl -s -o /dev/null http://localhost:3100/login && exit 0; sleep 1; done
echo "app did not start"; exit 1
