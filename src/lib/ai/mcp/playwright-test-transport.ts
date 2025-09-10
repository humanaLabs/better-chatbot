import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

/**
 * PlaywrightTestTransport - Simplified transport for testing Playwright MCP
 * Uses the test API endpoint to bypass server restrictions
 */
export class PlaywrightTestTransport implements Transport {
  private messageHandlers: Set<(message: JSONRPCMessage) => void> = new Set();
  private errorHandlers: Set<(error: Error) => void> = new Set();
  private closeHandlers: Set<() => void> = new Set();
  private isConnected = false;
  private eventSource?: EventSource;
  public sessionId: string;

  constructor(
    private webServerUrl: string,
    options: {
      sessionId?: string;
    } = {},
  ) {
    this.sessionId =
      options.sessionId ||
      `playwright-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async start(): Promise<void> {
    try {
      // Initialize connection via our test API
      const initResponse = await fetch("/api/playwright-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "init",
          sessionId: this.sessionId,
          webServerUrl: this.webServerUrl,
          clientInfo: {
            name: "playwright-test-client",
            version: "1.0.0",
          },
        }),
      });

      if (!initResponse.ok) {
        throw new Error(
          `Failed to initialize Playwright test connection: ${initResponse.statusText}`,
        );
      }

      this.isConnected = true;

      // Start listening for messages via Server-Sent Events from our test API
      this.startEventSourceListener();
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  private startEventSourceListener(): void {
    try {
      // Create EventSource connection for receiving messages via our test API
      const eventSourceUrl = new URL(
        "/api/playwright-test",
        window.location.origin,
      );
      eventSourceUrl.searchParams.set("sessionId", this.sessionId);

      this.eventSource = new EventSource(eventSourceUrl.toString());

      this.eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as JSONRPCMessage;
          this.handleMessage(message);
        } catch (error) {
          this.handleError(new Error(`Failed to parse message: ${error}`));
        }
      };

      this.eventSource.onerror = (error) => {
        this.handleError(new Error(`EventSource error: ${error}`));
      };

      this.eventSource.onopen = () => {
        console.log(
          `Playwright Test EventSource connected for session ${this.sessionId}`,
        );
      };
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this.isConnected) {
      throw new Error("PlaywrightTestTransport not connected");
    }

    try {
      const response = await fetch("/api/playwright-test", {
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
        throw new Error(
          `Failed to send message to Playwright test: ${response.statusText}`,
        );
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
      // Close EventSource connection
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = undefined;
      }

      // Notify test API about session closure
      await fetch("/api/playwright-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "close",
          sessionId: this.sessionId,
        }),
      });

      this.isConnected = false;
      this.notifyClose();
    } catch (error) {
      this.handleError(error as Error);
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
        this.handleError(error as Error);
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

  private notifyClose(): void {
    for (const handler of this.closeHandlers) {
      try {
        handler();
      } catch (error) {
        console.error("Error in close handler:", error);
      }
    }
  }
}
