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
    console.log("🔍 Tentando conectar ao Desktop Agent...");

    // 🎯 PRIORIDADE 1: Usar URL fornecida pelo usuário (se válida)
    let desktopAgentResponse: Response | null = null;
    let workingPort: number | null = null;
    let finalUrl = "";

    // Verificar se URL personalizada foi fornecida
    if (serverUrl && serverUrl !== "http://localhost:3001") {
      try {
        console.log(`🌐 Testando URL personalizada: ${serverUrl}`);
        desktopAgentResponse = await fetch(`${serverUrl}/status`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
          },
          signal: AbortSignal.timeout(5000),
        });

        if (desktopAgentResponse.ok) {
          const agentStatus = await desktopAgentResponse.json();

          // Validar se é realmente um Desktop Agent
          if (
            agentStatus.agent &&
            (agentStatus.agent.includes("desktop") ||
              agentStatus.agent.includes("standalone") ||
              agentStatus.status === "online")
          ) {
            finalUrl = serverUrl;
            console.log(
              `✅ Desktop Agent encontrado na URL personalizada: ${serverUrl}`,
            );

            const tools = [
              "browser_navigate",
              "browser_click",
              "browser_type",
              "browser_screenshot",
              "browser_get_title",
              "browser_get_url",
            ];

            mcpConnections.set("default", {
              type: "desktop-agent",
              serverUrl: finalUrl,
              tools,
              connected: true,
              agentStatus,
            });

            return NextResponse.json({
              success: true,
              tools: tools,
              message: `🎭 DESKTOP AGENT REAL conectado (${finalUrl}) - Navegador no cliente!`,
              agentInfo: agentStatus,
              agentType: "REAL_DESKTOP_AGENT",
            });
          }
        }
      } catch (error) {
        console.log(`❌ URL personalizada falhou: ${error}`);
      }
    }

    // 🎭 PRIORIDADE 2: Tentar Desktop Agent local (se URL personalizada falhou)
    if (!finalUrl) {
      const ports = [8768, 8766]; // Nova porta primeiro, depois a antiga

      for (const port of ports) {
        try {
          console.log(`🔍 Testando porta local ${port}...`);
          desktopAgentResponse = await fetch(
            `http://localhost:${port}/status`,
            {
              method: "GET",
              headers: { "Content-Type": "application/json" },
              // Timeout rápido para não travar
              signal: AbortSignal.timeout(3000),
            },
          );

          if (desktopAgentResponse.ok) {
            const agentStatus = await desktopAgentResponse.json();

            // VALIDAÇÃO REAL: verificar se é realmente o Desktop Agent
            if (
              agentStatus.agent &&
              (agentStatus.agent.includes("desktop") ||
                agentStatus.agent.includes("standalone"))
            ) {
              workingPort = port;
              finalUrl = `http://localhost:${port}`;
              console.log(
                `✅ Desktop Agent REAL encontrado na porta ${workingPort}:`,
                agentStatus,
              );

              // VALIDAÇÃO SIMPLIFICADA: Se responde ao status, consideramos válido
              console.log(
                `✅ Desktop Agent na porta ${port} está respondendo ao status - considerando válido!`,
              );

              const tools = [
                "browser_navigate",
                "browser_click",
                "browser_type",
                "browser_screenshot",
                "browser_get_title",
                "browser_get_url",
              ];

              mcpConnections.set("default", {
                type: "desktop-agent",
                serverUrl: finalUrl,
                tools,
                connected: true,
                agentStatus,
              });

              return NextResponse.json({
                success: true,
                tools: tools,
                message: `🎭 DESKTOP AGENT REAL conectado (${finalUrl}) - Navegador no cliente!`,
                agentInfo: agentStatus,
                agentType: "REAL_DESKTOP_AGENT",
              });
            } else {
              console.log(
                `❌ Porta ${port} não é um Desktop Agent válido:`,
                agentStatus,
              );
            }
          }
        } catch (portError) {
          console.log(`❌ Erro ao conectar na porta ${port}:`, portError);
          continue;
        }
      }
    }

    // Se chegou aqui, não encontrou Desktop Agent
    console.log("❌ DESKTOP AGENT NÃO ENCONTRADO!");
    console.log("💡 Instruções para inicializar:");
    console.log("   1. Abra o terminal na pasta 'desktop-agent'");
    console.log("   2. Execute: start-desktop-agent.bat");
    console.log("   3. Aguarde ver as mensagens de inicialização");
    console.log("   4. Tente conectar novamente");

    return NextResponse.json({
      success: false,
      error:
        "Desktop Agent não encontrado. Execute 'start-desktop-agent.bat' primeiro.",
      instructions: [
        "1. Abra o terminal na pasta 'desktop-agent'",
        "2. Execute: start-desktop-agent.bat",
        "3. Aguarde as mensagens de inicialização",
        "4. Tente conectar novamente",
      ],
    });
  } catch (error) {
    console.error("❌ Erro ao conectar:", error);

    return NextResponse.json({
      success: false,
      error: `Erro na conexão: ${error instanceof Error ? error.message : String(error)}`,
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

    if (connection.type === "desktop-agent") {
      // 🎭 Executar no Desktop Agent local REAL
      const agentUrl = `${connection.serverUrl}/playwright/${toolName.replace("browser_", "")}`;

      console.log(`🚀 EXECUTANDO NO DESKTOP AGENT REAL: ${agentUrl}`);
      console.log(`📝 Dados enviados:`, args);

      const response = await fetch(agentUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify(args),
      });

      if (!response.ok) {
        throw new Error(`Erro Desktop Agent: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ RESPOSTA DO DESKTOP AGENT:`, data);

      return NextResponse.json({
        success: true,
        result: data,
        source: "REAL_DESKTOP_AGENT",
      });
    } else if (connection.type === "mock") {
      // Simular execução para desenvolvimento
      return await handleMockExecution(toolName, args);
    } else {
      // Executar no servidor MCP real via HTTP
      const response = await fetch(`${connection.serverUrl}/mcp/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
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
  try {
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
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erro no mock",
    });
  }
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
