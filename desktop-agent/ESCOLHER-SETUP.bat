@echo off
title ESCOLHER SETUP - DESKTOP AGENT

echo.
echo ========================================
echo 🎯 ESCOLHA SEU SETUP DESKTOP AGENT
echo ========================================
echo.
echo Escolha a opcao que melhor se adapta:
echo.
echo 1. ⚡ ULTRA RAPIDO (0MB - Sem Download)
echo    - Usa SSH nativo do Windows
echo    - Tempo: 20 segundos
echo    - Requer: Windows 10+ com OpenSSH
echo.
echo 2. 🪶 ULTRA LEVE (2MB - Localtunnel)
echo    - Download minimo
echo    - Tempo: 30 segundos  
echo    - Mais estavel que opcao 1
echo.
echo 3. ⚖️ EQUILIBRADO (15MB - Ngrok)
echo    - Boa estabilidade
echo    - Tempo: 1-2 minutos
echo    - Recomendado para uso regular
echo.
echo 4. 🚀 COMPLETO (50MB - Cloudflare)
echo    - Maxima velocidade
echo    - Tempo: 2-3 minutos
echo    - Melhor para producao
echo.
echo 5. ❓ AJUDA - Qual escolher?
echo.
echo 0. ❌ Cancelar
echo.
echo ========================================

set /p choice="Digite sua escolha (0-5): "

if "%choice%"=="1" goto ultra_rapido
if "%choice%"=="2" goto ultra_leve  
if "%choice%"=="3" goto equilibrado
if "%choice%"=="4" goto completo
if "%choice%"=="5" goto ajuda
if "%choice%"=="0" goto cancelar

echo ❌ Opcao invalida!
pause
goto :eof

:ultra_rapido
echo.
echo ⚡ Executando Setup Ultra Rapido (0MB)...
call SETUP-CLIENTE-SEM-DOWNLOAD.bat
goto :eof

:ultra_leve
echo.
echo 🪶 Executando Setup Ultra Leve (2MB)...
call SETUP-CLIENTE-ULTRA-LEVE.bat
goto :eof

:equilibrado
echo.
echo ⚖️ Executando Setup Equilibrado (15MB)...
call SETUP-CLIENTE-NGROK.bat
goto :eof

:completo
echo.
echo 🚀 Executando Setup Completo (50MB)...
call SETUP-CLIENTE-AUTOMATICO.bat
goto :eof

:ajuda
echo.
echo ========================================
echo 💡 GUIA DE ESCOLHA
echo ========================================
echo.
echo 🤔 QUAL ESCOLHER?
echo.
echo 👤 USUARIO CASUAL:
echo    - Opcao 2 (Ultra Leve - 2MB)
echo    - Rapido e funcional
echo.
echo 🏢 USUARIO EMPRESARIAL:
echo    - Opcao 3 (Equilibrado - 15MB)
echo    - Estavel e confiavel
echo.
echo ⚡ TESTE RAPIDO:
echo    - Opcao 1 (Ultra Rapido - 0MB)
echo    - Se tiver OpenSSH ativo
echo.
echo 🚀 PRODUCAO/PERFORMANCE:
echo    - Opcao 4 (Completo - 50MB)
echo    - Maxima velocidade
echo.
echo 📊 COMPARACAO TECNICA:
echo.
echo    Opcao 1: SSH + serveo.net
echo    - Pros: 0MB, muito rapido
echo    - Contras: Pode ser instavel
echo.
echo    Opcao 2: npm + localtunnel  
echo    - Pros: 2MB, equilibrado
echo    - Contras: URLs temporarias
echo.
echo    Opcao 3: npm + ngrok
echo    - Pros: Muito estavel
echo    - Contras: 15MB download
echo.
echo    Opcao 4: cloudflared
echo    - Pros: Maxima performance
echo    - Contras: 50MB download
echo.
echo 🎯 RECOMENDACAO GERAL: Opcao 2 ou 3
echo.
pause
cls
goto :eof

:cancelar
echo.
echo ❌ Setup cancelado pelo usuario.
echo.
pause
goto :eof
