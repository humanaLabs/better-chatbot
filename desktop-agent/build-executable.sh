#!/bin/bash

echo "🎭 Better Chatbot Desktop Agent - Build Executável"
echo "================================================"

# Verificar se estamos na pasta correta
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script dentro da pasta desktop-agent"
    exit 1
fi

echo "✅ Pasta desktop-agent encontrada"

# Instalar dependências
echo ""
echo "📦 Instalando dependências..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Erro ao instalar dependências"
    exit 1
fi

# Compilar TypeScript
echo ""
echo "🔨 Compilando TypeScript..."
npx tsc
if [ $? -ne 0 ]; then
    echo "❌ Erro ao compilar TypeScript"
    exit 1
fi

# Criar pasta screenshots
echo ""
echo "📸 Criando pasta screenshots..."
mkdir -p screenshots

# Instalar Playwright browsers
echo ""
echo "🎭 Instalando Playwright browsers..."
npx playwright install chromium
if [ $? -ne 0 ]; then
    echo "⚠️ Aviso: Erro ao instalar Playwright browsers"
    echo "💡 Você pode instalar manualmente depois: npx playwright install"
fi

# Gerar executável
echo ""
echo "🔧 Gerando executável..."
npm run dist
if [ $? -ne 0 ]; then
    echo "❌ Erro ao gerar executável"
    exit 1
fi

echo ""
echo "🎉 Executável gerado com sucesso!"
echo ""
echo "📍 Localização:"

# Detectar sistema operacional
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "   macOS: dist-electron/mac/Better Chatbot Desktop Agent.app"
    echo "   DMG: dist-electron/Better Chatbot Desktop Agent-1.0.0.dmg"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "   Linux: dist-electron/linux-unpacked/better-chatbot-desktop-agent"
    echo "   AppImage: dist-electron/Better Chatbot Desktop Agent-1.0.0.AppImage"
else
    echo "   Windows: dist-electron/win-unpacked/Better Chatbot Desktop Agent.exe"
    echo "   Instalador: dist-electron/Better Chatbot Desktop Agent Setup 1.0.0.exe"
fi

echo ""
echo "🚀 Para executar:"
echo "   1. Navegue até a pasta dist-electron/"
echo "   2. Execute o arquivo correspondente ao seu sistema"
echo "   3. Aparecerá um ícone na bandeja do sistema"
echo ""
