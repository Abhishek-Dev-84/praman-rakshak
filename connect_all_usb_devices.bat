@echo off
setlocal enabledelayedexpansion

echo ======================================================================
echo    SDMS - Multi-Device USB Reverse Port Forwarding Tool
echo ======================================================================
echo.

:: Locate adb.exe
set "ADB_PATH=C:\Android\sdk\platform-tools\adb.exe"
if not exist "!ADB_PATH!" (
    where adb >nul 2>nul
    if !errorlevel! equ 0 (
        set "ADB_PATH=adb"
    ) else (
        echo [ERROR] adb.exe not found at C:\Android\sdk\platform-tools\adb.exe
        echo Please ensure Android SDK platform-tools is installed.
        pause
        exit /b 1
    )
)

echo Using ADB: !ADB_PATH!
echo.
echo Detecting connected Android devices...
echo.

set /a count=0

for /f "skip=1 tokens=1,2" %%A in ('"!ADB_PATH!" devices') do (
    if "%%B"=="device" (
        set /a count+=1
        echo [%%A] Forwarding tcp:8000 -^> PC:8000 ...
        "!ADB_PATH!" -s %%A reverse tcp:8000 tcp:8000
        if !errorlevel! equ 0 (
            echo    -^> SUCCESS: Device %%A can now access http://127.0.0.1:8000
        ) else (
            echo    -^> FAILED to forward for %%A
        )
        echo.
    ) else if "%%B"=="unauthorized" (
        echo [WARNING] Device %%A is UNAUTHORIZED!
        echo           Please unlock the phone and tap 'Allow USB Debugging'.
        echo.
    )
)

if !count! equ 0 (
    echo [NOTICE] No authorized devices detected!
    echo Checklist:
    echo  1. Connect your phones via USB cables.
    echo  2. Ensure 'USB Debugging' is enabled in Developer Options on each phone.
    echo  3. Unlock phone screens and tap 'Always allow from this computer'.
    echo.
) else (
    echo ======================================================================
    echo Total devices configured: !count!
    echo On each phone app, select preset: USB Cable (127.0.0.1:8000)
    echo ======================================================================
)

echo.
pause
