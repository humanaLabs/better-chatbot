#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🎭 Configurando Browser-use Server para Sessões por Usuário...\n");

const browserUseDir = path.join(process.cwd(), "browser-use-server");

// 1. Clonar browser-use se não existir
if (!fs.existsSync(browserUseDir)) {
  console.log("📥 Clonando browser-use/web-ui...");
  try {
    execSync(
      "git clone https://github.com/browser-use/web-ui.git browser-use-server",
      {
        stdio: "inherit",
        cwd: process.cwd(),
      },
    );
    console.log("✅ Browser-use clonado com sucesso!\n");
  } catch (error) {
    console.error("❌ Erro ao clonar browser-use:", error.message);
    process.exit(1);
  }
} else {
  console.log("✅ Browser-use já existe, atualizando...");
  try {
    execSync("git pull", {
      stdio: "inherit",
      cwd: browserUseDir,
    });
    console.log("✅ Browser-use atualizado!\n");
  } catch (error) {
    console.warn("⚠️ Erro ao atualizar browser-use:", error.message);
  }
}

// 2. Verificar Python
console.log("🐍 Verificando Python...");
try {
  const pythonVersion = execSync("python --version", { encoding: "utf8" });
  console.log(`✅ Python encontrado: ${pythonVersion.trim()}`);
} catch (_error) {
  try {
    const python3Version = execSync("python3 --version", { encoding: "utf8" });
    console.log(`✅ Python3 encontrado: ${python3Version.trim()}`);
  } catch (_error3) {
    console.error("❌ Python não encontrado. Instale Python 3.11+ primeiro.");
    process.exit(1);
  }
}

// 3. Criar ambiente virtual
console.log("\n🔧 Configurando ambiente virtual...");
const venvPath = path.join(browserUseDir, "venv");

if (!fs.existsSync(venvPath)) {
  try {
    execSync("python -m venv venv", {
      stdio: "inherit",
      cwd: browserUseDir,
    });
    console.log("✅ Ambiente virtual criado!");
  } catch (_error) {
    try {
      execSync("python3 -m venv venv", {
        stdio: "inherit",
        cwd: browserUseDir,
      });
      console.log("✅ Ambiente virtual criado com python3!");
    } catch (error3) {
      console.error("❌ Erro ao criar ambiente virtual:", error3.message);
      process.exit(1);
    }
  }
} else {
  console.log("✅ Ambiente virtual já existe!");
}

// 4. Instalar dependências
console.log("\n📦 Instalando dependências Python...");
const isWindows = process.platform === "win32";
const _activateScript = isWindows
  ? path.join(venvPath, "Scripts", "activate.bat")
  : path.join(venvPath, "bin", "activate");

const pythonExe = isWindows
  ? path.join(venvPath, "Scripts", "python.exe")
  : path.join(venvPath, "bin", "python");

try {
  // Instalar requirements
  execSync(`"${pythonExe}" -m pip install --upgrade pip`, {
    stdio: "inherit",
    cwd: browserUseDir,
  });

  execSync(`"${pythonExe}" -m pip install -r requirements.txt`, {
    stdio: "inherit",
    cwd: browserUseDir,
  });

  console.log("✅ Dependências Python instaladas!");
} catch (error) {
  console.error("❌ Erro ao instalar dependências:", error.message);
  process.exit(1);
}

// 5. Instalar Playwright browsers
console.log("\n🎭 Instalando browsers Playwright...");
try {
  execSync(`"${pythonExe}" -m playwright install --with-deps`, {
    stdio: "inherit",
    cwd: browserUseDir,
  });
  console.log("✅ Browsers Playwright instalados!");
} catch (error) {
  console.error("❌ Erro ao instalar browsers:", error.message);
  console.log("⚠️ Continuando sem browsers (pode instalar depois)...");
}

// 6. Criar .env se não existir
const envPath = path.join(browserUseDir, ".env");
const envExamplePath = path.join(browserUseDir, ".env.example");

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  console.log("\n⚙️ Criando arquivo .env...");
  try {
    fs.copyFileSync(envExamplePath, envPath);
    console.log("✅ Arquivo .env criado!");
    console.log(
      "📝 IMPORTANTE: Edite o arquivo .env e adicione suas API keys:",
    );
    console.log(`   📁 ${envPath}`);
  } catch (error) {
    console.error("❌ Erro ao criar .env:", error.message);
  }
}

