import { NextRequest, NextResponse } from "next/server";
import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

// Store active Playwright MCP sessions
const activeSessions = new Map<
  string,
  {
    webServerUrl: string;
    clients: Set<ReadableStreamDefaultController>;
    messageQueue: JSONRPCMessage[];
  }
>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sessionId, webServerUrl, message, clientInfo } = body;

    switch (action) {
      case "init":
        return handleInit(sessionId, webServerUrl, clientInfo);
      case "send":
        return handleSend(sessionId, message);
      case "close":
        return handleClose(sessionId);
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Playwright MCP Proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "Session ID required" }, { status: 400 });
  }

  const session = activeSessions.get(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Create Server-Sent Events stream
  const stream = new ReadableStream({
    start(controller) {
      session.clients.add(controller);

      // Send any queued messages
      for (const message of session.messageQueue) {
        controller.enqueue(`data: ${JSON.stringify(message)}\n\n`);
      }
      session.messageQueue = [];

      // Keep connection alive
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(`: keepalive\n\n`);
        } catch {
          clearInterval(keepAlive);
        }
      }, 30000);

      // Cleanup on close
      const cleanup = () => {
        session.clients.delete(controller);
        clearInterval(keepAlive);
        if (session.clients.size === 0) {
          activeSessions.delete(sessionId);
        }
      };

      // Handle client disconnect
      request.signal.addEventListener("abort", cleanup);

      // Store cleanup function for cancel method
      (controller as any)._cleanup = cleanup;
    },
    cancel(controller) {
      // Use the stored cleanup function
      if ((controller as any)._cleanup) {
        (controller as any)._cleanup();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

async function handleInit(
  sessionId: string,
  webServerUrl: string,
  clientInfo: any,
): Promise<NextResponse> {
  try {
    // Initialize connection with the Playwright MCP webserver
    const response = await fetch(`${webServerUrl}/mcp/init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        clientInfo,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to initialize Playwright MCP: ${response.statusText}`,
      );
    }

    // Create session
    activeSessions.set(sessionId, {
      webServerUrl,
      clients: new Set(),
      messageQueue: [],
    });

    // Start listening for messages from the Playwright MCP server
    startListeningToPlaywrightMCP(sessionId, webServerUrl);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to initialize Playwright MCP session:", error);
    return NextResponse.json(
      { error: "Failed to initialize session" },
      { status: 500 },
    );
  }
}

async function handleSend(
  sessionId: string,
  message: JSONRPCMessage,
): Promise<NextResponse> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  try {
    // Forward message to Playwright MCP webserver
    const response = await fetch(`${session.webServerUrl}/mcp/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        message,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to send message to Playwright MCP: ${response.statusText}`,
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to send message to Playwright MCP:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    );
  }
}

async function handleClose(sessionId: string): Promise<NextResponse> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  try {
    // Notify Playwright MCP webserver about session closure
    await fetch(`${session.webServerUrl}/mcp/close`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
      }),
    });

    // Close all client connections
    for (const client of session.clients) {
      try {
        client.close();
      } catch (error) {
        console.error("Error closing client connection:", error);
      }
    }

    // Remove session
    activeSessions.delete(sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to close Playwright MCP session:", error);
    return NextResponse.json(
      { error: "Failed to close session" },
      { status: 500 },
    );
  }
}

async function startListeningToPlaywrightMCP(
  sessionId: string,
  webServerUrl: string,
): Promise<void> {
  try {
    // Connect to Playwright MCP server's event stream
    const eventSourceUrl = new URL(`${webServerUrl}/mcp/events`);
    eventSourceUrl.searchParams.set("sessionId", sessionId);

    const response = await fetch(eventSourceUrl.toString(), {
      headers: {
        Accept: "text/event-stream",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to connect to Playwright MCP events: ${response.statusText}`,
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body reader available");
    }

    const decoder = new TextDecoder();

    // Read messages from Playwright MCP server
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const messageData = line.slice(6); // Remove 'data: ' prefix
            const message = JSON.parse(messageData) as JSONRPCMessage;

            // Forward message to connected clients
            const session = activeSessions.get(sessionId);
            if (session) {
              const messageStr = `data: ${JSON.stringify(message)}\n\n`;

              for (const client of session.clients) {
                try {
                  client.enqueue(messageStr);
                } catch (error) {
                  console.error("Error sending message to client:", error);
                  session.clients.delete(client);
                }
              }

              // If no clients are connected, queue the message
              if (session.clients.size === 0) {
                session.messageQueue.push(message);
              }
            }
          } catch (error) {
            console.error("Error parsing message from Playwright MCP:", error);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error listening to Playwright MCP:", error);
    // Clean up session on error
    activeSessions.delete(sessionId);
  }
}
