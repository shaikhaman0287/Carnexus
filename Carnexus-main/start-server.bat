@echo off
echo Starting CarNexus Backend Server...
cd /d "%~dp0server"
node server.js
pause
