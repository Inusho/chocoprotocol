@echo off
chcp 65001 >nul 2>&1
title chocoprotocol - Twitch Bot

echo.
echo  ╔══════════════════════════════════════╗
echo  ║   🤖 chocoprotocol - Twitch Bot     ║
echo  ╚══════════════════════════════════════╝
echo.

:: Node.js prüfen
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  ❌ Node.js ist nicht installiert!
    echo.
    echo  Bitte installiere Node.js:
    echo  https://nodejs.org/
    echo.
    echo  Lade die LTS-Version herunter und installiere sie.
    echo  Danach dieses Script erneut starten.
    echo.
    pause
    exit /b 1
)

echo  ✅ Node.js gefunden: 
node --version

:: Abhängigkeiten installieren (nur beim ersten Mal)
if not exist "node_modules\" (
    echo.
    echo  📦 Installiere Abhängigkeiten...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo  ❌ Installation fehlgeschlagen!
        pause
        exit /b 1
    )
    echo  ✅ Fertig!
)

echo.
echo  🚀 Bot wird gestartet...
echo  🌐 Dashboard: http://localhost:3000
echo.
echo  Das Dashboard öffnet sich gleich im Browser.
echo  Dieses Fenster offen lassen! Schließen = Bot stoppt.
echo.
echo  ════════════════════════════════════════

:: Browser öffnen (kurz warten bis Server bereit)
start "" /min cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

:: Bot starten
node bot.js

:: Falls der Bot crasht
echo.
echo  ⚠️ Bot wurde beendet.
pause
