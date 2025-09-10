import { NextRequest, NextResponse } from "next/server";
import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

// Store active test sessions (simplified for testing)
const testSessions = new Map<
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
        return handleTestInit(sessionId, webServerUrl, clientInfo);
      case "send":
        return handleTestSend(sessionId, message);
      case "close":
        return handleTestClose(sessionId);
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Playwright Test API error:", error);
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

  const session = testSessions.get(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Create Server-Sent Events stream for test
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
          testSessions.delete(sessionId);
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

async function handleTestInit(
  sessionId: string,
  webServerUrl: string,
  clientInfo: any,
): Promise<NextResponse> {
  try {
    console.log(`Initializing test session ${sessionId} for ${webServerUrl}`);

    // For testing, we'll simulate a successful connection
    // In a real scenario, you would connect to the actual Playwright MCP webserver

    // Create test session
    testSessions.set(sessionId, {
      webServerUrl,
      clients: new Set(),
      messageQueue: [],
    });

    // Simulate connection to Playwright MCP webserver
    try {
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

      if (response.ok) {
        console.log(
          `Successfully connected to Playwright MCP at ${webServerUrl}`,
        );
        startListeningToPlaywrightMCPTest(sessionId, webServerUrl);
      } else {
        console.warn(
          `Failed to connect to Playwright MCP: ${response.statusText}`,
        );
        // Continue anyway for testing purposes
      }
    } catch (error) {
      console.warn(`Could not reach Playwright MCP webserver: ${error}`);
      // Continue anyway for testing purposes - we'll simulate responses
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to initialize test session:", error);
    return NextResponse.json(
      { error: "Failed to initialize session" },
      { status: 500 },
    );
  }
}

async function handleTestSend(
  sessionId: string,
  message: JSONRPCMessage,
): Promise<NextResponse> {
  const session = testSessions.get(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  try {
    console.log(`Sending message to Playwright MCP:`, message);

    // Try to forward to actual Playwright MCP webserver
    try {
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
        console.warn(
          `Failed to send to Playwright MCP: ${response.statusText}`,
        );
      }
    } catch (error) {
      console.warn(`Could not reach Playwright MCP webserver: ${error}`);

      // For testing purposes, simulate some responses
      if ((message as any).method === "tools/list") {
        const mockResponse: JSONRPCMessage = {
          jsonrpc: "2.0",
          id: (message as any).id,
          result: {
            tools: [
              {
                name: "browser_navigate",
                description: "Navigate to a URL",
                inputSchema: {
                  type: "object",
                  properties: {
                    url: { type: "string", description: "URL to navigate to" },
                  },
                  required: ["url"],
                },
              },
              {
                name: "browser_screenshot",
                description: "Take a screenshot",
                inputSchema: {
                  type: "object",
                  properties: {
                    fullPage: {
                      type: "boolean",
                      description: "Take full page screenshot",
                    },
                  },
                },
              },
              {
                name: "browser_click",
                description: "Click on an element",
                inputSchema: {
                  type: "object",
                  properties: {
                    selector: { type: "string", description: "CSS selector" },
                  },
                  required: ["selector"],
                },
              },
            ],
          },
        };

        // Queue the mock response
        session.messageQueue.push(mockResponse);

        // Send to connected clients
        for (const client of session.clients) {
          try {
            client.enqueue(`data: ${JSON.stringify(mockResponse)}\n\n`);
          } catch (error) {
            console.error("Error sending mock response:", error);
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to send message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    );
  }
}

async function handleTestClose(sessionId: string): Promise<NextResponse> {
  const session = testSessions.get(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  try {
    // Try to notify Playwright MCP webserver
    try {
      await fetch(`${session.webServerUrl}/mcp/close`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
        }),
      });
    } catch (error) {
      console.warn(`Could not notify Playwright MCP about closure: ${error}`);
    }

    // Close all client connections
    for (const client of session.clients) {
      try {
        client.close();
      } catch (error) {
        console.error("Error closing client connection:", error);
      }
    }

    // Remove session
    testSessions.delete(sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to close test session:", error);
    return NextResponse.json(
      { error: "Failed to close session" },
      { status: 500 },
    );
  }
}

async function startListeningToPlaywrightMCPTest(
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
      console.warn(
        `Failed to connect to Playwright MCP events: ${response.statusText}`,
      );
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      console.warn("No response body reader available");
      return;
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
            const session = testSessions.get(sessionId);
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
    testSessions.delete(sessionId);
  }
}
