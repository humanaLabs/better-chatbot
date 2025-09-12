#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("🎭 Better Chatbot Desktop Agent - Setup");
console.log("=====================================\n");

const desktopAgentDir = path.join(process.cwd(), "desktop-agent");

// 1. Verificar se a pasta existe
if (!fs.existsSync(desktopAgentDir)) {
  console.error("❌ Pasta desktop-agent não encontrada!");
  console.log("💡 Execute este script na raiz do projeto better-chatbot");
  process.exit(1);
}

console.log("📁 Pasta desktop-agent encontrada");

// 2. Instalar dependências
console.log("\n📦 Instalando dependências...");
try {
  process.chdir(desktopAgentDir);
  execSync("npm install", { stdio: "inherit" });
  console.log("✅ Dependências instaladas!");
} catch (error) {
  console.error("❌ Erro ao instalar dependências:", error.message);
  process.exit(1);
}

// 3. Compilar TypeScript
console.log("\n🔨 Compilando TypeScript...");
try {
  execSync("npx tsc", { stdio: "inherit" });
  console.log("✅ TypeScript compilado!");
} catch (error) {
  console.error("❌ Erro ao compilar TypeScript:", error.message);
  process.exit(1);
}

// 4. Criar pasta de screenshots
const screenshotsDir = path.join(desktopAgentDir, "screenshots");
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
  console.log("✅ Pasta screenshots criada!");
}

// 5. Criar ícones (placeholders)
const assetsDir = path.join(desktopAgentDir, "assets");
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir);
}

// Criar arquivos de ícone placeholder
const iconFiles = ["icon.png", "icon.ico", "icon.icns", "tray-icon.png"];

iconFiles.forEach((iconFile) => {
  const iconPath = path.join(assetsDir, iconFile);
  if (!fs.existsSync(iconPath)) {
    // Criar arquivo placeholder (você pode substituir por ícones reais)
    fs.writeFileSync(iconPath, "");
    console.log(`✅ Placeholder criado: ${iconFile}`);
  }
});

// 6. Testar instalação do Playwright
console.log("\n🎭 Verificando Playwright...");
try {
  execSync("npx playwright install chromium", { stdio: "inherit" });
  console.log("✅ Playwright configurado!");
} catch (_error) {
  console.log("⚠️ Aviso: Erro ao instalar Playwright browsers");
  console.log("💡 Execute manualmente: npx playwright install");
}

// 7. Criar script de inicialização
const startScript = `#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando Better Chatbot Desktop Agent...');

const agentProcess = spawn('node', ['dist/main.js'], {
  cwd: __dirname,
  stdio: 'inherit'
});

agentProcess.on('close', (code) => {
  console.log(\`🔒 Desktop Agent finalizado com código: \${code}\`);
});

process.on('SIGINT', () => {
  console.log('\\n🛑 Parando Desktop Agent...');
  agentProcess.kill('SIGTERM');
});
`;

fs.writeFileSync(path.join(desktopAgentDir, "start.js"), startScript);
console.log("✅ Script de inicialização criado!");

// 8. Atualizar package.json do projeto principal
const mainPackageJsonPath = path.join(process.cwd(), "..", "package.json");
if (fs.existsSync(mainPackageJsonPath)) {
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(mainPackageJsonPath, "utf8"),
    );

    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }

    packageJson.scripts["desktop-agent"] = "cd desktop-agent && npm start";
    packageJson.scripts["desktop-agent:dev"] =
      "cd desktop-agent && npm run dev";
    packageJson.scripts["desktop-agent:build"] =
      "cd desktop-agent && npm run build";

    fs.writeFileSync(mainPackageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log("✅ Scripts adicionados ao package.json principal!");
  } catch (_error) {
    console.log("⚠️ Não foi possível atualizar package.json principal");
  }
}

// 9. Resumo final
console.log("\n🎉 Setup do Desktop Agent concluído!\n");
console.log("📋 Como usar:");
console.log("");
console.log("1️⃣ Iniciar o Desktop Agent:");
console.log("   cd desktop-agent && npm start");
console.log("   ou");
console.log("   npm run desktop-agent");
console.log("");
console.log("2️⃣ Testar a conexão:");
console.log("   curl http://localhost:8766/status");
console.log("");
console.log("3️⃣ Usar no Better Chatbot:");
console.log("   - Acesse /playwright-hybrid");
console.log('   - Clique em "Conectar ao MCP"');
console.log("   - O sistema detectará automaticamente o Desktop Agent");
console.log("");
console.log("🔗 URLs importantes:");
console.log("   📊 Status UI: Clique no ícone da bandeja");
console.log("   📡 WebSocket: ws://localhost:8765");
console.log("   🌐 HTTP API: http://localhost:8766");
console.log("");
console.log("🎭 O navegador será aberto no seu computador local!");
console.log("   Você verá todas as ações acontecendo em tempo real.");
console.log("");
