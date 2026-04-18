@echo off
cd /d "C:\Users\eagye\OneDrive\Desktop\my-platform"

set /p msg="Commit message: "

git add .
git commit -m "%msg%"
git push

echo.
echo Done! Vercel will redeploy automatically.
pause
