Puente — Google Forms creator

This helper creates Google Forms (quizzes) for each week using a Google Apps Script. The script runs in your Google account and creates Forms, so I can't create them on your behalf from here.

What I added
- `create_forms.gs` — an Apps Script file that creates one Google Form per week from a QUESTIONS object.

How to run
1. Open the Google Apps Script editor: https://script.google.com/
2. Create a new project and replace the default `Code.gs` with the contents of `create_forms.gs` (copy/paste).
3. Replace the `QUESTIONS` constant in the script with your real questions JSON (or paste the JSON content from your attachment into that constant). The script expects the format:

```js
{
  1: [ { q: 'Question text', choices: ['A','B','C'], a: 1 }, ... ],
  2: [ ... ],
  ...
}
```

4. In the Apps Script editor, choose the function `createAllForms` and click Run. The first time you run it you'll be asked to authorize the script to access your Google Drive and Forms.
5. After running, the script will log created form URLs in the Logger and create a small Google Doc named "Puente - Created Quiz Forms" containing the links.

If you want me to paste the QUESTIONS JSON into the script for you, please paste the full questions JSON here in the chat and I'll update the `create_forms.gs` file in the repo so you can copy it directly into Apps Script (or I can produce a ZIP with the script file ready).

Troubleshooting
- Authorization: grant the requested scopes (Forms, Drive, Documents) when prompted.
- If a created form does not show the quiz answers properly, make sure each question object has an `a` field that is the 0-based index of the correct choice.

Next steps I can do for you
- Paste your questions JSON into `create_forms.gs` (if you paste the content here I will insert it into the file in the repo so you can copy/paste it into Apps Script).
- Create a Node-based helper that uses the Google Forms API (requires OAuth setup) if you prefer to run creation programmatically from your machine.
- Add server-side persistence of created form IDs to the mock server so the admin UI can show the quiz links.

Tell me which of the next steps you'd like.