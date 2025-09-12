import express from "express";
import { chromium, Browser, BrowserContext, Page } from "playwright";

class SimpleDesktopAgent {
  private app: express.Application;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private server: any = null;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(express.json());

    // CORS
    this.app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization",
      );

      if (req.method === "OPTIONS") {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  private setupRoutes() {
    // Status
    this.app.get("/status", (_req, res) => {
      console.log("📊 Status solicitado");
      res.json({
        status: "online",
        agent: "desktop-standalone",
        timestamp: new Date().toISOString(),
        port: 8768,
        playwright: this.browser ? "initialized" : "not-initialized",
      });
    });

    // Comandos Playwright
    this.app.post("/playwright/:action", async (req, res) => {
      try {
        const { action } = req.params;
        const data = req.body;

        console.log(`🎭 Executando: ${action}`, data);

        if (!this.page) {
          return res.status(500).json({
            success: false,
            error: "Navegador não inicializado",
          });
        }

        let result;
        switch (action) {
          case "navigate":
            // Verificar e reabrir navegador se necessário
            const navReady = await this.ensureBrowserReady();
            if (!navReady) {
              throw new Error("Falha ao inicializar/reabrir navegador");
            }

            console.log(`🌐 Navegando para: ${data.url}`);
            await this.page!.goto(data.url);
            console.log(`✅ Navegação concluída para: ${data.url}`);
            result = { success: true, url: data.url };
            break;

          case "click":
            const clickReady = await this.ensureBrowserReady();
            if (!clickReady) throw new Error("Navegador não disponível");

            const clickSelector = await this.findBestSelector(
              data.intent || "clickable",
              data.selector,
            );
            await this.page!.click(clickSelector);
            result = {
              success: true,
              selector: clickSelector,
              original: data.selector,
            };
            break;

          case "type":
            const typeReady = await this.ensureBrowserReady();
            if (!typeReady) throw new Error("Navegador não disponível");

            const typeSelector = await this.findBestSelector(
              "input",
              data.selector,
            );
            await this.page!.fill(typeSelector, ""); // Limpar primeiro
            await this.page!.type(typeSelector, data.text);
            result = {
              success: true,
              text: data.text,
              selector: typeSelector,
              original: data.selector,
            };
            break;

          case "get_title":
            const titleReady = await this.ensureBrowserReady();
            if (!titleReady) throw new Error("Navegador não disponível");

            const title = await this.page!.title();
            result = { title };
            break;

          case "get_url":
            const urlReady = await this.ensureBrowserReady();
            if (!urlReady) throw new Error("Navegador não disponível");

            const url = this.page!.url();
            result = { url };
            break;

          case "screenshot":
            const screenshotReady = await this.ensureBrowserReady();
            if (!screenshotReady) throw new Error("Navegador não disponível");

            await this.page!.screenshot({
              path: "screenshot.png",
            });
            result = { success: true, path: "screenshot.png" };
            break;

          case "analyze":
            const analyzeReady = await this.ensureBrowserReady();
            if (!analyzeReady) throw new Error("Navegador não disponível");

            // Nova funcionalidade: analisar estrutura da página
            const pageAnalysis = await this.page!.evaluate(() => {
              const inputs = Array.from(
                document.querySelectorAll("input, textarea"),
              ).map((el) => ({
                tag: el.tagName.toLowerCase(),
                type: el.getAttribute("type"),
                name: el.getAttribute("name"),
                placeholder: el.getAttribute("placeholder"),
                ariaLabel: el.getAttribute("aria-label"),
              }));

              const buttons = Array.from(
                document.querySelectorAll('button, a, [role="button"]'),
              ).map((el) => ({
                tag: el.tagName.toLowerCase(),
                text: el.textContent?.trim().substring(0, 50),
                href: el.getAttribute("href"),
                role: el.getAttribute("role"),
              }));

              return {
                title: document.title,
                url: window.location.href,
                inputs: inputs.slice(0, 10), // Limitar a 10
                buttons: buttons.slice(0, 10),
              };
            });
            result = { analysis: pageAnalysis };
            break;

          default:
            return res.status(400).json({
              success: false,
              error: `Ação não reconhecida: ${action}`,
            });
        }

        res.json({
          success: true,
          result: result,
        });
      } catch (error) {
        console.error("❌ Erro:", error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }

  // 🔄 FUNÇÃO DE RECUPERAÇÃO: Garante que o navegador está aberto e funcionando
  async ensureBrowserReady(): Promise<boolean> {
    try {
      // Verificar se browser e page existem
      if (!this.browser || !this.page) {
        console.log("🔄 Navegador não inicializado, abrindo...");
        return await this.initializeBrowser();
      }

      // Verificar se o navegador ainda está conectado
      try {
        await this.page.evaluate(() => document.title);
        console.log("✅ Navegador já está aberto e funcionando");
        return true;
      } catch (_error) {
        console.log("⚠️ Navegador foi fechado pelo usuário, reabrindo...");

        // Limpar referências antigas
        this.page = null;
        this.context = null;
        this.browser = null;

        // Reabrir navegador
        return await this.initializeBrowser();
      }
    } catch (error) {
      console.error("❌ Erro ao verificar/reabrir navegador:", error);
      return false;
    }
  }

  // 🧠 FUNÇÃO INTELIGENTE: Analisa a página e encontra o melhor seletor
  async findBestSelector(
    intent: string,
    fallbackSelector: string,
  ): Promise<string> {
    try {
      console.log(`🔍 Analisando página para encontrar elemento: ${intent}`);

      // Analisar estrutura da página
      const analysis = await this.page!.evaluate((intentType) => {
        const elements: Array<{
          selector: string;
          score: number;
          text: string;
          type: string;
        }> = [];

        if (intentType === "input" || intentType === "search") {
          // Procurar campos de input/textarea
          const inputs = document.querySelectorAll("input, textarea");
          inputs.forEach((el, index) => {
            const element = el as HTMLElement;
            let score = 0;
            const type = element.tagName.toLowerCase();

            // Pontuação baseada em atributos
            if (element.getAttribute("name")?.includes("q")) score += 50;
            if (element.getAttribute("name")?.includes("search")) score += 40;
            if (
              element
                .getAttribute("placeholder")
                ?.toLowerCase()
                .includes("pesquis")
            )
              score += 30;
            if (
              element
                .getAttribute("placeholder")
                ?.toLowerCase()
                .includes("search")
            )
              score += 30;
            if (
              element
                .getAttribute("aria-label")
                ?.toLowerCase()
                .includes("pesquis")
            )
              score += 25;
            if (
              element
                .getAttribute("aria-label")
                ?.toLowerCase()
                .includes("search")
            )
              score += 25;
            if (
              element.getAttribute("title")?.toLowerCase().includes("pesquis")
            )
              score += 20;
            if (element.getAttribute("type") === "search") score += 35;
            if (element.getAttribute("role") === "searchbox") score += 40;

            // Pontuação por posição (elementos mais visíveis)
            const rect = element.getBoundingClientRect();
            if (rect.width > 200) score += 10;
            if (rect.top < 300) score += 15; // Elementos no topo da página

            // Criar seletor único
            let selector = type;
            if (element.id) selector = `#${element.id}`;
            else if (element.getAttribute("name"))
              selector = `${type}[name="${element.getAttribute("name")}"]`;
            else if (element.className)
              selector = `${type}.${element.className.split(" ")[0]}`;
            else selector = `${type}:nth-of-type(${index + 1})`;

            elements.push({
              selector,
              score,
              text:
                element.getAttribute("placeholder") ||
                element.getAttribute("aria-label") ||
                "",
              type,
            });
          });
        } else if (intentType === "clickable" || intentType === "button") {
          // Procurar elementos clicáveis
          const clickables = document.querySelectorAll(
            'button, a, input[type="submit"], input[type="button"], [role="button"]',
          );
          clickables.forEach((el, index) => {
            const element = el as HTMLElement;
            let score = 0;
            const type = element.tagName.toLowerCase();

            // Pontuação baseada no texto/função
            const text = element.textContent?.toLowerCase() || "";
            if (text.includes("pesquisar") || text.includes("search"))
              score += 40;
            if (text.includes("buscar")) score += 35;
            if (text.includes("enviar") || text.includes("submit")) score += 30;

            // Pontuação por visibilidade
            const rect = element.getBoundingClientRect();
            if (rect.width > 50 && rect.height > 20) score += 10;

            let selector = type;
            if (element.id) selector = `#${element.id}`;
            else if (element.className)
              selector = `${type}.${element.className.split(" ")[0]}`;
            else selector = `${type}:nth-of-type(${index + 1})`;

            elements.push({
              selector,
              score,
              text: element.textContent || "",
              type,
            });
          });
        }

        // Ordenar por pontuação (maior primeiro)
        elements.sort((a, b) => b.score - a.score);
        return elements;
      }, intent);

      if (analysis.length > 0) {
        const best = analysis[0];
        console.log(
          `✅ Melhor elemento encontrado: ${best.selector} (score: ${best.score})`,
        );
        console.log(`📝 Texto/Placeholder: "${best.text}"`);

        // Verificar se o elemento existe e está visível
        try {
          await this.page!.waitForSelector(best.selector, {
            timeout: 3000,
            state: "visible",
          });
          return best.selector;
        } catch {
          console.log(`⚠️ Elemento não visível, tentando alternativas...`);

          // Tentar próximos elementos
          for (let i = 1; i < Math.min(3, analysis.length); i++) {
            try {
              await this.page!.waitForSelector(analysis[i].selector, {
                timeout: 1000,
                state: "visible",
              });
              console.log(`✅ Usando alternativa: ${analysis[i].selector}`);
              return analysis[i].selector;
            } catch {
              continue;
            }
          }
        }
      }

      console.log(
        `⚠️ Análise não encontrou elementos, usando fallback: ${fallbackSelector}`,
      );
      return fallbackSelector;
    } catch (error) {
      console.log(`❌ Erro na análise, usando fallback: ${error}`);
      return fallbackSelector;
    }
  }

  async initializeBrowser() {
    try {
      console.log("🌐 Abrindo navegador...");

      this.browser = await chromium.launch({
        headless: false,
        channel: "chrome",
        args: ["--start-maximized"],
      });

      this.context = await this.browser.newContext();
      this.page = await this.context.newPage();

      console.log("✅ Navegador inicializado e pronto!");
      return true;
    } catch (error) {
      console.error("❌ Erro ao inicializar navegador:", error);
      return false;
    }
  }

  async start() {
    try {
      console.log("🚀 Simple Desktop Agent - Iniciando...");

      // Inicializar navegador
      const browserOk = await this.initializeBrowser();
      if (!browserOk) {
        console.log("⚠️ Continuando sem navegador...");
      }

      // Iniciar servidor HTTP
      this.server = this.app.listen(8768, () => {
        console.log("✅ Servidor HTTP rodando na porta 8768");
        console.log("🔗 Status: http://localhost:8768/status");
        console.log("🎭 Navegador:", browserOk ? "Aberto" : "Erro");
        console.log("");
        console.log("⚠️ Para parar, pressione Ctrl+C");
      });
    } catch (error) {
      console.error("❌ Erro fatal:", error);
      process.exit(1);
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
    if (this.server) {
      this.server.close();
    }
  }
}

// Inicializar
const agent = new SimpleDesktopAgent();

process.on("SIGINT", async () => {
  console.log("\n🛑 Parando Desktop Agent...");
  await agent.close();
  process.exit(0);
});

agent.start();