// 7. Modificar webui.py para suportar sessões
console.log("\n🔧 Modificando webui.py para suportar sessões...");
const webuiPath = path.join(browserUseDir, "webui.py");

if (fs.existsSync(webuiPath)) {
  try {
    let webuiContent = fs.readFileSync(webuiPath, "utf8");

    // Adicionar suporte a --user-session se não existir
    if (!webuiContent.includes("--user-session")) {
      // Procurar por argumentos do parser
      const parserRegex = /parser\.add_argument\(['"]--port['"][\s\S]*?\)/;
      const match = webuiContent.match(parserRegex);

      if (match) {
        const insertion = `
    parser.add_argument('--user-session', type=str, default=None, help='User session ID for isolated sessions')`;

        webuiContent = webuiContent.replace(match[0], match[0] + insertion);

        // Adicionar lógica de sessão
        const sessionLogic = `
    # Session isolation
    if args.user_session:
        session_dir = f"sessions/{args.user_session}"
        os.makedirs(session_dir, exist_ok=True)
        os.environ['BROWSER_USE_SESSION_DIR'] = session_dir
        print(f"🎭 Session: {args.user_session} | Dir: {session_dir}")`;

        // Inserir após parsing dos argumentos
        const argsRegex = /args = parser\.parse_args\(\)/;
        webuiContent = webuiContent.replace(
          argsRegex,
          `args = parser.parse_args()${sessionLogic}`,
        );

        fs.writeFileSync(webuiPath, webuiContent);
        console.log("✅ webui.py modificado para suportar sessões!");
      }
    } else {
      console.log("✅ webui.py já suporta sessões!");
    }
  } catch (error) {
    console.error("❌ Erro ao modificar webui.py:", error.message);
    console.log("⚠️ Você pode modificar manualmente depois...");
  }
}

// 8. Criar script de inicialização
console.log("\n📝 Criando script de inicialização...");
const startScriptPath = path.join(browserUseDir, "start-session.js");
const startScriptContent = `#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const userId = process.argv[2];
const port = process.argv[3] || 8000;

if (!userId) {
  console.error('❌ Usage: node start-session.js <userId> [port]');
  process.exit(1);
}

console.log(\`🚀 Starting browser-use session for user: \${userId} on port: \${port}\`);

const isWindows = process.platform === 'win32';
const pythonExe = isWindows
  ? path.join(__dirname, 'venv', 'Scripts', 'python.exe')
  : path.join(__dirname, 'venv', 'bin', 'python');

const browserUse = spawn(pythonExe, [
  'webui.py',
  '--ip', '127.0.0.1',
  '--port', port.toString(),
  '--user-session', userId
], {
  stdio: 'inherit',
  cwd: __dirname
});

browserUse.on('close', (code) => {
  console.log(\`🔒 Browser-use session \${userId} closed with code: \${code}\`);
});

process.on('SIGINT', () => {
  console.log('\\n🛑 Stopping browser-use session...');
  browserUse.kill('SIGTERM');
});
`;

try {
  fs.writeFileSync(startScriptPath, startScriptContent);
  console.log("✅ Script de inicialização criado!");
} catch (error) {
  console.error("❌ Erro ao criar script:", error.message);
}

// 9. Criar pasta de sessões
const sessionsDir = path.join(browserUseDir, "sessions");
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir);
  console.log("✅ Pasta de sessões criada!");
}

// 10. Resumo final
console.log("\n🎉 Setup do Browser-use Server concluído!\n");
console.log("📋 Próximos passos:");
console.log(`1. 📝 Edite o arquivo .env: ${envPath}`);
console.log("2. 🔑 Adicione suas API keys (OpenAI, Anthropic, etc.)");
console.log("3. 🚀 Teste a API /api/browser-use na sua aplicação");
console.log("4. 🎭 Cada usuário terá sua própria sessão isolada!");
console.log("\n💡 Comandos úteis:");
console.log(`   cd ${browserUseDir}`);
console.log(
  `   ${pythonExe} webui.py --ip 127.0.0.1 --port 8000 --user-session test_user`,
);
console.log("\n✨ Browser-use Server está pronto para uso!");
