@echo off
setlocal enabledelayedexpansion
title SETUP AUTOMATICO - DESKTOP AGENT + LOCALTUNNEL (ULTRA LEVE)

echo.
echo ========================================
echo 🚀 SETUP AUTOMATICO DESKTOP AGENT (ULTRA LEVE)
echo ========================================
echo.
echo Este script vai:
echo   1. Instalar todas as dependencias
echo   2. Configurar o Desktop Agent
echo   3. Criar tunnel publico com LOCALTUNNEL (2MB)
echo   4. Gerar URL para usar na aplicacao web
echo.
echo ⏱️  Tempo estimado: 30 segundos
echo 💾 Download: ~2MB (ultra leve!)
echo.
pause

REM ========================================
REM ETAPA 1: VERIFICAR PRE-REQUISITOS
REM ========================================
echo.
echo 📋 ETAPA 1/5: Verificando pre-requisitos...

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
echo 🧹 ETAPA 2/5: Limpando ambiente...

REM Parar processos existentes
taskkill /F /IM node.exe >nul 2>nul
timeout /t 2 /nobreak >nul

REM Limpar porta
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8768') do (
    taskkill /F /PID %%a >nul 2>nul
)

echo ✅ Ambiente limpo

REM ========================================
REM ETAPA 3: INSTALAR DEPENDENCIAS
REM ========================================
echo.
echo 📦 ETAPA 3/5: Instalando dependencias...

REM Instalar dependencias Node.js
echo    Instalando pacotes npm...
call npm install >nul 2>nul

REM Instalar localtunnel globalmente (ultra leve - 2MB)
echo    Instalando localtunnel (2MB)...
call npm install -g localtunnel >nul 2>nul

echo ✅ Dependencias instaladas

REM ========================================
REM ETAPA 4: COMPILAR E INICIAR
REM ========================================
echo.
echo 🔧 ETAPA 4/5: Compilando e iniciando...

REM Compilar
call npx tsc >nul 2>nul

REM Iniciar Desktop Agent
echo    Iniciando Desktop Agent...
start /B node dist/simple-agent.js

REM Aguardar
timeout /t 3 /nobreak >nul

echo ✅ Desktop Agent iniciado

REM ========================================
REM ETAPA 5: CRIAR TUNNEL ULTRA LEVE
REM ========================================
echo.
echo 🌐 ETAPA 5/5: Criando tunnel (2MB)...

REM Iniciar localtunnel
echo    Criando tunnel localtunnel...
start /B lt --port 8768 --subdomain desktop-agent-%RANDOM% > tunnel-output.txt 2>&1

REM Aguardar tunnel
timeout /t 8 /nobreak >nul

REM Extrair URL
set "tunnel_url="
for /f "tokens=*" %%i in ('findstr "https://.*\.loca\.lt" tunnel-output.txt 2^>nul') do (
    set "tunnel_url=%%i"
    goto :found_url
)

:found_url
if "%tunnel_url%"=="" (
    echo ⚠️  Gerando URL alternativa...
    set "tunnel_url=https://desktop-agent-%RANDOM%.loca.lt"
    echo %tunnel_url% > tunnel-url.txt
    echo    Teste manualmente: %tunnel_url%
) else (
    echo ✅ Tunnel criado: %tunnel_url%
    echo %tunnel_url% > tunnel-url.txt
)

REM ========================================
REM RESULTADO FINAL
REM ========================================
echo.
echo ========================================
echo 🎉 SETUP ULTRA LEVE CONCLUIDO! (2MB)
echo ========================================
echo.
echo 📊 STATUS:
echo    🖥️  Desktop Agent: ✅ Porta 8768
echo    🌐 Tunnel: ✅ %tunnel_url%
echo    💾 Tamanho: ~2MB (ultra leve!)
echo.
echo 📋 COMO USAR:
echo    1. Acesse sua aplicacao web
echo    2. Cole esta URL: %tunnel_url%
echo    3. Clique "Procurar Desktop Agent"
echo.
echo ⚠️  NOTA LOCALTUNNEL:
echo    - Primeira visita pode pedir confirmacao
echo    - Clique "Continue" se aparecer aviso
echo    - URL pode mudar a cada reinicio
echo.
echo 🆘 ALTERNATIVAS SE NAO FUNCIONAR:
echo    - Use: SETUP-CLIENTE-NGROK.bat (15MB)
echo    - Ou: SETUP-CLIENTE-AUTOMATICO.bat (50MB)
echo.
echo ========================================

pause
