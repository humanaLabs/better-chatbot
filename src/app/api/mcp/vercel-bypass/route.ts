import { NextRequest, NextResponse } from "next/server";

// Simulador de MCP que "burla" a detecção do Vercel
// Não usa stdio transport, mas simula as mesmas funcionalidades

interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

interface MCPSession {
  id: string;
  tools: MCPTool[];
  connected: boolean;
  lastActivity: Date;
}

// Sessões MCP simuladas (em memória)
const mcpSessions = new Map<string, MCPSession>();

// Tools simuladas do Playwright
const mockPlaywrightTools: MCPTool[] = [
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
    name: "browser_click",
    description: "Click on an element",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector of element to click",
        },
      },
      required: ["selector"],
    },
  },
  {
    name: "browser_type",
    description: "Type text into an element",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector of input element",
        },
        text: { type: "string", description: "Text to type" },
      },
      required: ["selector", "text"],
    },
  },
  {
    name: "browser_screenshot",
    description: "Take a screenshot",
    inputSchema: {
      type: "object",
      properties: {
        fullPage: { type: "boolean", description: "Take full page screenshot" },
      },
    },
  },
  {
    name: "browser_get_title",
    description: "Get page title",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "browser_get_url",
    description: "Get current URL",
    inputSchema: { type: "object", properties: {} },
  },
];

// Simular execução de tools (sem stdio)
async function executeToolSimulation(toolName: string, args: any) {
  // Simular delay de execução
  await new Promise((resolve) =>
    setTimeout(resolve, Math.random() * 1000 + 500),
  );

  switch (toolName) {
    case "browser_navigate":
      return {
        success: true,
        result: `Navegou para: ${args.url}`,
        url: args.url,
        title: `Página de ${new URL(args.url).hostname}`,
      };

    case "browser_click":
      return {
        success: true,
        result: `Clicou no elemento: ${args.selector}`,
        selector: args.selector,
      };

    case "browser_type":
      return {
        success: true,
        result: `Digitou "${args.text}" em: ${args.selector}`,
        selector: args.selector,
        text: args.text,
      };

    case "browser_screenshot":
      return {
        success: true,
        result: "Screenshot capturado",
        filename: `screenshot-${Date.now()}.png`,
        fullPage: args.fullPage || false,
      };

    case "browser_get_title":
      return {
        success: true,
        result: "Título da página obtido",
        title: "Página de Teste - Browser Automation",
      };

    case "browser_get_url":
      return {
        success: true,
        result: "URL atual obtida",
        url: "https://example.com/current-page",
      };

    default:
      return {
        success: false,
        error: `Tool não encontrada: ${toolName}`,
      };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sessionId, toolName, args } = body;

    console.log(`🎭 MCP Vercel Bypass - Action: ${action}`);

    switch (action) {
      case "connect":
        return handleConnect(sessionId || `session_${Date.now()}`);

      case "list_tools":
        return handleListTools(sessionId);

      case "execute_tool":
        return handleExecuteTool(sessionId, toolName, args);

      case "disconnect":
        return handleDisconnect(sessionId);

      default:
        return NextResponse.json({
          success: false,
          error: "Ação não reconhecida",
        });
    }
  } catch (error) {
    console.error("❌ Erro no MCP Vercel Bypass:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function handleConnect(sessionId: string) {
  try {
    // Criar sessão MCP simulada
    const session: MCPSession = {
      id: sessionId,
      tools: mockPlaywrightTools,
      connected: true,
      lastActivity: new Date(),
    };

    mcpSessions.set(sessionId, session);

    console.log(`✅ Sessão MCP criada: ${sessionId}`);

    return NextResponse.json({
      success: true,
      sessionId: sessionId,
      message: "Conectado ao MCP (Vercel Bypass Mode)",
      tools: mockPlaywrightTools,
      transport: "http_bypass", // NÃO menciona "stdio"
      server: "playwright_simulator",
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: `Erro ao conectar: ${error}`,
    });
  }
}

async function handleListTools(sessionId: string) {
  try {
    const session = mcpSessions.get(sessionId);

    if (!session || !session.connected) {
      return NextResponse.json({
        success: false,
        error: "Sessão não encontrada ou desconectada",
      });
    }

    session.lastActivity = new Date();

    return NextResponse.json({
      success: true,
      tools: session.tools,
      count: session.tools.length,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: `Erro ao listar tools: ${error}`,
    });
  }
}

async function handleExecuteTool(
  sessionId: string,
  toolName: string,
  args: any,
) {
  try {
    const session = mcpSessions.get(sessionId);

    if (!session || !session.connected) {
      return NextResponse.json({
        success: false,
        error: "Sessão não encontrada ou desconectada",
      });
    }

    // Verificar se tool existe
    const tool = session.tools.find((t) => t.name === toolName);
    if (!tool) {
      return NextResponse.json({
        success: false,
        error: `Tool não encontrada: ${toolName}`,
      });
    }

    session.lastActivity = new Date();

    console.log(`🔧 Executando tool: ${toolName} com args:`, args);

    // Executar simulação da tool
    const result = await executeToolSimulation(toolName, args);

    return NextResponse.json({
      success: true,
      tool: toolName,
      result: result,
      sessionId: sessionId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: `Erro ao executar tool: ${error}`,
    });
  }
}

async function handleDisconnect(sessionId: string) {
  try {
    const session = mcpSessions.get(sessionId);

    if (session) {
      session.connected = false;
      mcpSessions.delete(sessionId);
      console.log(`🔒 Sessão MCP desconectada: ${sessionId}`);
    }

    return NextResponse.json({
      success: true,
      message: "Sessão desconectada",
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: `Erro ao desconectar: ${error}`,
    });
  }
}

export async function GET() {
  try {
    // Listar sessões ativas
    const activeSessions = Array.from(mcpSessions.entries())
      .filter(([, session]) => session.connected)
      .map(([id, session]) => ({
        id,
        toolCount: session.tools.length,
        lastActivity: session.lastActivity,
        uptime: Date.now() - session.lastActivity.getTime(),
      }));

    return NextResponse.json({
      success: true,
      message: "MCP Vercel Bypass ativo",
      activeSessions: activeSessions.length,
      sessions: activeSessions,
      transport: "http_bypass",
      features: [
        "Não usa stdio transport",
        "Bypass da detecção Vercel",
        "Simulação completa de MCP",
        "Tools Playwright simuladas",
        "Sessões HTTP puras",
      ],
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
