@echo off
setlocal
set "PORT=5248"
set "MIDI_DIR=%~dp0midi"
start "" "http://localhost:%PORT%"
node "%~dp0server.js"
if errorlevel 1 (
  echo.
  echo Kbits could not start. Install Node.js, then run this file again.
  pause
)
