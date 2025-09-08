import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

/**
 * CustomTransport for Vercel environment
 * Converts stdio-based MCP servers to HTTP-based communication
 */
export class CustomTransport implements Transport {
  private messageHandlers: Set<(message: JSONRPCMessage) => void> = new Set();
  private errorHandlers: Set<(error: Error) => void> = new Set();
  private closeHandlers: Set<() => void> = new Set();
  private isConnected = false;
  public sessionId: string;

  constructor(
    private command: string,
    private args: string[] = [],
    private env: Record<string, string> = {},
  ) {
    this.sessionId = `mcp-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async start(): Promise<void> {
    try {
      // For Vercel, we'll create a proxy endpoint that handles the stdio communication
      const response = await fetch("/api/mcp/proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "start",
          sessionId: this.sessionId,
          command: this.command,
          args: this.args,
          env: this.env,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start MCP proxy: ${response.statusText}`);
      }

      this.isConnected = true;

      // Start listening for messages from the proxy
      this.startMessageListener();
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  private async startMessageListener(): Promise<void> {
    try {
      const response = await fetch(
        `/api/mcp/proxy?sessionId=${this.sessionId}&action=listen`,
        {
          method: "GET",
          headers: {
            Accept: "text/event-stream",
            "Cache-Control": "no-cache",
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to start message listener: ${response.statusText}`,
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body reader available");
      }

      const decoder = new TextDecoder();

      while (this.isConnected) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = line.slice(6);
              if (data === "[DONE]") {
                this.handleClose();
                return;
              }

              const message = JSON.parse(data) as JSONRPCMessage;
              this.handleMessage(message);
            } catch (error) {
              console.error("Error parsing SSE message:", error);
            }
          }
        }
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this.isConnected) {
      throw new Error("Transport not connected");
    }

    try {
      const response = await fetch("/api/mcp/proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "send",
          sessionId: this.sessionId,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await fetch("/api/mcp/proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "close",
          sessionId: this.sessionId,
        }),
      });
    } catch (error) {
      console.error("Error closing transport:", error);
    } finally {
      this.isConnected = false;
      this.handleClose();
    }
  }

  onMessage(handler: (message: JSONRPCMessage) => void): void {
    this.messageHandlers.add(handler);
  }

  onError(handler: (error: Error) => void): void {
    this.errorHandlers.add(handler);
  }

  onClose(handler: () => void): void {
    this.closeHandlers.add(handler);
  }

  private handleMessage(message: JSONRPCMessage): void {
    for (const handler of this.messageHandlers) {
      try {
        handler(message);
      } catch (error) {
        console.error("Error in message handler:", error);
      }
    }
  }

  private handleError(error: Error): void {
    for (const handler of this.errorHandlers) {
      try {
        handler(error);
      } catch (handlerError) {
        console.error("Error in error handler:", handlerError);
      }
    }
  }

  private handleClose(): void {
    this.isConnected = false;
    for (const handler of this.closeHandlers) {
      try {
        handler();
      } catch (error) {
        console.error("Error in close handler:", error);
      }
    }
  }
}
