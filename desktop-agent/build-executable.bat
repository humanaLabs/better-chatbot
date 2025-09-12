@echo off
echo 🎭 Better Chatbot Desktop Agent - Build Executável
echo ================================================

echo.
echo 📁 Verificando estrutura...
if not exist "package.json" (
    echo ❌ Erro: Execute este script dentro da pasta desktop-agent
    pause
    exit /b 1
)

echo ✅ Pasta desktop-agent encontrada

echo.
echo 📦 Instalando dependências...
call npm install
if errorlevel 1 (
    echo ❌ Erro ao instalar dependências
    pause
    exit /b 1
)

echo.
echo 🔨 Compilando TypeScript...
call npx tsc
if errorlevel 1 (
    echo ❌ Erro ao compilar TypeScript
    pause
    exit /b 1
)

echo.
echo 📸 Criando pasta screenshots...
if not exist "screenshots" mkdir screenshots

echo.
echo 🎭 Instalando Playwright browsers...
call npx playwright install chromium
if errorlevel 1 (
    echo ⚠️ Aviso: Erro ao instalar Playwright browsers
    echo 💡 Você pode instalar manualmente depois: npx playwright install
)

echo.
echo 🔧 Gerando executável...
call npm run dist
if errorlevel 1 (
    echo ❌ Erro ao gerar executável
    pause
    exit /b 1
)

echo.
echo 🎉 Executável gerado com sucesso!
echo.
echo 📍 Localização:
echo    Windows: dist-electron\win-unpacked\Better Chatbot Desktop Agent.exe
echo    Instalador: dist-electron\Better Chatbot Desktop Agent Setup 1.0.0.exe
echo.
echo 🚀 Para executar:
echo    1. Navegue até dist-electron\win-unpacked\
echo    2. Execute: Better Chatbot Desktop Agent.exe
echo    3. Aparecerá um ícone na bandeja do sistema
echo.
pause
