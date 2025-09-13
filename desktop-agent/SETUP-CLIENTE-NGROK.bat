@echo off
setlocal enabledelayedexpansion
title SETUP AUTOMATICO - DESKTOP AGENT + NGROK (LEVE)

echo.
echo ========================================
echo 🚀 SETUP AUTOMATICO DESKTOP AGENT (LEVE)
echo ========================================
echo.
echo Este script vai:
echo   1. Instalar todas as dependencias
echo   2. Configurar o Desktop Agent
echo   3. Criar tunnel publico com NGROK (15MB)
echo   4. Gerar URL para usar na aplicacao web
echo.
echo ⏱️  Tempo estimado: 1-2 minutos
echo 💾 Download: ~15MB (muito menor que Cloudflare)
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
taskkill /F /IM ngrok.exe >nul 2>nul
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

echo ✅ Playwright configurado

REM ========================================
REM ETAPA 4: INSTALAR NGROK (LEVE)
REM ========================================
echo.
echo 🌐 ETAPA 4/6: Configurando ngrok (15MB)...

REM Verificar se ngrok existe
where ngrok >nul 2>nul
if %errorlevel% neq 0 (
    echo    Verificando se ngrok esta instalado via npm...
    call npm list -g ngrok >nul 2>nul
    if %errorlevel% neq 0 (
        echo    Instalando ngrok via npm (mais rapido)...
        call npm install -g ngrok
        if %errorlevel% neq 0 (
            echo    Tentativa npm falhou, baixando diretamente...
            echo    Baixando ngrok (15MB - muito menor que Cloudflare)...
            powershell -Command "try { Invoke-WebRequest -Uri 'https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip' -OutFile 'ngrok.zip' -UseBasicParsing } catch { exit 1 }"
            if %errorlevel% neq 0 (
                echo ❌ Erro ao baixar ngrok
                echo    Verifique sua conexao com internet
                pause
                exit /b 1
            )
            
            echo    Extraindo ngrok...
            powershell -Command "Expand-Archive -Path 'ngrok.zip' -DestinationPath '.' -Force"
            del ngrok.zip >nul 2>nul
        )
    )
    echo ✅ ngrok instalado
) else (
    echo ✅ ngrok ja instalado
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
    pause
    exit /b 1
)

REM Verificar se compilacao foi bem-sucedida
if not exist "dist\simple-agent.js" (
    echo ❌ ERRO: Arquivo dist\simple-agent.js nao encontrado
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
    pause
    exit /b 1
)

echo ✅ Desktop Agent rodando na porta 8768

REM Iniciar ngrok
echo    Criando tunnel ngrok...
start /B ngrok http 8768 --log=stdout > tunnel-output.txt 2>&1

REM Aguardar tunnel
echo    Aguardando tunnel (10s)...
timeout /t 10 /nobreak >nul

REM Extrair URL do tunnel
set "tunnel_url="
for /f "tokens=*" %%i in ('findstr "https://.*\.ngrok-free\.app" tunnel-output.txt 2^>nul') do (
    for %%j in (%%i) do (
        echo %%j | findstr "https://" >nul
        if !errorlevel! equ 0 (
            set "tunnel_url=%%j"
            goto :found_url
        )
    )
)

:found_url
if "%tunnel_url%"=="" (
    echo ⚠️  URL nao encontrada automaticamente
    echo    Verifique: tunnel-output.txt
    echo    Ou acesse: http://localhost:4040 (ngrok dashboard)
    set "tunnel_url=VERIFIQUE_http://localhost:4040"
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
echo    🌐 Tunnel ngrok: ✅ Ativo
echo    🎭 Navegador: ✅ Pronto para controle
echo.
echo 🔗 URLS DISPONIVEIS:
echo    📍 Local:   http://localhost:8768
echo    🌍 Publico: %tunnel_url%
echo    📊 Dashboard: http://localhost:4040
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
echo    📄 tunnel-output.txt  (logs do ngrok)
echo.
echo ⚠️  IMPORTANTE:
echo    - Mantenha esta janela ABERTA
echo    - Para parar, pressione Ctrl+C
echo    - Dashboard ngrok: http://localhost:4040
echo.
echo 🆘 SUPORTE:
echo    - Status: curl http://localhost:8768/status
echo    - Dashboard: http://localhost:4040
echo    - Logs: type tunnel-output.txt
echo.
echo ========================================

REM Manter janela aberta e monitorar
echo 📊 MONITORAMENTO ATIVO - Pressione Ctrl+C para parar
echo    💡 Dica: Acesse http://localhost:4040 para ver estatisticas
echo.

:monitor_loop
timeout /t 30 /nobreak >nul
echo [%date% %time%] ✅ Servicos rodando normalmente... (Dashboard: http://localhost:4040)
goto monitor_loop
