@echo off
title Magaza - KURULUM
cd /d "%~dp0"
echo ============================================
echo    MAGAZA SITESI - KURULUM
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 goto nonode
goto hasnode

:nonode
echo Node.js bulunamadi, otomatik kuruluyor...
winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
echo.
echo Node.js kuruldu. Bu pencereyi KAPAT, sonra kur.bat dosyasini TEKRAR calistir.
echo Eger kurulamadiysa https://nodejs.org adresinden LTS surumunu elle kur.
pause
exit /b 1

:hasnode
if not exist ".env" copy ".env.example" ".env" >nul

rem Onceki yarim kalan kurulumdan bozuk node_modules varsa temizle
if exist "node_modules" if not exist "node_modules\dotenv\package.json" (
  echo Eski yarim kurulum temizleniyor...
  rmdir /s /q node_modules
)

echo Paketler kuruluyor, birkac dakika surebilir...
echo.
call npm install --no-audit --no-fund
if errorlevel 1 goto fail

echo.
echo ============================================
echo    KURULUM TAMAMLANDI
echo    Simdi baslat.bat dosyasini calistir.
echo ============================================
pause
exit /b 0

:fail
echo.
echo HATA: Kurulum basarisiz oldu. Yukaridaki mesaji bana gonder.
pause
exit /b 1
