@echo off
color 0A
:: Hotel Room Booking System - Quick Start
:: Developed by POORVAJAN G S - Final Year CSE Student at KSRIET

echo.
echo ========================================
echo  HOTEL BOOKING SYSTEM - QUICK START
echo ========================================
echo  Developed by POORVAJAN G S
echo  Final Year CSE Student at KSRIET
echo  Leader of Team CODE CRAFTS
echo ========================================
echo.

:: Check if MongoDB is running
echo [0/3] Checking MongoDB service...
sc query MongoDB | findstr "RUNNING" >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] MongoDB service is not running!
    echo Starting MongoDB service...
    net start MongoDB >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to start MongoDB. Please start it manually.
        pause
        exit /b 1
    )
)
echo [SUCCESS] MongoDB is running
echo.

:: Start Backend
echo [1/3] Starting Backend Server...
cd /d "%~dp0backend"
start "Hotel Backend - POORVAJAN G S" cmd /k "echo Starting Hotel Booking Backend... && npm start"

:: Wait for backend to initialize
echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

:: Check if backend is responding
echo [2/3] Verifying backend connection...
curl -s http://localhost:5000/api/health >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Backend may still be starting...
    echo Please wait a few more seconds before using the system.
echo.
)

:: Open Frontend
echo [3/3] Opening Frontend...
cd /d "%~dp0frontend"
start "" "index.html"

echo.
echo ========================================
echo  🚀 SYSTEM STARTED SUCCESSFULLY!
echo ========================================
echo.
echo 🌐 Frontend: Opening in your default browser
echo 📡 Backend API: http://localhost:5000/api
echo 💓 Health Check: http://localhost:5000/api/health
echo.
echo 🔐 Login Credentials:
echo 👑 Admin: admin@hotel.com / admin123
echo 👤 Customer: john@example.com / password123
echo.
echo 💡 Features Available:
echo    ✅ Room Browsing and Search
echo    ✅ User Registration and Login
echo    ✅ Room Booking System
echo    ✅ Admin Dashboard
echo    ✅ Booking Management
echo.
echo 🛠️  Developer: POORVAJAN G S
echo 🎓 KSRIET - Final Year CSE
echo 👨‍💻 Team CODE CRAFTS Leader
echo.
echo Press any key to continue...
pause >nul
