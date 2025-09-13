@echo off
setlocal enabledelayedexpansion

echo 🚀 Better Chatbot Desktop Agent - Smart Tunnel
echo ==============================================

REM Limpar processos anteriores
echo 🧹 Limpando processos anteriores...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM cloudflared.exe >nul 2>&1

REM Verificar/Instalar cloudflared
call :check_cloudflared
if %errorlevel% neq 0 exit /b 1

REM Compilar e iniciar Desktop Agent
call :start_desktop_agent
if %errorlevel% neq 0 exit /b 1

REM Iniciar túnel e capturar URL
call :start_tunnel_and_get_url

REM Mostrar informações finais
call :show_final_info

REM Monitorar
call :monitor_services

goto :eof

:check_cloudflared
echo 🔍 Verificando Cloudflare Tunnel...
cloudflared version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Cloudflare Tunnel encontrado!
    exit /b 0
)

echo ❌ Cloudflare Tunnel não encontrado!
echo 📥 Baixando automaticamente...

powershell -Command "try { Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe' -UseBasicParsing; Write-Host '✅ Download concluído!' } catch { Write-Host '❌ Erro no download'; exit 1 }"

if not exist cloudflared.exe (
    echo ❌ Falha no download automático
    echo 💡 Instale manualmente: winget install --id Cloudflare.cloudflared
    exit /b 1
)

echo ✅ Cloudflared instalado localmente!
exit /b 0

:start_desktop_agent
echo 🔨 Compilando Desktop Agent...
npx tsc src/browser-proxy-agent.ts --outDir dist --target es2020 --module commonjs --esModuleInterop --skipLibCheck >nul 2>&1

if %errorlevel% neq 0 (
    echo ❌ Erro na compilação!
    exit /b 1
)

echo 🎭 Iniciando Desktop Agent...
start /B cmd /c "node dist/browser-proxy-agent.js > agent.log 2>&1"

echo ⏳ Aguardando inicialização...
timeout /t 3 /nobreak >nul

REM Verificar se está rodando
for /l %%i in (1,1,10) do (
    powershell -Command "try { Invoke-RestMethod -Uri 'http://localhost:8769/status' -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ Desktop Agent rodando!
        exit /b 0
    )
    timeout /t 1 /nobreak >nul
)

echo ❌ Desktop Agent não iniciou!
exit /b 1

:start_tunnel_and_get_url
echo 🌐 Iniciando Cloudflare Tunnel...

REM Criar arquivo temporário para capturar output
set "tunnel_log=%temp%\tunnel_output.txt"

REM Iniciar tunnel e capturar output
if exist cloudflared.exe (
    start /B cmd /c "cloudflared.exe tunnel --url http://localhost:8769 > %tunnel_log% 2>&1"
) else (
    start /B cmd /c "cloudflared tunnel --url http://localhost:8769 > %tunnel_log% 2>&1"
)

echo ⏳ Aguardando URL do túnel...

REM Aguardar e extrair URL
set "tunnel_url="
for /l %%i in (1,1,30) do (
    if exist "%tunnel_log%" (
        for /f "tokens=*" %%a in ('findstr /i "trycloudflare.com" "%tunnel_log%" 2^>nul') do (
            set "line=%%a"
            for /f "tokens=*" %%b in ('echo !line! ^| findstr /r "https://.*\.trycloudflare\.com"') do (
                for /f "tokens=2 delims= " %%c in ("%%b") do (
                    set "tunnel_url=%%c"
                    goto :url_found
                )
            )
        )
    )
    timeout /t 1 /nobreak >nul
)

:url_found
if defined tunnel_url (
    echo ✅ Túnel ativo: %tunnel_url%
    echo %tunnel_url% > tunnel_url.txt
) else (
    echo ⚠️ URL do túnel não detectada automaticamente
    echo 💡 Verifique o arquivo: %tunnel_log%
)

exit /b 0

:show_final_info
echo.
echo 🎉 DESKTOP AGENT ATIVO COM TÚNEL PÚBLICO!
echo ========================================
echo.
echo 🖥️  Local:     http://localhost:8769
if defined tunnel_url (
    echo 🌐 Público:   %tunnel_url%
    echo.
    echo 📋 PARA USAR NO VERCEL:
    echo    1. Copie esta URL: %tunnel_url%
    echo    2. Configure na aplicação web
    echo    3. Teste a conexão via tunnel!
) else (
    echo 🌐 Público:   Verifique logs do Cloudflared
)
echo.
echo 📊 Logs:
echo    - Desktop Agent: agent.log
echo    - Túnel: %tunnel_log%
echo.
exit /b 0

:monitor_services
echo ⚡ Monitorando serviços... (Ctrl+C para parar)
echo.

:monitor_loop
REM Verificar Desktop Agent
powershell -Command "try { Invoke-RestMethod -Uri 'http://localhost:8769/status' -TimeoutSec 2 | Out-Null; Write-Host '✅ Desktop Agent: OK' } catch { Write-Host '❌ Desktop Agent: ERRO' }" 

REM Verificar Túnel
tasklist /FI "IMAGENAME eq cloudflared.exe" 2>nul | find /I "cloudflared.exe" >nul
if %errorlevel% equ 0 (
    echo ✅ Túnel: OK
) else (
    echo ❌ Túnel: ERRO
)

if defined tunnel_url (
    echo 🌐 URL Pública: %tunnel_url%
)

echo ⏳ Próxima verificação em 30s...
echo.
timeout /t 30 /nobreak >nul
goto monitor_loop
