import { PlaywrightDesktopAgent } from "./playwright-agent";
import { WebSocketServer } from "./websocket-server";
import { HttpServer } from "./http-server";

class StandaloneDesktopAgent {
  public playwrightAgent: PlaywrightDesktopAgent;
  private wsServer: WebSocketServer;
  private httpServer: HttpServer;

  constructor() {
    this.playwrightAgent = new PlaywrightDesktopAgent();
    this.wsServer = new WebSocketServer(8767); // Porta alternativa
    this.httpServer = new HttpServer(8768); // Porta alternativa
  }

  async initialize() {
    console.log("🎭 Better Chatbot Desktop Agent - Standalone Mode");
    console.log("================================================");
    console.log("");

    try {
      // Inicializar serviços
      console.log("🎭 Inicializando Playwright...");
      try {
        await this.playwrightAgent.initialize();
        console.log("✅ Playwright inicializado com sucesso!");
      } catch (playwrightError) {
        console.error("❌ Erro no Playwright:", playwrightError);
        // Continuar mesmo com erro no Playwright
      }

      // Conectar Playwright Agent ao HTTP Server
      console.log("🔗 Conectando Playwright ao HTTP Server...");
      this.httpServer.setPlaywrightAgent(this.playwrightAgent);

      console.log("📡 Iniciando WebSocket Server...");
      try {
        await this.wsServer.start();
        console.log("✅ WebSocket Server iniciado!");
      } catch (wsError) {
        console.error("❌ Erro no WebSocket Server:", wsError);
        // Continuar mesmo com erro no WebSocket
      }

      console.log("🌐 Iniciando HTTP Server...");
      try {
        await this.httpServer.start();
        console.log("✅ HTTP Server iniciado com sucesso!");
      } catch (httpError) {
        console.error("❌ ERRO CRÍTICO no HTTP Server:", httpError);
        throw httpError; // Este erro é crítico
      }

      // Conectar serviços
      console.log("🔌 Conectando serviços...");
      this.connectServices();

      console.log("");
      console.log("🚀 Desktop Agent iniciado com sucesso!");
      console.log("📡 WebSocket Server: ws://localhost:8767");
      console.log("🌐 HTTP Server: http://localhost:8768");
      console.log("🔗 Status URL: http://localhost:8768/status");
      console.log("");
      console.log("✅ Teste a conexão: curl http://localhost:8768/status");
      console.log("🎭 O navegador Chrome foi aberto e está pronto!");
      console.log("");
      console.log("⚠️  Para parar, pressione Ctrl+C");
      console.log("");
    } catch (error) {
      console.error("❌ Erro ao inicializar Desktop Agent:", error);
      console.error("Stack trace:", error);
      process.exit(1);
    }
  }

  private connectServices() {
    // Conectar WebSocket com Playwright Agent
    this.wsServer.onMessage(async (message) => {
      return await this.handleWebSocketMessage(message);
    });

    // HTTP Server já tem suas próprias rotas configuradas
    // Não precisamos sobrescrever
  }

  private async handleWebSocketMessage(message: any) {
    try {
      const { action, data } = message;

      switch (action) {
        case "navigate":
          const result = await this.playwrightAgent.navigate(data.url);
          return { success: true, result };

        case "click":
          const clickResult = await this.playwrightAgent.click(data.selector);
          return { success: true, result: clickResult };

        case "type":
          const typeResult = await this.playwrightAgent.type(
            data.selector,
            data.text,
          );
          return { success: true, result: typeResult };

        case "screenshot":
          const screenshot = await this.playwrightAgent.screenshot();
          return { success: true, result: screenshot };

        default:
          return { success: false, error: "Ação não reconhecida" };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// Inicializar aplicação standalone
const agent = new StandaloneDesktopAgent();

// Handlers para shutdown graceful
process.on("SIGINT", async () => {
  console.log("\n🛑 Parando Desktop Agent...");
  await agent.playwrightAgent.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Parando Desktop Agent...");
  await agent.playwrightAgent.close();
  process.exit(0);
});

// Inicializar
agent.initialize().catch((error) => {
  console.error("❌ Falha fatal:", error);
  process.exit(1);
});
