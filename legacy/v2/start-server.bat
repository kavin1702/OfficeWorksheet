@echo off
title WorkPulse Server
echo ========================================================
echo   WorkPulse - Office Daily Worksheet Local Server
echo ========================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "& {
    $port = 8080
    $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -notmatch '169.254' } | Select-Object -First 1).IPAddress
    Write-Host '========================================================' -ForegroundColor Cyan
    Write-Host '  [OK] WorkPulse Server Running!' -ForegroundColor Green
    Write-Host ''
    Write-Host '  💻 Laptop Access:  http://localhost:'$port -ForegroundColor Yellow
    if ($ip) {
        Write-Host '  📱 Phone Access:   http://'$ip':'$port -ForegroundColor Cyan
        Write-Host '     (Make sure your phone is connected to the same Wi-Fi)' -ForegroundColor Gray
    }
    Write-Host '========================================================' -ForegroundColor Cyan
    Write-Host 'Press Ctrl+C to stop server' -ForegroundColor DarkGray
    Write-Host ''
    
    # Start default browser on laptop
    Start-Process ('http://localhost:' + $port)
    
    # Simple HTTP Listener in PowerShell
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add('http://*:' + $port + '/')
    try {
        $listener.Start()
    } catch {
        $listener = New-Object System.Net.HttpListener
        $listener.Prefixes.Add('http://localhost:' + $port + '/')
        $listener.Start()
    }
    
    $baseDir = $PSScriptRoot
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $path = $request.Url.LocalPath
        if ($path -eq '/') { $path = '/index.html' }
        $filePath = Join-Path $baseDir $path.TrimStart('/')
        
        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = 'text/html'
            switch ($ext) {
                '.css' { $contentType = 'text/css' }
                '.js' { $contentType = 'application/javascript' }
                '.json' { $contentType = 'application/json' }
                '.png' { $contentType = 'image/png' }
                '.svg' { $contentType = 'image/svg+xml' }
            }
            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $buffer = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        }
        $response.Close()
    }
}"
pause
