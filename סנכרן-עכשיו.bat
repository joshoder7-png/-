@echo off
chcp 65001 >nul
echo מסנכרן שאלות חדשות מ-WhatsApp...
powershell -ExecutionPolicy Bypass -File "%~dp0sync-whatsapp.ps1"
pause
