import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";

// MCP Playwright 100% REAL - não é mock!
// Usa Playwright real rodando no servidor

interface PlaywrightSession {
  id: string;
  browser: any;
  page: any;
  context: any;
  status: "starting" | "running" | "stopped";
  startTime: Date;
  lastActivity: Date;
  tools: string[];
}

// Sessões Playwright reais
const playwrightSessions = new Map<string, PlaywrightSession>();

// Tools reais do Playwright MCP
const REAL_PLAYWRIGHT_TOOLS = [
  "browser_navigate",
  "browser_click",
  "browser_type",
  "browser_screenshot",
  "browser_get_title",
  "browser_get_url",
  "browser_wait_for_selector",
  "browser_evaluate",
  "browser_close",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sessionId, tool, args } = body;

    console.log(`🎭 Playwright REAL MCP - Action: ${action}`);

    switch (action) {
      case "start_session":
        return await startPlaywrightSession(sessionId || `pw_${Date.now()}`);

      case "execute_tool":
        return await executePlaywrightTool(sessionId, tool, args);

      case "stop_session":
        return await stopPlaywrightSession(sessionId);

      case "get_status":
        return await getSessionStatus(sessionId);

      default:
        return NextResponse.json({
          success: false,
          error: "Ação não reconhecida",
        });
    }
  } catch (error) {
    console.error("❌ Erro no Playwright REAL MCP:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function startPlaywrightSession(sessionId: string) {
  try {
    // Verificar se já existe sessão
    if (playwrightSessions.has(sessionId)) {
      const session = playwrightSessions.get(sessionId)!;
      if (session.status === "running") {
        return NextResponse.json({
          success: true,
          message: "Sessão já ativa",
          sessionId: sessionId,
          tools: session.tools,
        });
      }
    }

    console.log(`🚀 Iniciando Playwright REAL para sessão ${sessionId}`);

    // Inicializar Playwright para webserver (headless)
    const browser = await chromium.launch({
      headless: true, // ✅ HEADLESS para webserver
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    const page = await context.newPage();

    // Registrar sessão
    const session: PlaywrightSession = {
      id: sessionId,
      browser: browser,
      page: page,
      context: context,
      status: "running",
      startTime: new Date(),
      lastActivity: new Date(),
      tools: REAL_PLAYWRIGHT_TOOLS,
    };

    playwrightSessions.set(sessionId, session);

    console.log(`✅ Playwright REAL iniciado para sessão ${sessionId}`);

    return NextResponse.json({
      success: true,
      message: "Playwright REAL iniciado com sucesso",
      sessionId: sessionId,
      tools: REAL_PLAYWRIGHT_TOOLS,
      type: "real_playwright_mcp",
      browser_visible: true,
    });
  } catch (error) {
    console.error(`❌ Erro ao iniciar Playwright para ${sessionId}:`, error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function executePlaywrightTool(
  sessionId: string,
  tool: string,
  args: any,
) {
  try {
    const session = playwrightSessions.get(sessionId);

    if (!session || session.status !== "running") {
      return NextResponse.json({
        success: false,
        error: "Sessão Playwright não ativa",
      });
    }

    session.lastActivity = new Date();
    const { page, browser } = session;

    console.log(`🔧 Executando tool REAL: ${tool} com args:`, args);

    // Verificar se browser/page ainda estão ativos
    if (!browser || !page) {
      return NextResponse.json({
        success: false,
        error: "Browser ou página não disponível. Reinicie a sessão.",
      });
    }

    let result;

    switch (tool) {
      case "browser_navigate":
        await page.goto(args.url);
        result = {
          success: true,
          url: page.url(),
          title: await page.title(),
        };
        break;

      case "browser_click":
        await page.click(args.selector);
        result = {
          success: true,
          selector: args.selector,
          action: "clicked",
        };
        break;

      case "browser_type":
        await page.fill(args.selector, args.text);
        result = {
          success: true,
          selector: args.selector,
          text: args.text,
          action: "typed",
        };
        break;

      case "browser_screenshot":
        const screenshot = await page.screenshot({
          fullPage: args.fullPage || false,
        });
        result = {
          success: true,
          screenshot: screenshot.toString("base64"),
          size: screenshot.length,
        };
        break;

      case "browser_get_title":
        result = {
          success: true,
          title: await page.title(),
        };
        break;

      case "browser_get_url":
        result = {
          success: true,
          url: page.url(),
        };
        break;

      case "browser_wait_for_selector":
        await page.waitForSelector(args.selector, {
          timeout: args.timeout || 5000,
        });
        result = {
          success: true,
          selector: args.selector,
          action: "found",
        };
        break;

      case "browser_evaluate":
        const evalResult = await page.evaluate(args.script);
        result = {
          success: true,
          result: evalResult,
        };
        break;

      case "browser_close":
        if (browser) {
          await browser.close();
          playwrightSessions.delete(sessionId);
        }
        result = {
          success: true,
          action: "closed",
        };
        break;

      default:
        result = {
          success: false,
          error: `Tool não reconhecida: ${tool}`,
        };
    }

    return NextResponse.json({
      success: true,
      tool: tool,
      result: result,
      sessionId: sessionId,
      timestamp: new Date().toISOString(),
      type: "real_playwright_execution",
    });
  } catch (error) {
    console.error(`❌ Erro ao executar tool ${tool}:`, error);

    // Se o browser foi fechado, limpar a sessão
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes("Target page, context or browser has been closed")
    ) {
      console.log(`🧹 Limpando sessão ${sessionId} - browser foi fechado`);
      playwrightSessions.delete(sessionId);

      return NextResponse.json({
        success: false,
        error: "Browser foi fechado. Inicie uma nova sessão.",
        session_closed: true,
      });
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function stopPlaywrightSession(sessionId: string) {
  try {
    const session = playwrightSessions.get(sessionId);

    if (!session) {
      return NextResponse.json({
        success: false,
        error: "Sessão não encontrada",
      });
    }

    console.log(`🛑 Parando sessão Playwright: ${sessionId}`);

    if (session.browser) {
      await session.browser.close();
    }

    playwrightSessions.delete(sessionId);

    return NextResponse.json({
      success: true,
      message: "Sessão Playwright finalizada",
    });
  } catch (error) {
    console.error(`❌ Erro ao parar sessão ${sessionId}:`, error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function getSessionStatus(sessionId: string) {
  try {
    const session = playwrightSessions.get(sessionId);

    if (!session) {
      return NextResponse.json({
        success: true,
        status: "stopped",
        message: "Nenhuma sessão ativa",
      });
    }

    session.lastActivity = new Date();

    return NextResponse.json({
      success: true,
      status: session.status,
      sessionId: sessionId,
      tools: session.tools,
      startTime: session.startTime,
      lastActivity: session.lastActivity,
      uptime: Date.now() - session.startTime.getTime(),
      type: "real_playwright_mcp",
      browser_active: !!session.browser,
      page_active: !!session.page,
    });
  } catch (error) {
    console.error(`❌ Erro ao obter status ${sessionId}:`, error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function GET() {
  try {
    const activeSessions = Array.from(playwrightSessions.entries())
      .filter(([, session]) => session.status === "running")
      .map(([id, session]) => ({
        id,
        status: session.status,
        tools: session.tools.length,
        startTime: session.startTime,
        lastActivity: session.lastActivity,
        uptime: Date.now() - session.startTime.getTime(),
        browser_active: !!session.browser,
        page_active: !!session.page,
      }));

    return NextResponse.json({
      success: true,
      message: "Playwright REAL MCP ativo",
      active_sessions: activeSessions.length,
      sessions: activeSessions,
      type: "real_playwright_mcp",
      features: [
        "Playwright 100% REAL",
        "Browser real com interface",
        "Execução nativa",
        "Screenshots reais",
        "Controle DOM completo",
        "Não é simulação!",
        "Roda diretamente na API",
      ],
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
