@echo off
chcp 65001 >nul
echo ============================================================
echo   Personal Finance Management — Dung Local Servers
echo ============================================================
echo.

echo [1/2] Dung Backend (cong 8080)...
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":8080 " ^| findstr "LISTENING"') do (
    echo       Tat tien trinh PID %%p tren cong 8080
    taskkill /PID %%p /F >nul 2>&1
)

echo [2/2] Dung Frontend Vite (cong 5173)...
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    echo       Tat tien trinh PID %%p tren cong 5173
    taskkill /PID %%p /F >nul 2>&1
)

echo.
echo [OK] Da giai phong cong 8080 va 5173.
echo      Dong cac cua so terminal cua Backend/Frontend neu con mo.
echo.
pause
