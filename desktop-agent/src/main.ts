import { app, BrowserWindow, Tray, Menu, nativeImage } from "electron";
import { join } from "path";
import { PlaywrightDesktopAgent } from "./playwright-agent";
import { WebSocketServer } from "./websocket-server";
import { HttpServer } from "./http-server";
// import AutoLaunch from "auto-launch";

class DesktopAgent {
  private tray: Tray | null = null;
  private mainWindow: BrowserWindow | null = null;
  private playwrightAgent: PlaywrightDesktopAgent;
  private wsServer: WebSocketServer;
  private httpServer: HttpServer;
  // private autoLauncher: AutoLaunch;

  constructor() {
    this.playwrightAgent = new PlaywrightDesktopAgent();
    this.wsServer = new WebSocketServer(8765); // WebSocket na porta 8765
    this.httpServer = new HttpServer(8766); // HTTP na porta 8766

    // Auto-inicialização (desabilitado temporariamente)
    // this.autoLauncher = new AutoLaunch({
    //   name: "Better Chatbot Desktop Agent",
    //   path: process.execPath,
    // });
  }

  async initialize() {
    await app.whenReady();

    // Criar tray
    this.createTray();

    // Inicializar serviços
    await this.playwrightAgent.initialize();

    // Conectar Playwright Agent ao HTTP Server
    this.httpServer.setPlaywrightAgent(this.playwrightAgent);

    await this.wsServer.start();
    await this.httpServer.start();

    // Conectar serviços
    this.connectServices();

    console.log("🚀 Desktop Agent iniciado!");
    console.log("📡 WebSocket Server: ws://localhost:8765");
    console.log("🌐 HTTP Server: http://localhost:8766");
  }

  private createTray() {
    // Ícone do tray (você precisa criar este arquivo)
    const icon = nativeImage.createFromPath(
      join(__dirname, "../assets/tray-icon.png"),
    );
    this.tray = new Tray(icon.resize({ width: 16, height: 16 }));

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "🎭 Better Chatbot Desktop Agent",
        type: "normal",
        enabled: false,
      },
      { type: "separator" },
      {
        label: "📊 Status",
        click: () => this.showStatusWindow(),
      },
      {
        label: "🔧 Configurações",
        click: () => this.showConfigWindow(),
      },
      { type: "separator" },
      {
        label: "🚀 Auto-inicializar",
        type: "checkbox",
        checked: false,
        click: async (menuItem) => {
          // Auto-launch temporariamente desabilitado
          console.log(
            "Auto-launch:",
            menuItem.checked ? "enabled" : "disabled",
          );
          // if (menuItem.checked) {
          //   await this.autoLauncher.enable();
          // } else {
          //   await this.autoLauncher.disable();
          // }
        },
      },
      { type: "separator" },
      {
        label: "❌ Sair",
        click: () => {
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
    this.tray.setToolTip("Better Chatbot Desktop Agent");
  }

  private showStatusWindow() {
    if (this.mainWindow) {
      this.mainWindow.focus();
      return;
    }

    this.mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
      icon: join(__dirname, "../assets/icon.png"),
      title: "Desktop Agent - Status",
    });

    // Carregar página de status (você pode criar um HTML simples)
    this.mainWindow.loadFile(join(__dirname, "../assets/status.html"));

    this.mainWindow.on("closed", () => {
      this.mainWindow = null;
    });
  }

  private showConfigWindow() {
    // Implementar janela de configurações
    console.log("🔧 Abrindo configurações...");
  }

  private connectServices() {
    // Conectar WebSocket com Playwright Agent
    this.wsServer.onMessage(async (message) => {
      return await this.handleWebSocketMessage(message);
    });

    // Conectar HTTP com Playwright Agent
    this.httpServer.onRequest(async (req, res) => {
      await this.handleHttpRequest(req, res);
    });
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

  private async handleHttpRequest(_req: any, res: any) {
    // Implementar API REST para compatibilidade
    res.json({
      status: "ok",
      agent: "desktop",
      playwright: await this.playwrightAgent.getStatus(),
    });
  }
}

// Inicializar aplicação
const agent = new DesktopAgent();

app.whenReady().then(() => {
  agent.initialize();
});

app.on("window-all-closed", (event: any) => {
  // Não sair quando todas as janelas fecharem (rodar em background)
  event.preventDefault();
});

app.on("activate", () => {
  // Reabrir janela no macOS
  if (BrowserWindow.getAllWindows().length === 0) {
    // agent.showStatusWindow();
  }
});
