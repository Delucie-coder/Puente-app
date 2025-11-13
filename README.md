# Puente-app — Local README

This README contains developer notes for running the Puente demo server, the available API endpoints, admin instructions, and how to manage placeholder lesson media.

## Quick start (dev)

1. From the repository root, start the mock server:

```cmd
node puente-html-version\server\server.js
```

2. Open the app at: http://localhost:3001

Note: for the local demo's look & feel we recommend using system-friendly fonts to match screenshots (Segoe UI on Windows). Example font stack is: `Segoe UI, Inter, system-ui, -apple-system, Roboto, Arial`.

3. Seeded demo admin account (for assignment and settings management):

- Email: `admin@example.com`
- Password: `adminpass`

4. Helpful scripts (optional): the `server/scripts` folder contains helpers to create and verify placeholder media described later.

## API endpoints (developer overview)

Note: this mock server uses a simple token-based demo auth. To call admin-protected endpoints you must include an Authorization header: `Authorization: Bearer <token>` where `<token>` is returned by `/api/login` or is on the returned user object as `token`.

- POST /api/login
   - Body: `{ "email": "...", "password": "...", "role": "vendor|moto|admin" }`
   - Returns: `{ token, user }`. Use the returned token for authenticated calls.

- GET /api/settings?lessonId=<id>
   - Public read of pass threshold configuration.
   - Returns: `{ passThreshold: number, source: 'lesson'|'default' }`.

- POST /api/settings
   - Admin-only. Body: `{ passThreshold: number, lessonId?: string }`.
   - Persists the passThreshold globally (defaults) or for a specific lesson. Returns `{ ok:true, passThreshold, lessonId }`.

- POST /api/profile/photo
   - Auth required. Body: `{ dataUrl: '<data:image/...;base64,...>' }`.
   - Saves profile image under `/uploads` and associates it with the user's server record. Returns updated user object.

- POST /api/profile/photo/delete
   - Auth required. Removes the user's profile photo from `/uploads` and clears the server user record photoUrl.

- GET /api/lessons
   - Public. Returns lesson list metadata.

- GET /api/lesson/:id
   - Public. Returns lesson metadata including weeks.

- GET /api/lesson/:id/week/:week
   - Public. Returns the content for the specified week (media URLs, phrases, exercises).

- POST /api/attempts
   - Auth required. Body: `{ lessonId, week, answers: [] }`.
   - Server grades MCQ answers and persists the attempt. Returns the attempt record `{ attempt }`.

- GET /api/attempts?lessonId=&week=
   - Auth required. Returns attempts for the authenticated user (admin sees all attempts).

- GET /api/progress/summary?lessonId=&week=
   - Auth required. Returns `{ attemptsCount, bestScore, lastAttempt }` for the authenticated user or all if admin.

- GET /api/assignments
   - Public. Returns saved assignments.

- POST /api/assignments
   - Admin-only. Create assignment. Body: `{ title, due, lessonId? }`.

- PUT /api/assignments/:id
   - Admin-only. Update assignment.

- DELETE /api/assignments/:id
   - Admin-only. Delete assignment.

- GET /api/resources
   - Public.

- POST /api/resource
   - Auth required. Body: `{ title, dataUrl?, filename?, audience? }`.
   - Saves a resource and optional uploaded file to `/uploads`.

### Quick examples (Windows cmd.exe)

Login as admin (returns token in JSON):

```cmd
curl -X POST http://localhost:3001/api/login -H "Content-Type: application/json" -d "{\"email\":\"admin@example.com\",\"password\":\"adminpass\"}"
```

Save a lesson-level pass threshold (replace <TOKEN> with the returned token):

```cmd
curl -X POST http://localhost:3001/api/settings -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" -d "{\"passThreshold\":75,\"lessonId\":\"vendor_bilingual\"}"
```

Read the effective value for a lesson (no auth required):

```cmd
curl "http://localhost:3001/api/settings?lessonId=vendor_bilingual"
```

Record a quiz attempt (authenticated):

```cmd
curl -X POST http://localhost:3001/api/attempts -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" -d "{\"lessonId\":\"vendor_bilingual\",\"week\":\"1\",\"answers\":[0,1]}"
```

Upload a profile photo (authenticated):

```cmd
curl -X POST http://localhost:3001/api/profile/photo -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" -d "{\"dataUrl\":\"data:image/png;base64,...\"}"
```

Create an assignment (admin):

```cmd
curl -X POST http://localhost:3001/api/assignments -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" -d "{\"title\":\"Lesson 1: Greetings Quiz\",\"due\":\"2025-11-15\",\"lessonId\":\"vendor_bilingual\"}"
```

## Lesson media — checklist for replacing placeholders

The project includes a 12-week `vendor_bilingual` lesson. Placeholder media live under:

`puente-html-version/server/data/uploads/vendor_week{1..12}.gif` and `vendor_week{1..12}.wav` (or `.mp4`/`.mp3` if you add them).

Steps to replace placeholders:

1. Prepare your media files. Keep names ASCII-only and compact. Example:
    - `vendor_week1.mp4`
    - `vendor_week1.mp3`

2. Copy files into the uploads folder:

```cmd
copy C:\path\to\vendor_week1.mp4 puente-html-version\server\data\uploads\vendor_week1.mp4
copy C:\path\to\vendor_week1.mp3 puente-html-version\server\data\uploads\vendor_week1.mp3
```

3. If filenames differ from what's declared in `puente-html-version/server/data/lessons.json`, edit that file and update the `videoUrl`/`audioUrl` fields for the affected week entries.

4. Restart the mock server to pick up the changes:

```cmd
node puente-html-version\server\server.js
```

5. Run the verification helper to confirm referenced upload files exist:

```cmd
node puente-html-version\server\scripts\verify_media.js
```

## Quick settings-test (manual)

1. Login as admin (see example above) and capture the token from the JSON response.
2. POST to `/api/settings` with your desired `passThreshold` (and optional `lessonId`) using `curl` or a REST client and include the `Authorization` header.
3. Confirm the change by GET `/api/settings?lessonId=...` (or without lessonId to inspect defaults).
4. Optionally inspect `puente-html-version/server/data/settings.json` to confirm persistence.

## Notes & limitations

- Authentication is demo-only: tokens are stored on the server-side user record and do not expire. This is convenient for testing but not secure for production.
- The server stores data in JSON files under `puente-html-version/server/data/`. For production use a real database and hardened auth.
- Concurrency: the file-write model here is simple and may not be safe under heavy concurrent writes; it's fine for local demos.

If you'd like, I can also:

- Add a small automated test script that authenticates as admin and verifies `/api/settings` persistence.
- Add a UI indicator in the dashboard showing whether the passing threshold is a local override or a server-provided value.

# Puente-app