@echo off
title Magaza Sunucusu (kapatma!)
cd /d "%~dp0"

if not exist "node_modules\express\package.json" (
  echo Paketler kurulu degil, once kurulum yapiliyor...
  call kur.bat
)
if not exist ".env" copy ".env.example" ".env" >nul

echo ============================================
echo    MAGAZA SUNUCUSU
echo ============================================
echo  Bu bilgisayardan : http://localhost:3000
echo  Admin paneli     : http://localhost:3000/admin
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do for /f "tokens=* delims= " %%b in ("%%a") do echo  Telefondan       : http://%%b:3000
echo.
echo  Bu pencere acik kaldigi surece site calisir.
echo  Kapatmak icin pencereyi kapat veya CTRL+C bas.
echo ============================================
echo.

rem 3 saniye sonra tarayicida ac (sunucu o sirada baslamis olur)
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

node server.js

echo.
echo Sunucu durdu.
pause
