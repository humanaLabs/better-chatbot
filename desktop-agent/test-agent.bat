@echo off
echo ========================================
echo 🧪 TESTANDO DESKTOP AGENT
echo ========================================
echo.

echo 🔍 Verificando se o Desktop Agent está rodando...
echo.

REM Testar conexão HTTP
echo 📡 Testando conexão HTTP (porta 8768)...
curl -s http://localhost:8768/status
if %errorlevel% equ 0 (
    echo.
    echo ✅ Desktop Agent está respondendo na porta 8768!
) else (
    echo.
    echo ❌ Desktop Agent NÃO está respondendo na porta 8768
    echo.
    echo 💡 Dicas:
    echo    1. Execute primeiro: start-desktop-agent.bat
    echo    2. Aguarde aparecer as mensagens de inicialização
    echo    3. Execute este teste novamente
    echo.
    pause
    exit /b 1
)

echo.
echo 🔍 Verificando processos ativos...
netstat -an | findstr :8768
netstat -an | findstr :8767

echo.
echo ========================================
echo 🎯 PRÓXIMOS PASSOS:
echo ========================================
echo 1. Acesse: http://localhost:3000/playwright-hybrid
echo 2. Clique em "Conectar ao MCP"
echo 3. Deve mostrar: "DESKTOP AGENT REAL conectado"
echo ========================================
echo.
pause
