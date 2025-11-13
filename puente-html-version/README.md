Puente (puente-html-version)

Quick start (Windows - cmd.exe)

1) Start the mock server (serves the front-end and API):

   cd /d c:\Users\Hp\Desktop\Puente-app\puente-html-version\server
   node server.js

If you see an error about the port being in use, find and stop the process:

   netstat -ano | findstr :3001
   taskkill /F /PID <PID>

Then restart `node server.js`.

2) Run the upload smoke-test (optional):

   cd /d c:\Users\Hp\Desktop\Puente-app\puente-html-version\server
   node tmp_upload_test.js

This will POST a sample image to `/api/profile/photo` and print the response.

3) Open the app UI:

- You can open `puente-html-version/index.html` in a browser directly (file://), or host the folder with the server above and visit:

  http://localhost:3001/index.html

4) Useful troubleshooting tips

- If the server exits with EADDRINUSE, either kill the process on that port or set `PORT` environment variable before starting:

  set PORT=3002
  node server.js

- Uploaded files are saved under `server/data/uploads` and metadata in `server/data/users.json` and `server/data/resources.json`.

5) Next steps (ideas):

- Add a small admin UI to manage `resources.json`.
- Improve auth in the mock server if you plan to expose it publicly.
