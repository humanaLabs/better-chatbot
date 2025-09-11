const express = require("express");
const cors = require("cors");
const { chromium } = require("playwright");
// const { v4: uuidv4 } = require("uuid"); // Não utilizado

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Estado do browser
let browser = null;
let page = null;
let context = null;

// Ferramentas disponíveis
const AVAILABLE_TOOLS = [
  "browser_navigate",
  "browser_click",
  "browser_type",
  "browser_screenshot",
  "browser_get_title",
  "browser_get_url",
  "browser_wait",
  "browser_close",
];

// Inicializar browser
async function initBrowser() {
  try {
    if (!browser) {
      console.log("🚀 Inicializando Playwright browser...");
      browser = await chromium.launch({
        headless: false, // Visível para debug
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
      });
      page = await context.newPage();
      console.log("✅ Browser Playwright inicializado!");
    }
    return { success: true };
  } catch (error) {
    console.error("❌ Erro ao inicializar browser:", error);
    return { success: false, error: error.message };
  }
}

// Fechar browser
async function closeBrowser() {
  try {
    if (browser) {
      await browser.close();
      browser = null;
      page = null;
      context = null;
      console.log("🔒 Browser fechado");
    }
    return { success: true };
  } catch (error) {
    console.error("❌ Erro ao fechar browser:", error);
    return { success: false, error: error.message };
  }
}

// Implementação das ferramentas
const tools = {
  browser_navigate: async (args) => {
    try {
      await initBrowser();
      const { url } = args;
      console.log(`🌐 Navegando para: ${url}`);

      await page.goto(url, { waitUntil: "networkidle" });
      const title = await page.title();

      return {
        success: true,
        message: `Navegou para: ${url}`,
        url: url,
        title: title,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  browser_click: async (args) => {
    try {
      if (!page) throw new Error("Browser não inicializado");

      const { selector } = args;
      console.log(`🖱️ Clicando em: ${selector}`);

      // Aguardar elemento aparecer
      await page.waitForSelector(selector, { timeout: 5000 });
      await page.click(selector);

      return {
        success: true,
        message: `Clicou em: ${selector}`,
        selector: selector,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  browser_type: async (args) => {
    try {
      if (!page) throw new Error("Browser não inicializado");

      const { selector, text } = args;
      console.log(`⌨️ Digitando "${text}" em: ${selector}`);

      // Aguardar elemento aparecer
      await page.waitForSelector(selector, { timeout: 5000 });

      // Limpar campo e digitar
      await page.fill(selector, "");
      await page.type(selector, text, { delay: 100 });

      return {
        success: true,
        message: `Digitou "${text}" em: ${selector}`,
        selector: selector,
        text: text,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  browser_screenshot: async (args) => {
    try {
      if (!page) throw new Error("Browser não inicializado");

      console.log("📸 Capturando screenshot...");

      const screenshot = await page.screenshot({
        fullPage: args.fullPage || false,
        type: "png",
      });

      // Salvar screenshot
      const filename = `screenshot-${Date.now()}.png`;
      const fs = require("fs");
      fs.writeFileSync(`./screenshots/${filename}`, screenshot);

      return {
        success: true,
        message: "Screenshot capturado",
        filename: filename,
        path: `./screenshots/${filename}`,
        size: screenshot.length,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  browser_get_title: async (_args) => {
    try {
      if (!page) throw new Error("Browser não inicializado");

      const title = await page.title();
      console.log(`📄 Título: ${title}`);

      return {
        success: true,
        title: title,
        message: "Título obtido com sucesso",
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  browser_get_url: async (_args) => {
    try {
      if (!page) throw new Error("Browser não inicializado");

      const url = page.url();
      console.log(`🔗 URL: ${url}`);

      return {
        success: true,
        url: url,
        message: "URL obtida com sucesso",
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  browser_wait: async (args) => {
    try {
      if (!page) throw new Error("Browser não inicializado");

      const { timeout = 1000 } = args;
      console.log(`⏳ Aguardando ${timeout}ms...`);

      await page.waitForTimeout(timeout);

      return {
        success: true,
        message: `Aguardou ${timeout}ms`,
        timeout: timeout,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  browser_close: async (_args) => {
    return await closeBrowser();
  },
};

// Rotas da API

// Listar ferramentas disponíveis
app.get("/mcp/tools", (_req, res) => {
  res.json({
    success: true,
    tools: AVAILABLE_TOOLS,
    message: "Servidor MCP Playwright Real ativo",
  });
});

// Executar ferramenta
app.post("/mcp/execute", async (req, res) => {
  try {
    const { tool, arguments: args } = req.body;

    console.log(`🎭 Executando: ${tool} com args:`, args);

    if (!tools[tool]) {
      return res.status(400).json({
        success: false,
        error: `Ferramenta não encontrada: ${tool}`,
      });
    }

    const result = await tools[tool](args || {});

    res.json({
      success: true,
      tool: tool,
      result: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Erro na execução:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Status do servidor
app.get("/mcp/status", (_req, res) => {
  res.json({
    success: true,
    status: "running",
    browser_active: !!browser,
    page_active: !!page,
    tools: AVAILABLE_TOOLS.length,
    uptime: process.uptime(),
  });
});

// Inicializar servidor
app.listen(PORT, async () => {
  console.log(`🎭 Servidor MCP Playwright Real rodando na porta ${PORT}`);
  console.log(`📡 API disponível em: http://localhost:${PORT}`);
  console.log(`🔧 Tools: ${AVAILABLE_TOOLS.join(", ")}`);

  // Criar pasta screenshots
  const fs = require("fs");
  if (!fs.existsSync("./screenshots")) {
    fs.mkdirSync("./screenshots");
  }

  console.log("✅ Servidor pronto para receber comandos!");
});

// Cleanup ao fechar
process.on("SIGINT", async () => {
  console.log("\n🔒 Fechando servidor...");
  await closeBrowser();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🔒 Fechando servidor...");
  await closeBrowser();
  process.exit(0);
});
