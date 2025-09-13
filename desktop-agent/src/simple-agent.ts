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

          case "back":
            const backReady = await this.ensureBrowserReady();
            if (!backReady) throw new Error("Navegador não disponível");

            console.log("⬅️ Voltando para página anterior...");
            await this.page!.goBack();
            console.log("✅ Voltou para página anterior");
            result = { success: true, url: this.page!.url() };
            break;

          case "forward":
            const forwardReady = await this.ensureBrowserReady();
            if (!forwardReady) throw new Error("Navegador não disponível");

            console.log("➡️ Avançando para próxima página...");
            await this.page!.goForward();
            console.log("✅ Avançou para próxima página");
            result = { success: true, url: this.page!.url() };
            break;

          case "refresh":
            const refreshReady = await this.ensureBrowserReady();
            if (!refreshReady) throw new Error("Navegador não disponível");

            console.log("🔄 Recarregando página...");
            await this.page!.reload();
            console.log("✅ Página recarregada");
            result = { success: true, url: this.page!.url() };
            break;

          case "click":
            const clickReady = await this.ensureBrowserReady();
            if (!clickReady) throw new Error("Navegador não disponível");

            console.log(`🖱️ Comando de clique recebido:`, data);
            console.log(`🎯 Seletor original: ${data.selector}`);
            console.log(`🧠 Intent: ${data.intent || "clickable"}`);

            // Se o seletor já é um seletor CSS válido (contém . # [ ou :), usar diretamente
            let clickSelector = data.selector;
            if (!data.selector.match(/[.#\[\]:]/)) {
              // Se é apenas texto, usar findBestSelector
              clickSelector = await this.findBestSelector(
                data.intent || "clickable",
                data.selector,
              );
            } else {
              console.log(`🎯 Usando seletor CSS direto: ${data.selector}`);
            }

            console.log(`✅ Seletor final escolhido: ${clickSelector}`);

            // Verificar se o elemento existe antes de clicar
            try {
              await this.page!.waitForSelector(clickSelector, {
                timeout: 5000,
                state: "visible",
              });
              console.log(`✅ Elemento encontrado e visível: ${clickSelector}`);

              // Destacar elemento antes de clicar (para debug visual)
              await this.page!.evaluate((sel) => {
                const element = document.querySelector(sel);
                if (element) {
                  (element as HTMLElement).style.outline = "3px solid red";
                  (element as HTMLElement).style.backgroundColor = "yellow";
                  setTimeout(() => {
                    (element as HTMLElement).style.outline = "";
                    (element as HTMLElement).style.backgroundColor = "";
                  }, 3000);
                }
              }, clickSelector);

              await this.page!.click(clickSelector);
              console.log(
                `✅ Clique executado com sucesso em: ${clickSelector}`,
              );
            } catch (error) {
              console.error(`❌ Erro ao clicar em ${clickSelector}:`, error);
              throw new Error(
                `Elemento não encontrado ou não clicável: ${clickSelector}`,
              );
            }

            result = {
              success: true,
              selector: clickSelector,
              original: data.selector,
              message: `Clique executado em: ${clickSelector}`,
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

            // Capturar screenshot como buffer e converter para base64
            const screenshotBuffer = await this.page!.screenshot({
              type: "png",
              fullPage: false, // Apenas viewport visível
            });
            const base64Screenshot = screenshotBuffer.toString("base64");

            result = {
              success: true,
              screenshot: base64Screenshot,
              filename: `screenshot-${new Date().toISOString().replace(/[:.]/g, "-")}.png`,
              timestamp: new Date().toISOString(),
            };
            break;

          case "analyze":
            const analyzeReady = await this.ensureBrowserReady();
            if (!analyzeReady) throw new Error("Navegador não disponível");

            // Análise completa da página para seleção inteligente
            const pageAnalysis = await this.page!.evaluate(() => {
              // Função para gerar seletor único e confiável
              const generateSelector = (element: Element): string => {
                const selectors: string[] = [];

                // ID único (prioridade máxima)
                if (element.id) {
                  selectors.push(`#${element.id}`);
                }

                // Nome específico
                const name = element.getAttribute("name");
                if (name) {
                  selectors.push(`[name="${name}"]`);
                }

                // Tipo específico
                const type = element.getAttribute("type");
                if (type) {
                  selectors.push(
                    `${element.tagName.toLowerCase()}[type="${type}"]`,
                  );
                }

                // Aria-label
                const ariaLabel = element.getAttribute("aria-label");
                if (ariaLabel) {
                  selectors.push(`[aria-label="${ariaLabel}"]`);
                }

                // Classes úteis (filtrar classes comuns)
                if (element.className) {
                  const classes = element.className
                    .split(" ")
                    .filter(
                      (c) =>
                        c.length > 0 &&
                        !c.match(/^(btn|button|form|input|field)$/),
                    )
                    .slice(0, 2); // Máximo 2 classes
                  if (classes.length > 0) {
                    selectors.push(`.${classes.join(".")}`);
                  }
                }

                // Fallback: tag + posição
                if (selectors.length === 0) {
                  const siblings = Array.from(
                    element.parentElement?.children || [],
                  ).filter((el) => el.tagName === element.tagName);
                  const index = siblings.indexOf(element);
                  selectors.push(
                    `${element.tagName.toLowerCase()}:nth-of-type(${index + 1})`,
                  );
                }

                return selectors[0] || element.tagName.toLowerCase(); // Usar o melhor seletor
              };

              // Analisar inputs com detalhes
              const inputs = Array.from(
                document.querySelectorAll("input, textarea, select"),
              )
                .filter((el) => (el as HTMLElement).offsetParent !== null) // Apenas visíveis
                .map((el) => ({
                  tag: el.tagName.toLowerCase(),
                  type: el.getAttribute("type") || "text",
                  name: el.getAttribute("name") || "",
                  placeholder: el.getAttribute("placeholder") || "",
                  id: el.id || "",
                  ariaLabel: el.getAttribute("aria-label") || "",
                  value: (el as HTMLInputElement).value || "",
                  selector: generateSelector(el),
                  text: el.textContent?.trim() || "",
                  required: el.hasAttribute("required"),
                }));

              // Analisar botões e elementos clicáveis
              const buttons = Array.from(
                document.querySelectorAll(
                  'button, input[type="submit"], input[type="button"], a[href], [role="button"], [onclick]',
                ),
              )
                .filter((el) => (el as HTMLElement).offsetParent !== null) // Apenas visíveis
                .map((el) => ({
                  tag: el.tagName.toLowerCase(),
                  text: el.textContent?.trim() || "",
                  type: el.getAttribute("type") || "button",
                  id: el.id || "",
                  href: el.getAttribute("href") || "",
                  role: el.getAttribute("role") || "",
                  ariaLabel: el.getAttribute("aria-label") || "",
                  selector: generateSelector(el),
                  value: (el as HTMLInputElement).value || "",
                  className: el.className || "",
                }));

              return {
                title: document.title,
                url: window.location.href,
                inputs: inputs.slice(0, 15), // Aumentar limite
                buttons: buttons.slice(0, 15),
                bodyText: document.body.textContent?.slice(0, 500) || "", // Contexto da página
              };
            });
            console.log("📊 Análise da página concluída:");
            console.log(`  - URL: ${pageAnalysis.url}`);
            console.log(`  - Título: ${pageAnalysis.title}`);
            console.log(
              `  - Inputs encontrados: ${pageAnalysis.inputs.length}`,
            );
            console.log(
              `  - Botões encontrados: ${pageAnalysis.buttons.length}`,
            );
            console.log("🔘 Lista de botões:");
            pageAnalysis.buttons.forEach((btn, i) => {
              console.log(
                `  ${i + 1}. "${btn.text}" (${btn.tag}) - Seletor: ${btn.selector}`,
              );
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
        } else if (
          intentType === "submit" ||
          intentType === "search-button" ||
          intentType === "buscar"
        ) {
          // Procurar especificamente botões de busca/submit do Google
          const searchButtons = document.querySelectorAll(
            'input[name="btnK"], input[name="btnI"], .gNO89b, .RNmpXc, input[type="submit"], button[type="submit"]',
          );
          searchButtons.forEach((el, index) => {
            const element = el as HTMLElement;
            const text =
              element.textContent?.trim() ||
              element.getAttribute("value") ||
              "";
            let score = 80; // Score alto para botões de busca

            // Score extra para botões específicos do Google
            if (element.getAttribute("name") === "btnK") score = 95; // "Pesquisa Google"
            if (element.getAttribute("name") === "btnI") score = 90; // "Estou com sorte"
            if (element.classList.contains("gNO89b")) score = 95;

            // Gerar seletor único
            let selector = element.tagName.toLowerCase();
            if (element.id) selector = `#${element.id}`;
            else if (element.getAttribute("name"))
              selector = `[name="${element.getAttribute("name")}"]`;
            else if (element.className)
              selector = `${element.tagName.toLowerCase()}.${element.className.split(" ")[0]}`;
            else
              selector = `${element.tagName.toLowerCase()}:nth-of-type(${index + 1})`;

            elements.push({
              selector: selector,
              score: score,
              text: text,
              type: "search-button",
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
