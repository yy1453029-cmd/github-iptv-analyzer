@echo off
setlocal

where gradle >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo Gradle is not installed or not on PATH.
  echo Install Gradle or use Android Studio's bundled Gradle.
  exit /b 1
)

gradle %*
