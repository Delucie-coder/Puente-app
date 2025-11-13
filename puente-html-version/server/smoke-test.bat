@echo off
REM smoke-test.bat - simple curl smoke test for the Puente mock server
SETLOCAL
set SERVER=http://localhost:3010
if not exist tmp mkdir tmp

echo Fetching /api/lessons ...
curl -sS %SERVER%/api/lessons -o tmp/lessons.json
if %ERRORLEVEL% neq 0 ( echo curl failed fetching /api/lessons & exit /b 2 )

echo Fetching /api/lesson/market_english_greetings ...
curl -sS %SERVER%/api/lesson/market_english_greetings -o tmp/market_english_greetings.json
if %ERRORLEVEL% neq 0 ( echo curl failed fetching lesson & exit /b 3 )

echo Saved responses to tmp\
dir tmp\
ENDLOCAL
