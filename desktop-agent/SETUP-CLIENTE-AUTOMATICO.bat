@echo off
setlocal enabledelayedexpansion
title SETUP AUTOMATICO - DESKTOP AGENT + TUNNEL

echo.
echo ========================================
echo 🚀 SETUP AUTOMATICO DESKTOP AGENT
echo ========================================
echo.
echo Este script vai:
echo   1. Instalar todas as dependencias
echo   2. Configurar o Desktop Agent
echo   3. Criar tunnel publico automatico
echo   4. Gerar URL para usar na aplicacao web
echo.
echo ⏱️  Tempo estimado: 2-3 minutos
echo.
pause

REM ========================================
REM ETAPA 1: VERIFICAR PRE-REQUISITOS
REM ========================================
echo.
echo 📋 ETAPA 1/6: Verificando pre-requisitos...

REM Verificar Node.js
node --version >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js nao encontrado!
    echo.
    echo 📥 INSTALE O NODE.JS:
    echo    1. Acesse: https://nodejs.org
    echo    2. Baixe a versao LTS
    echo    3. Execute este script novamente
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js encontrado
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo    Versao: %NODE_VERSION%

REM ========================================
REM ETAPA 2: LIMPAR AMBIENTE
REM ========================================
echo.
echo 🧹 ETAPA 2/6: Limpando ambiente...

REM Parar processos existentes
echo    Parando processos Node.js...
taskkill /F /IM node.exe >nul 2>nul
taskkill /F /IM cloudflared.exe >nul 2>nul
timeout /t 2 /nobreak >nul

REM Limpar portas
echo    Liberando porta 8768...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8768') do (
    taskkill /F /PID %%a >nul 2>nul
)

echo ✅ Ambiente limpo

REM ========================================
REM ETAPA 3: INSTALAR DEPENDENCIAS
REM ========================================
echo.
echo 📦 ETAPA 3/6: Instalando dependencias...

REM Instalar dependencias Node.js
echo    Instalando pacotes npm...
call npm install >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Erro ao instalar dependencias npm
    echo    Tentando novamente...
    call npm install --force
    if %errorlevel% neq 0 (
        echo ❌ ERRO CRITICO: npm install falhou
        pause
        exit /b 1
    )
)

echo ✅ Dependencias Node.js instaladas

REM Instalar Playwright browsers
echo    Instalando navegadores Playwright...
call npx playwright install chromium >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Aviso: Playwright install falhou (continuando...)
)

echo ✅ Playwright configurado

REM ========================================
REM ETAPA 4: INSTALAR CLOUDFLARED
REM ========================================
echo.
echo 🌐 ETAPA 4/6: Configurando tunnel...

REM Verificar se cloudflared existe
where cloudflared >nul 2>nul
if %errorlevel% neq 0 (
    echo    Baixando Cloudflared...
    powershell -Command "try { Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe' -UseBasicParsing } catch { exit 1 }"
    if %errorlevel% neq 0 (
        echo ❌ Erro ao baixar Cloudflared
        echo    Verifique sua conexao com internet
        pause
        exit /b 1
    )
    echo ✅ Cloudflared baixado
) else (
    echo ✅ Cloudflared ja instalado
)

REM ========================================
REM ETAPA 5: COMPILAR DESKTOP AGENT
REM ========================================
echo.
echo 🔧 ETAPA 5/6: Compilando Desktop Agent...

REM Limpar compilacao anterior
if exist "dist" rmdir /s /q "dist" >nul 2>nul

REM Compilar TypeScript
echo    Compilando TypeScript...
call npx tsc
if %errorlevel% neq 0 (
    echo ❌ ERRO: Compilacao TypeScript falhou
    echo    Verifique se todos os arquivos estao presentes
    pause
    exit /b 1
)

REM Verificar se compilacao foi bem-sucedida
if not exist "dist\simple-agent.js" (
    echo ❌ ERRO: Arquivo dist\simple-agent.js nao encontrado
    echo    A compilacao pode ter falhado
    pause
    exit /b 1
)

