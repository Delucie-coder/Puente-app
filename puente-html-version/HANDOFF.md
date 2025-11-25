# Puente Mock Server — Handoff & Demo Notes

This file explains how to run the mock server, run automated tests, perform a quick cross-session manual QA, and replace media/resources before a demo.

Quick start (Windows, cmd.exe)

1. Install dependencies (from the `server` folder):

```bash
cd puente-html-version\server
npm.cmd install
```

2. Start the server (default port 3001):

```bash
set PORT=3001
npm.cmd start
```

If PowerShell blocks `npm.ps1`, use `cmd.exe` or `npm.cmd` as above.

Run the CI-style tests (auto-selects a free port):

```bash
cd puente-html-version\server
node scripts/ci_run_tests.js
```

This starts the server on a free port, runs the built-in tests (`test_settings_save.js`, `test_upload.js`), then stops the server and reports results.

Manual cross-session QA (quick checklist)

- Open Admin page: `http://localhost:3001/admin.html` and sign in using seeded admin credentials (`admin@example.com` / `adminpass` unless changed in `server/data/users.json`).
- In Admin, set a `passThreshold` for a lesson and save.
- Open the Dashboard as a non-admin (e.g., in a different browser or an incognito window) at `http://localhost:3001/dashboard.html` and verify the threshold appears in the lesson view.
- As a learner (no auth), complete a short attempt on a week and submit; verify attempts show up in Admin -> Attempts summary.

Commands to reproduce manually (example):

```bash
# Ensure server is running
set PORT=3001 && npm.cmd start

# In another terminal (cmd.exe) - POST a setting as admin (use token from data/users.json if needed):
node scripts/test_settings_save.js

# Run cross-session QA script (if you want the automated flow):
node scripts/test_cross_session.js
```

 
 - The mock server requires authentication for attempt submissions. Clients should `POST /api/login` to obtain a Bearer token and then submit attempts using that token. This aligns with expected production behavior and ensures attempts are associated with a user.
 - For demos, use the provided `unauth_attempt_example.html` only as an example; it will not work unless adapted to authenticate first. The test suite now authenticates non-admin users in `scripts/test_cross_session.js`.

Contact / Next steps

- I can run a full demo and record a short screencast, or I can finish the remaining manual QA and finalize the handoff checklist (deployment notes, list of replaceable assets, and demo script). Which would you prefer?
