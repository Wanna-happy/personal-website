$workspacePath = Split-Path -Parent $PSScriptRoot
$previewPort = Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue
if (-not $previewPort) {
    Start-Process python -ArgumentList @('-m', 'http.server', '8765', '--bind', '127.0.0.1') -WorkingDirectory $workspacePath -WindowStyle Hidden
}
$adminPort = Get-NetTCPConnection -LocalPort 8766 -State Listen -ErrorAction SilentlyContinue
if (-not $adminPort) {
    Start-Process python -ArgumentList @('tools/admin-server.py') -WorkingDirectory $workspacePath -WindowStyle Hidden
}
Start-Process 'http://127.0.0.1:8765/admin.html'
