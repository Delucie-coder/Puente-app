# Puente-app — Local developer guide

This repository contains a small vanilla front-end and a Node.js mock API (Express) used for local development and demos. The mock server persists data to JSON files under `puente-html-version/server/data` and serves uploaded files from `/uploads`.

## Quick start (Windows - cmd.exe)

1. Open a Command Prompt and start the mock server (from the server directory):

```cmd
cd C:\Users\Hp\Desktop\Puente-app\puente-html-version\server
npm.cmd install
set PORT=3001
npm.cmd start
```

# Puente-app — Complete local setup and developer guide

This repository contains a small vanilla front-end and a Node.js mock API (Express) used for local development and demos. The mock server persists data to JSON files under `puente-html-version/server/data` and serves uploaded files from `/uploads`.

This README gives a complete, step-by-step set of instructions to get the project running on Windows using `cmd.exe`. Follow each step exactly to avoid environment issues.

**Contents**
- Prerequisites
- Clone / download
- Install server dependencies
- Start the mock server
- Open the front-end
- Run built-in smoke tests
- Data layout and where files live
- Troubleshooting & tips
- Security & limitations

**Prerequisites**
- Install Node.js (recommended LTS) from https://nodejs.org/ and verify:

  `node -v`
  `npm -v`

  Use Node 16+ (LTS) or newer. If you use nvm for Windows, ensure the active version matches.
- Git is optional if you clone the repo. You can also download the ZIP.

**1) Clone or download the repository**
- Clone with Git (recommended):

  `git clone https://github.com/Delucie-coder/Puente-app.git`

  or download and extract the ZIP from GitHub and open the folder in Explorer.

**2) Open a Windows Command Prompt**
- Use `cmd.exe`. Do not use PowerShell for these examples (some Windows environments block npm execution or use different `set` semantics). Open a Command Prompt in the project root (the folder that contains this `README.md`).

**3) Install server dependencies**
- The mock API lives in `puente-html-version/server` and contains its own `package.json`.

Run these commands in order from a `cmd.exe` prompt:

```
cd C:\Users\Hp\Desktop\Puente-app\puente-html-version\server
npm.cmd install
```

Notes:
- On Windows `cmd.exe` we use `npm.cmd` to avoid shell alias issues. If you use a different shell (WSL, Git Bash) you can run `npm install` normally.

**4) Configure the port (optional)**
- By default the server listens on `process.env.PORT || 3001`.
- To change the port for this session (cmd.exe):

```
set PORT=3001
npm.cmd start
```

Enter the `set` command then run `npm.cmd start` on the next line so the environment variable is visible to the server process.

**5) Start the mock server**
- From the same `server` folder run:

```
npm.cmd start
```

- This runs `node server.js` (see `puente-html-version/server/package.json`). The console should show express listening on the chosen port, e.g. `Listening on 3001`.

**6) Open the front-end in your browser**
- The front-end files are served by the mock server at the chosen port. Open these URLs in your browser (replace `3001` if you used a different port):

```
http://localhost:3001/contributor.html   (Contributor UI)
http://localhost:3001/dashboard.html     (Main dashboard)
http://localhost:3001/index.html         (Landing / index pages)
```

Tip: If a page is not found, confirm the server started successfully and that you used the same port in the URL.

**7) Demo credentials and authentication**
- The mock server will create a user record when you sign in from the UI. For convenience some demo credentials may be seeded in `server/data/users.json`.
- Example seeded admin (if present):

```
Email: admin@example.com
Password: adminpass
```

- Authentication: `POST /api/login` returns `{ token, user }`. Subsequent API requests that require auth expect the header `Authorization: Bearer <token>`.

**8) Run the included smoke tests (optional)**
- Several handy scripts live in `puente-html-version/server/scripts` for quick checks. Run these while the server is running in a separate command window.

From `puente-html-version/server`:

```
node scripts/test_settings_save.js
node scripts/test_upload.js
```

- There are also quick platform-specific runner scripts in `puente-html-version/server`:

```
smoke-test.bat    (Windows batch)
smoke-test.ps1    (PowerShell)
```

Run `smoke-test.bat` from `cmd.exe` while the server is running to execute a small list of smoke checks.

**9) Where data and uploads are stored**
- Data files: `puente-html-version/server/data/*.json` (users, lessons, resources, progress, etc.)
- Uploaded files: `puente-html-version/server/data/uploads/`
- If you manually drop media files into the `uploads` folder, update `puente-html-version/server/data/lessons.json` if you changed filenames referenced by lessons.

**10) Common troubleshooting**
- Node not found: ensure Node is installed and `node -v` works.
- `npm` permission or blocked on PowerShell: open `cmd.exe` and use `npm.cmd` as shown.
- Port in use: choose a different port, e.g. `set PORT=3002` then `npm.cmd start` and open `http://localhost:3002`.
- File uploads not visible: confirm files are present in `server/data/uploads` and restart the server.

**11) Security & limitations**
- This mock server is only for local development and demos. It stores tokens on the user record and does not expire tokens. Do not reuse this approach in production.
- Data is stored in flat JSON files and is not suitable for concurrent production workloads.

**Developer notes & next steps**
- The server `package.json` exposes `start` which runs `node server.js`.
- If you want a single-command start from the repo root you can add a root-level script or a wrapper that `cd`s into the server folder and runs `npm start`.
- I can help add a `docker-compose` setup, a CI test runner, or a single `npm` script to start both server and open a browser.

---

If you'd like, I can now:
- add a `Makefile`/`npm` script to start the server from the repo root,
- create a short quickstart `PS1` and `BAT` wrapper that sets the port and starts the server,
- or also expand this README with per-page usage instructions for `dashboard.html`, `admin.html`, and `contributor.html`.

If you want any of these, tell me which and I'll implement it.
