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

2. Open the front-end in your browser:

http://localhost:3001/contributor.html  (Contributor UI)
http://localhost:3001/dashboard.html    (Main dashboard)

Seeded demo admin credentials (for convenience):

- Email: `admin@example.com`
- Password: `adminpass`

Notes:
- The server returns a token on `POST /api/login`. When logging in with a password the server will persist a token on the user record so you can use `Authorization: Bearer <token>` for subsequent requests.

## Useful developer scripts

- `server/scripts/test_settings_save.js` — logs in as the demo admin, POSTs a lesson pass-threshold, and confirms it persisted to `data/settings.json`.
- `server/scripts/test_upload.js` — logs in as admin and uploads `server/test_assets/sample.txt` as a base64 dataUrl, then verifies the resource is listed.

Run tests (while the server is running) from the `server` folder:

```cmd
node scripts/test_settings_save.js
node scripts/test_upload.js
```

## Endpoints overview

Authentication note: include the header `Authorization: Bearer <token>` for endpoints that require authentication (admin-only endpoints require an admin user and token).

- POST /api/login
  - Body: `{ "email": "...", "password": "...", "role": "vendor|moto|admin" }`
  - Returns: `{ token, user }`.

- GET /api/settings?lessonId=<id>
  - Public. Returns `{ passThreshold: number, source: 'lesson'|'default' }`.

- POST /api/settings
  - Admin-only. Body: `{ passThreshold: number, lessonId?: string }`.

- GET /api/lessons
- GET /api/lesson/:id
- GET /api/lesson/:id/week/:week

- POST /api/attempts
  - Auth required. Body: `{ lessonId, week, answers: [] }`.

- GET /api/attempts?lessonId=&week=
- GET /api/progress/summary?lessonId=&week=

- GET /api/resources
- POST /api/resource
  - Supports either JSON `{ title, dataUrl?, filename?, audience? }` or multipart `file` field (multipart/form-data).
  - When uploading a file with multipart, use field name `file` (the front-end contributor UI already sends FormData when a file is selected).

## Contributor UI

Open `http://localhost:3001/contributor.html` in your browser.

- Sign in using an email (the demo server will create a user record and return a token).
- You can upload a resource by selecting a `file` or by providing a hosted file URL.
- Uploaded files are saved under `server/data/uploads` and the resource record includes `url` pointing to `/uploads/<filename>`.
- The contributor listing shows previews for images, icons for PDF/video, and provides `Open` and `Copy URL` actions.

## Replacing lesson media

1. Place your media files into `puente-html-version/server/data/uploads/`.
2. If you change filenames, update `puente-html-version/server/data/lessons.json` for the affected lesson/week `videoUrl`/`audioUrl` fields.
3. Restart the server to pick up file changes.

## Tips & troubleshooting

- If PowerShell blocks `npm` due to execution policy, use `cmd.exe` and run `npm.cmd` as shown above.
- If port 3001 is already in use, start the server with a different port: `set PORT=3002` then `npm.cmd start` and open the front-end at `http://localhost:3002`.

## Security & limitations

- This mock server is for local development only. Tokens are stored on the server user record and do not expire; do not use this approach in production.
- Data is stored in JSON files under `puente-html-version/server/data/` and the file-based approach is not suitable for concurrent production workloads.

## Next steps I can help with

- Add a CI-friendly test runner that starts the server, runs the test scripts, and reports results.
- Add detailed README sections for each front-end page (dashboard, admin, contributor).

# Puente-app