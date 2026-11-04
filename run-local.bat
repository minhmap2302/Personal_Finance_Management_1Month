@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ============================================================
echo   Personal Finance Management — Chay Local (khong Docker)
echo ============================================================
echo.

:: ─────────────────────────────────────────────────────────────
:: 1. Kiem tra file .env
:: ─────────────────────────────────────────────────────────────
if not exist "%~dp0.env" (
    echo [LOI] Chua tim thay file .env!
    echo.
    echo Huong dan:
    echo   1. Copy file .env.example thanh .env
    echo      copy .env.example .env
    echo   2. Mo file .env va dien day du cac bien moi truong
    echo   3. Chay lai script nay
    echo.
    pause
    exit /b 1
)
echo [OK] Tim thay file .env

:: ─────────────────────────────────────────────────────────────
:: 2. Kiem tra Java 21+
:: ─────────────────────────────────────────────────────────────
java -version >nul 2>&1
if errorlevel 1 (
    echo [LOI] Khong tim thay Java. Vui long cai Java 21+
    echo       Tai tai: https://adoptium.net/
    pause
    exit /b 1
)
for /f "tokens=3" %%v in ('java -version 2^>^&1 ^| findstr /i "version"') do (
    set JAVA_VER=%%v
)
echo [OK] Java da cai dat: !JAVA_VER!

:: ─────────────────────────────────────────────────────────────
:: 3. Kiem tra Node.js va npm
:: ─────────────────────────────────────────────────────────────
node -v >nul 2>&1
if errorlevel 1 (
    echo [LOI] Khong tim thay Node.js. Vui long cai Node.js 18+
    echo       Tai tai: https://nodejs.org/
    pause
    exit /b 1
)
for /f %%v in ('node -v') do set NODE_VER=%%v
echo [OK] Node.js: !NODE_VER!

:: ─────────────────────────────────────────────────────────────
:: 4. Kiem tra MySQL dang chay
:: ─────────────────────────────────────────────────────────────
echo.
echo [KIEM TRA] MySQL...
mysqladmin ping -h 127.0.0.1 --silent >nul 2>&1
if errorlevel 1 (
    echo [CANH BAO] Khong ket noi duoc MySQL tren localhost:3306
    echo           Hay dam bao MySQL dang chay truoc khi Backend khoi dong.
    echo.
    set /p CONTINUE=Ban co muon tiep tuc khong? (y/N): 
    if /i "!CONTINUE!" neq "y" (
        echo Da huy.
        pause
        exit /b 1
    )
) else (
    echo [OK] MySQL dang chay
)

:: ─────────────────────────────────────────────────────────────
:: 5. Cai dat Frontend dependencies (neu chua co node_modules)
:: ─────────────────────────────────────────────────────────────
echo.
echo [BUOC 1/3] Kiem tra Frontend dependencies...
if not exist "%~dp0frontend\node_modules" (
    echo          Chua co node_modules, dang chay npm install...
    cd /d "%~dp0frontend"
    call npm install
    if errorlevel 1 (
        echo [LOI] npm install that bai!
        pause
        exit /b 1
    )
    echo [OK] Frontend dependencies da cai xong
) else (
    echo [OK] node_modules da ton tai, bo qua npm install
)

:: ─────────────────────────────────────────────────────────────
:: 6. Khoi dong Backend (cua so moi)
:: ─────────────────────────────────────────────────────────────
echo.
echo [BUOC 2/3] Khoi dong Backend (Spring Boot cong 8080)...
start "PFM - Backend" cmd /k "cd /d "%~dp0backend" && gradlew.bat bootRun"
echo [OK] Backend dang khoi dong trong cua so moi...
echo      Cho khoang 30-60 giay de Spring Boot san sang.

:: ─────────────────────────────────────────────────────────────
:: 7. Doi Backend san sang roi moi khoi dong Frontend
:: ─────────────────────────────────────────────────────────────
echo.
echo [BUOC 3/3] Khoi dong Frontend (Vite dev server cong 5173)...
echo           (Backend co the mat 30-60s de khoi dong hoan toan)
timeout /t 5 /nobreak >nul
start "PFM - Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: ─────────────────────────────────────────────────────────────
:: 8. Thong bao ket qua
:: ─────────────────────────────────────────────────────────────
echo.
echo ============================================================
echo   Dang khoi dong du an...
echo.
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:8080
echo   API Docs : http://localhost:8080/swagger-ui (neu co)
echo.
echo   Meo: Doi Backend hien "Started BackendApplication"
echo        truoc khi truy cap Frontend.
echo.
echo   De dung du an: Dong cac cua so "PFM - Backend"
echo                  va "PFM - Frontend"
echo ============================================================
echo.
pause
