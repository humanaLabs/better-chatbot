@echo off
echo ========================================
echo 🚀 DESKTOP AGENT - SETUP AUTOMATICO
echo ========================================
echo.

REM Matar processos existentes do Desktop Agent
echo 🔄 Parando processos existentes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM "Desktop Agent.exe" 2>nul
timeout /t 2 /nobreak >nul

REM Limpar porta 8768 se estiver em uso
echo 🧹 Limpando porta 8768...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8768') do (
    taskkill /F /PID %%a 2>nul
)

REM Limpar porta 8767 se estiver em uso
echo 🧹 Limpando porta 8767...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8767') do (
    taskkill /F /PID %%a 2>nul
)

echo.
echo 🔨 Limpando arquivos compilados...
if exist "dist" rmdir /s /q "dist"

echo.
echo 📦 Instalando dependências...
call npm install

echo.
echo 🔧 Compilando TypeScript...
call npx tsc

echo.
echo ✅ Verificando se a compilação foi bem-sucedida...
if not exist "dist\standalone-main.js" (
    echo ❌ ERRO: Compilação falhou! Arquivo dist\standalone-main.js não encontrado.
    pause
    exit /b 1
)

echo.
echo 🚀 Iniciando Desktop Agent...
echo ========================================
echo 📡 WebSocket Server: ws://localhost:8767
echo 🌐 HTTP Server: http://localhost:8768
echo 🔗 Status URL: http://localhost:8768/status
echo ========================================
echo.
echo ⚠️  MANTENHA ESTA JANELA ABERTA!
echo ⚠️  Para parar o agent, pressione Ctrl+C
echo.
echo 🧪 Teste manual: curl http://localhost:8768/status
echo.

REM Executar o Desktop Agent REAL
echo 🎭 Iniciando Desktop Agent com Playwright REAL
echo.
node dist/simple-agent.js

echo.
echo 🔍 Se deu erro, verifique:
echo   1. Porta 8768 está livre?
echo   2. Firewall bloqueando?
echo   3. Outro processo usando a porta?

echo.
echo 🛑 Desktop Agent foi interrompido.
pause
