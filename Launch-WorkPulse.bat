@echo off
title WorkPulse - Office Daily Worksheet
cls
echo ===================================================
echo   Starting WorkPulse - Office Daily Worksheet App
echo   User: Kavin (kavin@8chili.com)
echo ===================================================
echo.

:: Try opening with Chrome in App/Frameless mode
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="https://office-worksheet.vercel.app"
    goto done
)

if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app="https://office-worksheet.vercel.app"
    goto done
)

if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" --app="https://office-worksheet.vercel.app"
    goto done
)

:: Try opening with Microsoft Edge in App mode
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="https://office-worksheet.vercel.app"
    goto done
)

if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="https://office-worksheet.vercel.app"
    goto done
)

:: Fallback: Open default browser
start "" "https://office-worksheet.vercel.app"

:done
echo WorkPulse Desktop App launched!
timeout /t 2 >nul
exit