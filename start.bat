@echo off
echo Starting Blaze Smart Prompt...
echo.

set DATA_DIR=%~dp0data\prompts
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"

cd /d "%~dp0"

java -jar target\blaze-smart-prompt-1.0.0.jar
