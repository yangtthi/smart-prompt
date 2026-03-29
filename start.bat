@echo off
echo Starting Smart Prompt...
echo.

set DATA_DIR=%~dp0data\prompts
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"

cd /d "%~dp0"

java -jar target\smart-prompt-1.0.0.jar
