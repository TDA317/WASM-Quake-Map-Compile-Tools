@echo off
REM serve.bat - start a simple static server for testing
REM Usage: serve.bat

set PORT=8000
echo Serving %CD% on http://localhost:%PORT%

where python >nul 2>&1
if %ERRORLEVEL%==0 (
    python -m http.server %PORT%
    goto :eof
)

where node >nul 2>&1
if %ERRORLEVEL%==0 (
    npx http-server -p %PORT%
    goto :eof
)

echo No python or node found. Install Python or Node.js to use this script.
