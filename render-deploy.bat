@echo off
title Kardes Magaza - Render deploy
cd /d "%~dp0"
echo ============================================
echo    RENDER-E DEPLOY (Node.js / Express)
echo ============================================
echo.

where git >nul 2>nul
if errorlevel 1 goto nogit

rem --- Render ucun duzgun konfiqurasiya (kohne render.yaml varsa uzerine yazilir) ---
(
echo services:
echo   - type: web
echo     name: kardes-magaza
echo     runtime: node
echo     plan: free
echo     buildCommand: npm install
echo     startCommand: npm start
echo     envVars:
echo       - key: SESSION_SECRET
echo         generateValue: true
echo       - key: ADMIN_USER
echo         sync: false
echo       - key: ADMIN_PASS
echo         sync: false
) > render.yaml
echo render.yaml hazirlandi.

if not exist ".git" git init
git add -A
git commit -m "Render deploy" >nul 2>nul
git branch -M main

git remote get-url origin >nul 2>nul
if errorlevel 1 goto askrepo
for /f "delims=" %%r in ('git remote get-url origin') do set REPO=%%r
echo Movcud GitHub repo istifade olunur: %REPO%
goto push

:askrepo
echo.
echo GitHub-da yeni repo yaradin (Public secin). Sehife acilir.
start https://github.com/new
set /p REPO=Repo linkini yapisdirin: 
git remote add origin %REPO%

:push
echo.
echo Kod GitHub-a gonderilir...
git push -u origin main
if errorlevel 1 goto pushfail

echo.
echo Render sehifesi acilir.
echo  1. Render hesabinizla giris edin
echo  2. ADMIN_USER ve ADMIN_PASS xanalarina oz admin adinizi ve guclu parolunuzu yazin
echo  3. Deploy duymesine basin
start https://render.com/deploy?repo=%REPO%
pause
exit /b 0

:nogit
echo Git tapilmadi. Yukleme sehifesi acilir. Qurduqdan sonra bu fayli yeniden isledin.
start https://git-scm.com/download/win
pause
exit /b 1

:pushfail
echo.
echo Push alinmadi. Repo linkini ve GitHub giris melumatlarini yoxlayin.
pause
exit /b 1
