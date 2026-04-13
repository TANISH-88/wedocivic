@echo off
cd /d "%~dp0"
echo Generating PWA icons...
node generate-icons.js
pause
