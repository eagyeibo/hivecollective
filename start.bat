@echo off
echo Starting HiveCollective...

start "HiveCollective Backend" cmd /k "cd /d C:\Users\eagye\OneDrive\Desktop\my-platform\backend && node index.js"

timeout /t 2 /nobreak >nul

start "HiveCollective Frontend" cmd /k "cd /d C:\Users\eagye\OneDrive\Desktop\my-platform\frontend && npm run dev"

echo.
echo Both servers starting...
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:5173
echo.
timeout /t 3 /nobreak >nul
start http://localhost:5173
