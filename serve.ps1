# serve.ps1 - start a simple static server for testing
# Usage: .\serve.ps1

$port = 8000
$root = (Get-Location).Path
Write-Host "Serving $root on http://localhost:$port"

# Prefer python3, then python, then npx http-server
if (Get-Command python3 -ErrorAction SilentlyContinue) {
    python3 -m http.server $port
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    python -m http.server $port
} elseif (Get-Command npx -ErrorAction SilentlyContinue) {
    npx http-server -p $port
} else {
    Write-Host "No python or npx found. Install Python or Node.js to use this script." -ForegroundColor Yellow
}
