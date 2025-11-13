Puente mock server — quick run & smoke tests

This folder contains a lightweight mock server used by the Puente front-end.

How to run (Windows - cmd.exe):

1. Install dependencies (only if you haven't already):

   cd /d C:\Users\Hp\Desktop\Puente-app\puente-html-version\server
   npm install

2. Start the server on port 3010:

   set PORT=3010
   npm start

The server will print something like:

   Puente mock server running on http://localhost:3010

Endpoints
- GET /api/lessons            -> returns JSON { lessons: [...] }
- GET /api/lesson/:id         -> returns a single lesson object
- GET /api/progress/summary   -> per-week progress (if enabled)

Quick smoke-test (Windows)
- I've included two helper scripts in this folder:
  - smoke-test.bat  (cmd)
  - smoke-test.ps1  (PowerShell)

They will fetch /api/lessons and /api/lesson/market_english_greetings and save the responses to the `tmp` subfolder.

If the server isn't running locally, start it first. If you encounter PowerShell script execution policy errors when using npm on PowerShell, use `npm.cmd start` or run from cmd.exe.

Contact
If you want me to extend the lesson content further (translations, media URLs, or structured quizzes), tell me which weeks to enrich and I will update `data/lessons.json` accordingly.
