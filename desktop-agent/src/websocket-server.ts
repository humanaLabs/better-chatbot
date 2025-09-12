import { WebSocketServer as WSServer, WebSocket } from "ws";

export class WebSocketServer {
  private wss: WSServer;
  private clients: Set<WebSocket> = new Set();
  private messageHandlers: ((message: any) => Promise<any>)[] = [];

  constructor(private port: number) {
    this.wss = new WSServer({ port });
  }

  async start() {
    return new Promise<void>((resolve) => {
      this.wss.on("connection", (ws) => {
        console.log("🔌 Nova conexão WebSocket");
        this.clients.add(ws);

        ws.on("message", async (data) => {
          try {
            const message = JSON.parse(data.toString());
            console.log("📨 Mensagem recebida:", message);

            // Processar com handlers
            for (const handler of this.messageHandlers) {
              const result = await handler(message);
              if (result) {
                ws.send(
                  JSON.stringify({
                    id: message.id,
                    result,
                  }),
                );
                break;
              }
            }
          } catch (error) {
            console.error("❌ Erro ao processar mensagem:", error);
            ws.send(
              JSON.stringify({
                id: undefined,
                error: error instanceof Error ? error.message : String(error),
              }),
            );
          }
        });

        ws.on("close", () => {
          console.log("🔌 Conexão WebSocket fechada");
          this.clients.delete(ws);
        });

        ws.on("error", (error) => {
          console.error("❌ Erro WebSocket:", error);
          this.clients.delete(ws);
        });
      });

      this.wss.on("listening", () => {
        console.log(`📡 WebSocket Server rodando na porta ${this.port}`);
        resolve();
      });
    });
  }

  onMessage(handler: (message: any) => Promise<any>) {
    this.messageHandlers.push(handler);
  }

  broadcast(message: any) {
    const data = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  close() {
    this.wss.close();
  }
}
