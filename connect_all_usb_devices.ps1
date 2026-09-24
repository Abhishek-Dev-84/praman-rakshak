# SDMS Multi-Device USB Reverse Port Forwarding Script
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   SDMS - Multi-Device USB Reverse Port Forwarding Tool" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

$adb = "C:\Android\sdk\platform-tools\adb.exe"
if (-not (Test-Path $adb)) {
    $found = Get-Command adb -ErrorAction SilentlyContinue
    if ($found) {
        $adb = $found.Source
    } else {
        Write-Host "[ERROR] adb.exe not found at C:\Android\sdk\platform-tools\adb.exe" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Using ADB: $adb" -ForegroundColor Gray
Write-Host "Detecting connected Android devices via USB..." -ForegroundColor Yellow
Write-Host ""

$devicesOutput = & $adb devices
$deviceLines = $devicesOutput | Select-String -Pattern "\t(device|unauthorized)$"

$count = 0
foreach ($match in $deviceLines) {
    $parts = $match.Line -split "\t"
    $serial = $parts[0].Trim()
    $state = $parts[1].Trim()

    if ($state -eq "device") {
        $count++
        Write-Host "[$serial] Forwarding tcp:8000 -> PC localhost:8000..." -ForegroundColor White
        & $adb -s $serial reverse tcp:8000 tcp:8000
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  -> [SUCCESS] Device $serial can now access http://127.0.0.1:8000!" -ForegroundColor Green
        } else {
            Write-Host "  -> [FAILED] Could not reverse port on $serial" -ForegroundColor Red
        }
        Write-Host ""
    } elseif ($state -eq "unauthorized") {
        Write-Host "[WARNING] Device $serial is UNAUTHORIZED." -ForegroundColor Yellow
        Write-Host "          Unlock the phone screen and tap 'Always allow from this computer'." -ForegroundColor Gray
        Write-Host ""
    }
}

if ($count -eq 0) {
    Write-Host "[NOTICE] No authorized devices currently detected." -ForegroundColor Yellow
    Write-Host "Checklist:" -ForegroundColor White
    Write-Host "  1. Connect phones to PC using USB cables (or a USB hub)." -ForegroundColor Gray
    Write-Host "  2. Turn ON 'USB Debugging' in Developer Options on each phone." -ForegroundColor Gray
    Write-Host "  3. Unlock the phone screen and tap 'Allow USB debugging'." -ForegroundColor Gray
} else {
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host "Successfully forwarded port 8000 to $count connected device(s)!" -ForegroundColor Green
    Write-Host "On each phone, in the SDMS app, select preset: USB Cable (127.0.0.1:8000)" -ForegroundColor White
    Write-Host "======================================================================" -ForegroundColor Cyan
}
