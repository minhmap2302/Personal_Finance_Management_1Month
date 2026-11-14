@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================================
echo   Personal Finance Management - Chay voi Docker Compose
echo ============================================================
echo.

:: 1. Kiem tra file .env
if not exist "%~dp0.env" (
    echo [LOI] Chua tim thay file .env!
    echo       Copy .env.example thanh .env roi dien day du bien.
    pause
    exit /b 1
)
echo [OK] Tim thay file .env

:: 2. Kiem tra Docker dang chay
docker info >nul 2>&1
if errorlevel 1 (
    echo [LOI] Docker chua chay! Hay mo Docker Desktop truoc.
    pause
    exit /b 1
)
echo [OK] Docker dang chay

:: 3. Kiem tra Docker Compose
docker compose version >nul 2>&1
if errorlevel 1 (
    echo [LOI] Docker Compose khong kha dung. Cap nhat Docker Desktop.
    pause
    exit /b 1
)
echo [OK] Docker Compose kha dung

:: 4. Kiem tra Dockerfile backend
if not exist "%~dp0backend\Dockerfile" (
    echo [LOI] Khong tim thay backend\Dockerfile!
    pause
    exit /b 1
)
echo [OK] Tim thay backend\Dockerfile

echo.
echo Chon che do:
echo   [1] Chay lan dau / Rebuild image    (docker compose up --build)
echo   [2] Chay nhanh, dung image cu       (docker compose up)
echo   [3] Dung du an                      (docker compose down)
echo   [4] Dung va xoa toan bo data        (docker compose down -v)
echo   [5] Xem logs                        (docker compose logs -f)
echo   [Q] Thoat
echo.
set /p CHOICE=Nhap lua chon (1-5 hoac Q): 

if /i "!CHOICE!"=="1" goto BUILD_UP
if /i "!CHOICE!"=="2" goto UP
if /i "!CHOICE!"=="3" goto DOWN
if /i "!CHOICE!"=="4" goto DOWN_VOLUMES
if /i "!CHOICE!"=="5" goto LOGS
if /i "!CHOICE!"=="Q" goto EXIT
echo Lua chon khong hop le.
goto EXIT

:BUILD_UP
echo.
echo [CHAY] docker compose up --build -d
cd /d "%~dp0"
docker compose up --build -d
if errorlevel 1 (
    echo [LOI] Docker Compose that bai! Chay: docker compose logs de xem chi tiet.
    pause
    exit /b 1
)
goto SHOW_INFO

:UP
echo.
echo [CHAY] docker compose up -d
cd /d "%~dp0"
docker compose up -d
if errorlevel 1 (
    echo [LOI] Docker Compose that bai!
    pause
    exit /b 1
)
goto SHOW_INFO

:DOWN
echo.
cd /d "%~dp0"
docker compose down
echo [OK] Da dung tat ca services.
pause
exit /b 0

:DOWN_VOLUMES
echo.
echo [CANH BAO] Lenh nay se XOA TOAN BO DU LIEU MySQL!
set /p CONFIRM=Nhap XOA de xac nhan: 
if "!CONFIRM!" neq "XOA" (
    echo Da huy.
    pause
    exit /b 0
)
cd /d "%~dp0"
docker compose down -v
echo [OK] Da dung va xoa toan bo volumes.
pause
exit /b 0

:LOGS
echo.
cd /d "%~dp0"
docker compose logs -f
pause
exit /b 0

:SHOW_INFO
echo.
echo ============================================================
echo   Tat ca services da khoi dong!
echo.
echo   Frontend : http://localhost:3000
echo   Backend  : http://localhost:8080
echo ============================================================
echo.
set /p OPEN_BROWSER=Mo trinh duyet khong? (Y/n): 
if /i "!OPEN_BROWSER!" neq "n" (
    start http://localhost:3000
)

:EXIT
echo.
pause
exit /b 0
