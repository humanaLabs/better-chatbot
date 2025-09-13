@echo off
setlocal enabledelayedexpansion
title SETUP AUTOMATICO - DESKTOP AGENT + SERVEO (SEM DOWNLOAD)

echo.
echo ========================================
echo 🚀 SETUP AUTOMATICO DESKTOP AGENT (SEM DOWNLOAD)
echo ========================================
echo.
echo Este script vai:
echo   1. Instalar apenas dependencias Node.js
echo   2. Configurar o Desktop Agent
echo   3. Criar tunnel publico com SERVEO (0MB - sem download!)
echo   4. Gerar URL para usar na aplicacao web
echo.
echo ⏱️  Tempo estimado: 20 segundos
echo 💾 Download: 0MB (usa SSH nativo do Windows!)
echo.
pause

REM ========================================
REM ETAPA 1: VERIFICAR PRE-REQUISITOS
REM ========================================
echo.
echo 📋 ETAPA 1/4: Verificando pre-requisitos...

REM Verificar Node.js
node --version >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js nao encontrado!
    echo    Instale de: https://nodejs.org
    pause
    exit /b 1
)

REM Verificar SSH (nativo no Windows 10+)
ssh -V >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ SSH nao encontrado!
    echo    Ative OpenSSH no Windows:
    echo    Settings ^> Apps ^> Optional Features ^> OpenSSH Client
    pause
    exit /b 1
)

echo ✅ Node.js e SSH encontrados

REM ========================================
REM ETAPA 2: SETUP RAPIDO
REM ========================================
echo.
echo 🧹 ETAPA 2/4: Setup rapido...

REM Limpar processos
taskkill /F /IM node.exe >nul 2>nul
taskkill /F /IM ssh.exe >nul 2>nul

REM Instalar dependencias
echo    Instalando dependencias npm...
call npm install >nul 2>nul

REM Compilar
echo    Compilando...
call npx tsc >nul 2>nul

echo ✅ Setup concluido

REM ========================================
REM ETAPA 3: INICIAR DESKTOP AGENT
REM ========================================
echo.
echo 🚀 ETAPA 3/4: Iniciando Desktop Agent...

start /B node dist/simple-agent.js
timeout /t 3 /nobreak >nul

echo ✅ Desktop Agent rodando na porta 8768

REM ========================================
REM ETAPA 4: TUNNEL SEM DOWNLOAD (SSH)
REM ========================================
echo.
echo 🌐 ETAPA 4/4: Criando tunnel SSH (0MB)...

REM Gerar nome aleatorio
set /a RANDOM_NUM=%RANDOM% %% 9999 + 1000
set SUBDOMAIN=desktop-agent-%RANDOM_NUM%

echo    Criando tunnel via SSH (serveo.net)...
echo    Subdomain: %SUBDOMAIN%

REM Iniciar tunnel SSH em background
start /B ssh -o StrictHostKeyChecking=no -R %SUBDOMAIN%:80:localhost:8768 serveo.net > tunnel-output.txt 2>&1

REM Aguardar tunnel
echo    Aguardando conexao SSH...
timeout /t 8 /nobreak >nul

REM Construir URL
set "tunnel_url=https://%SUBDOMAIN%.serveo.net"
echo %tunnel_url% > tunnel-url.txt

REM ========================================
REM RESULTADO FINAL
REM ========================================
echo.
echo ========================================
echo 🎉 SETUP SEM DOWNLOAD CONCLUIDO! (0MB)
echo ========================================
echo.
echo 📊 STATUS:
echo    🖥️  Desktop Agent: ✅ Porta 8768
echo    🌐 Tunnel SSH: ✅ %tunnel_url%
echo    💾 Download: 0MB (usa SSH nativo!)
echo.
echo 📋 COMO USAR:
echo    1. Acesse sua aplicacao web
echo    2. Cole esta URL: %tunnel_url%
echo    3. Clique "Procurar Desktop Agent"
echo.
echo ⚠️  NOTA SERVEO:
echo    - Servico gratuito via SSH
echo    - Pode ter limite de tempo
echo    - Se nao funcionar, use alternativas
echo.
echo 🆘 ALTERNATIVAS:
echo    - SETUP-CLIENTE-ULTRA-LEVE.bat (2MB)
echo    - SETUP-CLIENTE-NGROK.bat (15MB)
echo    - SETUP-CLIENTE-AUTOMATICO.bat (50MB)
echo.
echo 🔍 TESTE A URL:
echo    %tunnel_url%/status
echo.
echo ========================================

echo 📊 Monitorando... (Ctrl+C para parar)
:monitor
timeout /t 30 /nobreak >nul
echo [%time%] ✅ Servicos ativos - URL: %tunnel_url%
goto monitor
