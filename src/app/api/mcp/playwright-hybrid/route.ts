import { NextRequest, NextResponse } from "next/server";

// Armazenar conexões MCP ativas (em produção, usar Redis ou DB)
const mcpConnections = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, serverUrl, toolName, args } = body;

    switch (action) {
      case "connect":
        return await handleConnect(serverUrl);

      case "execute":
        return await handleExecute(toolName, args);

      case "disconnect":
        return await handleDisconnect();

      default:
        return NextResponse.json(
          { success: false, error: "Ação não reconhecida" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Erro na API MCP Hybrid:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    );
  }
}

async function handleConnect(serverUrl: string) {
  try {
    console.log("Tentando conectar ao MCP Server:", serverUrl);

    // Tentar conectar via HTTP ao servidor MCP
    const response = await fetch(`${serverUrl}/mcp/tools`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      // Se não conseguir via HTTP, tentar mock para desenvolvimento
      console.log(
        "Servidor MCP não disponível, usando mock para desenvolvimento",
      );

      const mockTools = [
        "browser_navigate",
        "browser_click",
        "browser_type",
        "browser_screenshot",
        "browser_get_title",
        "browser_get_url",
      ];

      mcpConnections.set("default", {
        type: "mock",
        serverUrl,
        tools: mockTools,
        connected: true,
      });

      return NextResponse.json({
        success: true,
        tools: mockTools,
        message: "Conectado em modo mock (servidor MCP não disponível)",
      });
    }

    const data = await response.json();
    const tools = data.tools || [];

    // Armazenar conexão
    mcpConnections.set("default", {
      type: "http",
      serverUrl,
      tools,
      connected: true,
    });

    return NextResponse.json({
      success: true,
      tools: tools,
      message: "Conectado ao servidor MCP via HTTP",
    });
  } catch (error) {
    console.error("Erro ao conectar:", error);

    // Fallback para mock em caso de erro
    const mockTools = [
      "browser_navigate",
      "browser_click",
      "browser_type",
      "browser_screenshot",
      "browser_get_title",
      "browser_get_url",
    ];

    mcpConnections.set("default", {
      type: "mock",
      serverUrl,
      tools: mockTools,
      connected: true,
    });

    return NextResponse.json({
      success: true,
      tools: mockTools,
      message: "Conectado em modo mock (erro na conexão real)",
    });
  }
}

async function handleExecute(toolName: string, args: any) {
  try {
    const connection = mcpConnections.get("default");

    if (!connection || !connection.connected) {
      return NextResponse.json({
        success: false,
        error: "Não conectado ao servidor MCP",
      });
    }

    console.log(`Executando tool: ${toolName} com args:`, args);

    if (connection.type === "mock") {
      // Simular execução para desenvolvimento
      return await handleMockExecution(toolName, args);
    } else {
      // Executar no servidor MCP real via HTTP
      const response = await fetch(`${connection.serverUrl}/mcp/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tool: toolName,
          arguments: args,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();

      // Extrair resultado do servidor real
      const result = data.result || data;

      return NextResponse.json({
        success: true,
        result: result,
      });
    }
  } catch (error) {
    console.error("Erro ao executar tool:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erro na execução",
    });
  }
}

async function handleMockExecution(toolName: string, args: any) {
  // Simular respostas do Playwright para desenvolvimento
  const mockResponses: Record<string, any> = {
    browser_navigate: {
      success: true,
      message: `Navegou para: ${args.url}`,
      url: args.url,
    },
    browser_click: {
      success: true,
      message: `Clicou no elemento: ${args.selector}`,
      selector: args.selector,
    },
    browser_type: {
      success: true,
      message: `Digitou "${args.text}" no elemento: ${args.selector}`,
      text: args.text,
      selector: args.selector,
    },
    browser_screenshot: {
      success: true,
      message: "Screenshot capturado",
      path: "/tmp/screenshot.png",
      timestamp: new Date().toISOString(),
    },
    browser_get_title: {
      success: true,
      title: "Google",
      message: "Título obtido com sucesso",
    },
    browser_get_url: {
      success: true,
      url: "https://www.google.com/",
      message: "URL obtida com sucesso",
    },
  };

  const mockResult = mockResponses[toolName] || {
    success: false,
    error: `Tool não reconhecida: ${toolName}`,
  };

  // Simular delay de rede
  await new Promise((resolve) => setTimeout(resolve, 500));

  return NextResponse.json({
    success: true,
    result: mockResult,
  });
}

async function handleDisconnect() {
  try {
    mcpConnections.delete("default");

    return NextResponse.json({
      success: true,
      message: "Desconectado do servidor MCP",
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erro ao desconectar",
    });
  }
}

export async function GET() {
  // Status da conexão
  const connection = mcpConnections.get("default");

  return NextResponse.json({
    connected: !!connection?.connected,
    type: connection?.type || "none",
    serverUrl: connection?.serverUrl || null,
    tools: connection?.tools || [],
  });
}
