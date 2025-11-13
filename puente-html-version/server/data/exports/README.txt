This folder is populated by running the export script:

From the server folder:

cd /d C:\Users\Hp\Desktop\Puente-app\puente-html-version\server
node tools/export_weeks.js

Files written:
- <lessonId>_weekNN.json   (one file per lesson/week)
- phrase-sheets-export.html (printable HTML combining all weeks)

If you want me to run this script here, say "run export" but note the environment's terminal has shown PSReadLine errors; running locally in cmd.exe is recommended.