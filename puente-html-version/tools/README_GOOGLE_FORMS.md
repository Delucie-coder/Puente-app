# Google Forms automation (Node + Apps Script)

This folder contains two options to create the 6 weekly quizzes programmatically:

1) Apps Script (runs in your Google account) — easiest: `createWeeklyQuizzesAndSaveToSheet()`
2) Node.js script (runs locally) — uses Google Forms API and OAuth2: `create_forms_node.js`

---

Node.js script quickstart

1. Enable the Google Forms API and Google Drive API in Google Cloud Console for a project.
2. Create OAuth 2.0 Client ID credentials (Application type: Desktop) and download `credentials.json` into `tools/credentials.json`.
3. From the repo root, install dependencies:

   ```bash
   cd puente-html-version/tools
   npm init -y
   npm install googleapis readline
   ```

4. Run:

   ```bash
   node create_forms_node.js
   ```

   - First run prints an auth URL. Open it, sign in with your Google account, paste the code back into the terminal.
   - The script saves `token.json` in `tools/` and creates the forms.

Notes
- The Forms API request format changes; if you see schema errors, inspect the API docs and adjust the `items` payload. The Apps Script option is more stable for many users.

---

Apps Script quickstart

1. Open https://script.google.com/ and create a new project.
2. Copy the Apps Script code provided earlier (the function `createWeeklyQuizzesAndSaveToSheet`).
3. Run it and grant permissions when prompted. The script creates the Forms and writes a spreadsheet with edit/published URLs.

Optional enhancements
- Add a confirmation message to each form (Apps Script can set it), and the Apps Script can email the spreadsheet link after creation.
- After the forms are created, copy the final published URLs into `dashboard-features.js` -> `WEEK_GOOGLE_FORMS` so the dashboard opens the real forms.

If you'd like, I can automatically patch `dashboard-features.js` for you once you paste the 6 published URLs here or provide the spreadsheet link (I cannot access your Google Sheet automatically).