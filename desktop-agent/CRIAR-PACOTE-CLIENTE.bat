@echo off
echo ========================================
echo 📦 CRIANDO PACOTE PARA CLIENTE
echo ========================================
echo.

REM Criar pasta de distribuição
if exist "DISTRIBUICAO-CLIENTE" rmdir /s /q "DISTRIBUICAO-CLIENTE"
mkdir "DISTRIBUICAO-CLIENTE"

echo 📁 Copiando arquivos essenciais...

REM Copiar arquivos TypeScript
copy "src\*.ts" "DISTRIBUICAO-CLIENTE\" >nul
mkdir "DISTRIBUICAO-CLIENTE\src"
copy "src\*.ts" "DISTRIBUICAO-CLIENTE\src\" >nul

REM Copiar configurações
copy "package.json" "DISTRIBUICAO-CLIENTE\" >nul
copy "tsconfig.json" "DISTRIBUICAO-CLIENTE\" >nul

REM Copiar scripts
copy "SETUP-CLIENTE-AUTOMATICO.bat" "DISTRIBUICAO-CLIENTE\" >nul
copy "start-desktop-agent.bat" "DISTRIBUICAO-CLIENTE\" >nul
copy "start-agent-smart.bat" "DISTRIBUICAO-CLIENTE\" >nul

REM Copiar documentação
copy "README-CLIENTE.md" "DISTRIBUICAO-CLIENTE\README.md" >nul

REM Criar arquivo de instruções rápidas
echo # 🚀 INSTALACAO RAPIDA > "DISTRIBUICAO-CLIENTE\LEIA-ME-PRIMEIRO.txt"
echo. >> "DISTRIBUICAO-CLIENTE\LEIA-ME-PRIMEIRO.txt"
echo 1. Clique duplo em: SETUP-CLIENTE-AUTOMATICO.bat >> "DISTRIBUICAO-CLIENTE\LEIA-ME-PRIMEIRO.txt"
echo 2. Aguarde a instalacao automatica >> "DISTRIBUICAO-CLIENTE\LEIA-ME-PRIMEIRO.txt"
echo 3. Copie a URL que aparece no final >> "DISTRIBUICAO-CLIENTE\LEIA-ME-PRIMEIRO.txt"
echo 4. Cole na aplicacao web >> "DISTRIBUICAO-CLIENTE\LEIA-ME-PRIMEIRO.txt"
echo. >> "DISTRIBUICAO-CLIENTE\LEIA-ME-PRIMEIRO.txt"
echo Suporte: suporte@empresa.com >> "DISTRIBUICAO-CLIENTE\LEIA-ME-PRIMEIRO.txt"

echo ✅ Arquivos copiados

echo.
echo 🗜️ Criando arquivo ZIP...

REM Criar ZIP usando PowerShell
powershell -Command "Compress-Archive -Path 'DISTRIBUICAO-CLIENTE\*' -DestinationPath 'Desktop-Agent-Cliente.zip' -Force"

if exist "Desktop-Agent-Cliente.zip" (
    echo ✅ ZIP criado: Desktop-Agent-Cliente.zip
) else (
    echo ❌ Erro ao criar ZIP
)

echo.
echo 📊 CONTEUDO DO PACOTE:
dir "DISTRIBUICAO-CLIENTE" /b

echo.
echo ========================================
echo 🎉 PACOTE PRONTO PARA DISTRIBUICAO!
echo ========================================
echo.
echo 📦 Arquivo: Desktop-Agent-Cliente.zip
echo 📁 Pasta: DISTRIBUICAO-CLIENTE\
echo.
echo 📋 INSTRUCOES PARA O CLIENTE:
echo    1. Extrair o ZIP
echo    2. Executar SETUP-CLIENTE-AUTOMATICO.bat
echo    3. Copiar URL gerada
echo    4. Usar na aplicacao web
echo.
pause
