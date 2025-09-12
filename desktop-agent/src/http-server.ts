import express from "express";
import { Server } from "http";

export class HttpServer {
  private app: express.Application;
  private server: Server | null = null;
  private requestHandlers: ((
    req: express.Request,
    res: express.Response,
  ) => Promise<void>)[] = [];
  private playwrightAgent: any = null;

  constructor(private port: number) {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  setPlaywrightAgent(agent: any) {
    this.playwrightAgent = agent;
  }

  private setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // CORS para permitir conexões do navegador
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
    // Rota de status
    this.app.get("/status", (req, res) => {
      console.log("📊 Status solicitado via HTTP");
      console.log(`📍 Request de: ${req.ip} para ${req.url}`);

      const statusData = {
        status: "online",
        agent: "desktop-standalone",
        timestamp: new Date().toISOString(),
        port: this.port,
        playwright: this.playwrightAgent ? "initialized" : "not-initialized",
      };

      console.log("📤 Enviando resposta:", statusData);
      res.json(statusData);
    });

    // Rota para comandos Playwright
    this.app.post("/playwright/:action", async (req, res) => {
      try {
        const { action } = req.params;
        const data = req.body;

        if (!this.playwrightAgent) {
          return res.status(500).json({
            success: false,
            error: "Playwright Agent não inicializado",
          });
        }

        console.log(`🎭 Executando ação: ${action} com dados:`, data);

        let result;
        switch (action) {
          case "navigate":
            result = await this.playwrightAgent.navigate(data.url);
            console.log("✅ Navigate result:", result);
            break;
          case "click":
            result = await this.playwrightAgent.click(data.selector);
            console.log("✅ Click result:", result);
            break;
          case "type":
            result = await this.playwrightAgent.type(data.selector, data.text);
            console.log("✅ Type result:", result);
            break;
          case "screenshot":
            result = await this.playwrightAgent.screenshot();
            console.log("✅ Screenshot result:", result);
            break;
          case "getTitle":
            result = { title: await this.playwrightAgent.getTitle() };
            console.log("✅ GetTitle result:", result);
            break;
          case "getUrl":
            result = { url: await this.playwrightAgent.getUrl() };
            console.log("✅ GetUrl result:", result);
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
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // Rota para MCP compatibility
    this.app.post("/mcp/execute", async (req, res) => {
      try {
        const { tool, arguments: args } = req.body;

        if (!this.playwrightAgent) {
          return res.status(500).json({
            success: false,
            error: "Playwright Agent não inicializado",
          });
        }

        const action = tool.replace("browser_", "");
        let result;

        switch (action) {
          case "navigate":
            result = await this.playwrightAgent.navigate(args.url);
            break;
          case "click":
            result = await this.playwrightAgent.click(args.selector);
            break;
          case "type":
            result = await this.playwrightAgent.type(args.selector, args.text);
            break;
          case "screenshot":
            result = await this.playwrightAgent.screenshot();
            break;
          case "get_title":
            result = { title: await this.playwrightAgent.getTitle() };
            break;
          case "get_url":
            result = { url: await this.playwrightAgent.getUrl() };
            break;
          default:
            return res.status(400).json({
              success: false,
              error: `Tool não reconhecida: ${tool}`,
            });
        }

        res.json({
          success: true,
          result: result,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // Rota para listar tools (MCP compatibility)
    this.app.get("/mcp/tools", (_req, res) => {
      res.json({
        tools: [
          "browser_navigate",
          "browser_click",
          "browser_type",
          "browser_screenshot",
          "browser_get_title",
          "browser_get_url",
        ],
      });
    });
  }

  async start() {
    return new Promise<void>((resolve, reject) => {
      // Tentar primeiro sem especificar host
      this.server = this.app.listen(this.port, () => {
        console.log(`🌐 HTTP Server rodando na porta ${this.port}`);
        console.log(`🔗 Teste 1: http://localhost:${this.port}/status`);
        console.log(`🔗 Teste 2: http://127.0.0.1:${this.port}/status`);
        console.log(`🔗 Teste 3: curl http://localhost:${this.port}/status`);
        resolve();
      });

      this.server.on("error", (error) => {
        console.error(`❌ Erro ao iniciar HTTP Server na porta ${this.port}:`);
        console.error(error);
        reject(error);
      });

      this.server.on("listening", () => {
        const addr = this.server?.address();
        console.log(`📡 Servidor escutando em:`, addr);
      });
    });
  }

  onRequest(
    handler: (req: express.Request, res: express.Response) => Promise<void>,
  ) {
    this.requestHandlers.push(handler);
  }

  close() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}
