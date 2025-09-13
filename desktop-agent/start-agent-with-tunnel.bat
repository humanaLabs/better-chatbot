@echo off
echo 🚀 Better Chatbot Desktop Agent + Cloudflare Tunnel
echo ================================================

REM Limpar processos anteriores
echo 🧹 Limpando processos anteriores...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM cloudflared.exe >nul 2>&1

REM Verificar se cloudflared está instalado
echo 🔍 Verificando Cloudflare Tunnel...
cloudflared version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Cloudflare Tunnel não encontrado!
    echo 📥 Baixando e instalando...
    
    REM Baixar cloudflared
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
    
    if exist cloudflared.exe (
        echo ✅ Cloudflared baixado com sucesso!
    ) else (
        echo ❌ Erro ao baixar cloudflared
        echo 💡 Baixe manualmente: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
        pause
        exit /b 1
    )
) else (
    echo ✅ Cloudflare Tunnel encontrado!
)

REM Compilar TypeScript
echo 🔨 Compilando Desktop Agent...
npx tsc src/browser-proxy-agent.ts --outDir dist --target es2020 --module commonjs --esModuleInterop --skipLibCheck

if %errorlevel% neq 0 (
    echo ❌ Erro na compilação!
    pause
    exit /b 1
)

echo ✅ Compilação concluída!

REM Iniciar Desktop Agent em background
echo 🎭 Iniciando Desktop Agent...
start /B node dist/browser-proxy-agent.js

REM Aguardar o servidor inicializar
echo ⏳ Aguardando servidor inicializar...
timeout /t 3 /nobreak >nul

REM Verificar se o servidor está rodando
powershell -Command "try { Invoke-RestMethod -Uri 'http://localhost:8769/status' -TimeoutSec 5 | Out-Null; exit 0 } catch { exit 1 }"

if %errorlevel% neq 0 (
    echo ❌ Desktop Agent não iniciou corretamente!
    pause
    exit /b 1
)

echo ✅ Desktop Agent rodando na porta 8769!

REM Iniciar Cloudflare Tunnel
echo 🌐 Iniciando Cloudflare Tunnel...
echo 📡 Criando túnel público para localhost:8769...

REM Usar cloudflared local ou global
if exist cloudflared.exe (
    start /B cloudflared.exe tunnel --url http://localhost:8769
) else (
    start /B cloudflared tunnel --url http://localhost:8769
)

echo ⏳ Aguardando túnel inicializar...
timeout /t 5 /nobreak >nul

echo.
echo 🎉 DESKTOP AGENT INICIADO COM SUCESSO!
echo ==========================================
echo.
echo 🖥️  Desktop Agent: http://localhost:8769
echo 🌐 Túnel Público: Verifique o log acima para URL
echo.
echo 📋 COMO USAR:
echo 1. Copie a URL do túnel (https://xxx.trycloudflare.com)
echo 2. Use essa URL na aplicação web Vercel
echo 3. O navegador local será controlado remotamente!
echo.
echo 🔍 Para ver logs detalhados:
echo    - Desktop Agent: Verifique janela do Node.js
echo    - Túnel: Verifique janela do Cloudflared
echo.
echo ⚠️  IMPORTANTE: Mantenha esta janela aberta!
echo    Fechar esta janela para o Desktop Agent e Túnel.
echo.

REM Manter janela aberta e monitorar
:monitor
echo 📊 Status: Desktop Agent + Túnel rodando...
echo    Pressione Ctrl+C para parar tudo
timeout /t 30 /nobreak >nul
goto monitor
