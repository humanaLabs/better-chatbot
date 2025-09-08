import { NextRequest, NextResponse } from "next/server";
import { spawn, ChildProcess } from "child_process";
import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

// Store active sessions
const activeSessions = new Map<
  string,
  {
    process: ChildProcess;
    messageQueue: JSONRPCMessage[];
    clients: Set<ReadableStreamDefaultController>;
  }
>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sessionId, command, args, env, message } = body;

    switch (action) {
      case "start":
        return handleStart(sessionId, command, args, env);
      case "send":
        return handleSend(sessionId, message);
      case "close":
        return handleClose(sessionId);
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("MCP Proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  const action = url.searchParams.get("action");

  if (action === "listen" && sessionId) {
    return handleListen(sessionId);
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

function handleStart(
  sessionId: string,
  command: string,
  args: string[] = [],
  env: Record<string, string> = {},
) {
  try {
    // Spawn the process
    const childProcess = spawn(command, args, {
      env: { ...process.env, ...env },
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    });

    const session = {
      process: childProcess,
      messageQueue: [] as JSONRPCMessage[],
      clients: new Set<ReadableStreamDefaultController>(),
    };

    activeSessions.set(sessionId, session);

    // Handle process output
    childProcess.stdout?.on("data", (data) => {
      try {
        const lines = data
          .toString()
          .split("\n")
          .filter((line: string) => line.trim());
        for (const line of lines) {
          try {
            const message = JSON.parse(line) as JSONRPCMessage;
            session.messageQueue.push(message);

            // Send to all listening clients
            for (const controller of session.clients) {
              try {
                controller.enqueue(`data: ${JSON.stringify(message)}\n\n`);
              } catch (error) {
                console.error("Error sending message to client:", error);
                session.clients.delete(controller);
              }
            }
          } catch (parseError) {
            console.error(
              "Error parsing JSON from process output:",
              parseError,
            );
          }
        }
      } catch (error) {
        console.error("Error processing stdout data:", error);
      }
    });

    childProcess.stderr?.on("data", (data) => {
      console.error(`MCP Process stderr (${sessionId}):`, data.toString());
    });

    childProcess.on("exit", (code) => {
      console.log(`MCP Process exited with code ${code} (${sessionId})`);

      // Notify all clients that the session ended
      for (const controller of session.clients) {
        try {
          controller.enqueue("data: [DONE]\n\n");
          controller.close();
        } catch (error) {
          console.error("Error closing client connection:", error);
        }
      }

      activeSessions.delete(sessionId);
    });

    childProcess.on("error", (error) => {
      console.error(`MCP Process error (${sessionId}):`, error);

      // Notify all clients of the error
      for (const controller of session.clients) {
        try {
          controller.error(error);
        } catch (controllerError) {
          console.error(
            "Error notifying client of process error:",
            controllerError,
          );
        }
      }

      activeSessions.delete(sessionId);
    });

    return NextResponse.json({ success: true, sessionId });
  } catch (error) {
    console.error("Error starting MCP process:", error);
    return NextResponse.json(
      { error: "Failed to start process" },
      { status: 500 },
    );
  }
}

function handleSend(sessionId: string, message: JSONRPCMessage) {
  const session = activeSessions.get(sessionId);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  try {
    const messageStr = JSON.stringify(message) + "\n";
    session.process.stdin?.write(messageStr);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending message to process:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    );
  }
}

function handleClose(sessionId: string) {
  const session = activeSessions.get(sessionId);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  try {
    session.process.kill();
    activeSessions.delete(sessionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error closing process:", error);
    return NextResponse.json(
      { error: "Failed to close process" },
      { status: 500 },
    );
  }
}

function handleListen(sessionId: string) {
  const session = activeSessions.get(sessionId);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const encoder = new TextEncoder();

  let streamController: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    start(controller) {
      streamController = controller;
      // Add this controller to the session's clients
      session.clients.add(controller);

      // Send any queued messages
      for (const message of session.messageQueue) {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(message)}\n\n`),
          );
        } catch (error) {
          console.error("Error sending queued message:", error);
        }
      }

      // Clear the queue after sending
      session.messageQueue.length = 0;
    },

    cancel() {
      // Remove this controller from the session's clients
      if (streamController) {
        session.clients.delete(streamController);
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