echo ✅ Desktop Agent compilado com sucesso

REM ========================================
REM ETAPA 6: INICIAR SERVICOS
REM ========================================
echo.
echo 🚀 ETAPA 6/6: Iniciando servicos...

REM Iniciar Desktop Agent em background
echo    Iniciando Desktop Agent...
start /B node dist/simple-agent.js

REM Aguardar inicializacao
echo    Aguardando inicializacao (5s)...
timeout /t 5 /nobreak >nul

REM Testar se Desktop Agent esta rodando
curl -s http://localhost:8768/status >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ ERRO: Desktop Agent nao iniciou corretamente
    echo    Verifique se a porta 8768 esta livre
    pause
    exit /b 1
)

echo ✅ Desktop Agent rodando na porta 8768

REM Iniciar tunnel
echo    Criando tunnel publico...
if exist "cloudflared.exe" (
    start /B cloudflared.exe tunnel --url http://localhost:8768 > tunnel-output.txt 2>&1
) else (
    start /B cloudflared tunnel --url http://localhost:8768 > tunnel-output.txt 2>&1
)

REM Aguardar tunnel
echo    Aguardando tunnel (15s)...
timeout /t 15 /nobreak >nul

REM Extrair URL do tunnel
set "tunnel_url="
for /f "tokens=*" %%i in ('findstr "https://.*\.trycloudflare\.com" tunnel-output.txt 2^>nul') do (
    set "tunnel_url=%%i"
    goto :found_url
)

:found_url
if "%tunnel_url%"=="" (
    echo ⚠️  Aviso: URL do tunnel nao encontrada automaticamente
    echo    Verifique o arquivo tunnel-output.txt
    set "tunnel_url=VERIFIQUE_ARQUIVO_tunnel-output.txt"
) else (
    echo ✅ Tunnel criado com sucesso
)

REM Salvar URL em arquivo
echo %tunnel_url% > tunnel-url.txt

REM ========================================
REM RESULTADO FINAL
REM ========================================
echo.
echo ========================================
echo 🎉 SETUP CONCLUIDO COM SUCESSO!
echo ========================================
echo.
echo 📊 STATUS DOS SERVICOS:
echo    🖥️  Desktop Agent: ✅ Rodando (porta 8768)
echo    🌐 Tunnel Publico: ✅ Ativo
echo    🎭 Navegador: ✅ Pronto para controle
echo.
echo 🔗 URLS DISPONIVEIS:
echo    📍 Local:   http://localhost:8768
echo    🌍 Publico: %tunnel_url%
echo.
echo 📋 COMO USAR NA APLICACAO WEB:
echo    1. Acesse sua aplicacao web
echo    2. Va para a pagina /playwright-hybrid
echo    3. Cole esta URL no campo servidor:
echo       %tunnel_url%
echo    4. Clique em "Procurar Desktop Agent"
echo    5. Comece a controlar seu navegador!
echo.
echo 💾 ARQUIVOS CRIADOS:
echo    📄 tunnel-url.txt     (URL do tunnel)
echo    📄 tunnel-output.txt  (logs do tunnel)
echo.
echo ⚠️  IMPORTANTE:
echo    - Mantenha esta janela ABERTA
echo    - Para parar, pressione Ctrl+C
echo    - Para reiniciar, execute este script novamente
echo.
echo 🆘 SUPORTE:
echo    - Status: curl http://localhost:8768/status
echo    - Logs: type tunnel-output.txt
echo    - Teste: curl -H "ngrok-skip-browser-warning: true" %tunnel_url%/status
echo.
echo ========================================

REM Manter janela aberta e monitorar
echo 📊 MONITORAMENTO ATIVO - Pressione Ctrl+C para parar
echo.

:monitor_loop
timeout /t 30 /nobreak >nul
echo [%date% %time%] ✅ Servicos rodando normalmente...
goto monitor_loop
