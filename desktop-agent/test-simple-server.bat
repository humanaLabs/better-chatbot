@echo off
echo ========================================
echo 🧪 TESTE SERVIDOR SIMPLES
echo ========================================
echo.

echo 🔄 Parando processos Node.js existentes...
taskkill /F /IM node.exe 2>nul

echo.
echo 🔧 Iniciando servidor de teste simples...
echo ⚠️  Deixe esta janela aberta e teste no navegador:
echo 🔗 http://localhost:8768/status
echo.
echo Para parar, pressione Ctrl+C
echo.

node test-server.js

pause
