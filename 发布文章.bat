@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo   博客文章发布助手 - 古的博客
echo ========================================
echo.
python publish.py
echo.
pause
