import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";

// MCP Playwright WEBSERVER - Headless no servidor + WebView no cliente
// Executa no servidor, sincroniza com cliente

interface PlaywrightWebserverSession {
  id: string;
  browser: any;
  page: any;
  context: any;
  status: "starting" | "running" | "stopped";
  startTime: Date;
  lastActivity: Date;
  tools: string[];
  currentUrl: string;
  currentTitle: string;
}

// Sessões Playwright webserver
const playwrightWebserverSessions = new Map<
  string,
  PlaywrightWebserverSession
>();

// Tools do Playwright Webserver
const WEBSERVER_PLAYWRIGHT_TOOLS = [
  "browser_navigate",
  "browser_click",
  "browser_type",
  "browser_screenshot",
  "browser_get_title",
  "browser_get_url",
  "browser_wait_for_selector",
  "browser_evaluate",
  "browser_get_page_content",
  "browser_close",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sessionId, tool, args } = body;

    console.log(`🌐 Playwright WEBSERVER - Action: ${action}`);

    switch (action) {
      case "start_session":
        return await startWebserverSession(sessionId || `ws_${Date.now()}`);

      case "execute_tool":
        return await executeWebserverTool(sessionId, tool, args);

      case "stop_session":
        return await stopWebserverSession(sessionId);

      case "get_status":
        return await getWebserverStatus(sessionId);

      default:
        return NextResponse.json({
          success: false,
          error: "Ação não reconhecida",
        });
    }
  } catch (error) {
    console.error("❌ Erro no Playwright WEBSERVER:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function startWebserverSession(sessionId: string) {
  try {
    // Verificar se já existe sessão
    if (playwrightWebserverSessions.has(sessionId)) {
      const session = playwrightWebserverSessions.get(sessionId)!;
      if (session.status === "running") {
        return NextResponse.json({
          success: true,
          message: "Sessão já ativa",
          sessionId: sessionId,
          tools: session.tools,
          currentUrl: session.currentUrl,
          currentTitle: session.currentTitle,
        });
      }
    }

    console.log(`🚀 Iniciando Playwright WEBSERVER para sessão ${sessionId}`);

    // Inicializar Playwright headless para webserver
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
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    });

    const page = await context.newPage();

    // Registrar sessão
    const session: PlaywrightWebserverSession = {
      id: sessionId,
      browser: browser,
      page: page,
      context: context,
      status: "running",
      startTime: new Date(),
      lastActivity: new Date(),
      tools: WEBSERVER_PLAYWRIGHT_TOOLS,
      currentUrl: "about:blank",
      currentTitle: "Nova Sessão",
    };

    playwrightWebserverSessions.set(sessionId, session);

    console.log(`✅ Playwright WEBSERVER iniciado para sessão ${sessionId}`);

    return NextResponse.json({
      success: true,
      message: "Playwright WEBSERVER iniciado com sucesso",
      sessionId: sessionId,
      tools: WEBSERVER_PLAYWRIGHT_TOOLS,
      type: "webserver_playwright",
      mode: "headless_server_with_client_webview",
      currentUrl: session.currentUrl,
      currentTitle: session.currentTitle,
    });
  } catch (error) {
    console.error(
      `❌ Erro ao iniciar Playwright WEBSERVER para ${sessionId}:`,
      error,
    );
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function executeWebserverTool(
  sessionId: string,
  tool: string,
  args: any,
) {
  try {
    const session = playwrightWebserverSessions.get(sessionId);

    if (!session || session.status !== "running") {
      return NextResponse.json({
        success: false,
        error: "Sessão Playwright WEBSERVER não ativa",
      });
    }

    session.lastActivity = new Date();
    const { page, browser } = session;

    console.log(`🔧 Executando tool WEBSERVER: ${tool} com args:`, args);

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
        console.log(`🌐 Navegando para: ${args.url}`);

        try {
          const response = await page.goto(args.url, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          });

          console.log(`📄 Resposta da navegação: ${response?.status()}`);

          // Aguardar um pouco para garantir que a página carregou
          await page.waitForTimeout(2000);

          session.currentUrl = page.url();
          session.currentTitle = await page.title();

          console.log(
            `✅ Navegação concluída - URL: ${session.currentUrl}, Título: ${session.currentTitle}`,
          );

          result = {
            success: true,
            url: session.currentUrl,
            title: session.currentTitle,
            action: "navigated",
            status: response?.status(),
          };
        } catch (navError) {
          console.error(`❌ Erro na navegação:`, navError);
          result = {
            success: false,
            error: `Erro na navegação: ${navError instanceof Error ? navError.message : String(navError)}`,
            url: args.url,
          };
        }
        break;

      case "browser_click":
        await page.click(args.selector);
        result = {
          success: true,
          selector: args.selector,
          action: "clicked",
          url: page.url(),
          title: await page.title(),
        };
        break;

      case "browser_type":
        await page.fill(args.selector, args.text);
        result = {
          success: true,
          selector: args.selector,
          text: args.text,
          action: "typed",
          url: page.url(),
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
          url: page.url(),
          title: await page.title(),
        };
        break;

      case "browser_get_title":
        const title = await page.title();
        session.currentTitle = title;
        result = {
          success: true,
          title: title,
        };
        break;

      case "browser_get_url":
        const url = page.url();
        session.currentUrl = url;
        result = {
          success: true,
          url: url,
        };
        break;

      case "browser_wait_for_selector":
        await page.waitForSelector(args.selector, {
          timeout: args.timeout || 10000,
        });
        result = {
          success: true,
          selector: args.selector,
          action: "found",
          url: page.url(),
        };
        break;

      case "browser_evaluate":
        const evalResult = await page.evaluate(
          args.script || "() => document.title",
        );
        result = {
          success: true,
          result: evalResult,
          url: page.url(),
        };
        break;

      case "browser_get_page_content":
        const content = await page.content();
        const currentUrl = page.url();
        const currentTitle = await page.title();

        console.log(
          `📄 Conteúdo da página obtido - URL: ${currentUrl}, Título: ${currentTitle}, Tamanho: ${content.length} chars`,
        );

        result = {
          success: true,
          content: content,
          url: currentUrl,
          title: currentTitle,
          contentLength: content.length,
        };
        break;

      case "browser_close":
        if (browser) {
          await browser.close();
          playwrightWebserverSessions.delete(sessionId);
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
      type: "webserver_playwright_execution",
      // Dados para sincronizar com WebView do cliente
      sync_data: {
        url: session.currentUrl,
        title: session.currentTitle,
        action: tool,
        args: args,
      },
    });
  } catch (error) {
    console.error(`❌ Erro ao executar tool WEBSERVER ${tool}:`, error);

    // Se o browser foi fechado, limpar a sessão
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes("Target page, context or browser has been closed")
    ) {
      console.log(`🧹 Limpando sessão ${sessionId} - browser foi fechado`);
      playwrightWebserverSessions.delete(sessionId);

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

async function stopWebserverSession(sessionId: string) {
  try {
    const session = playwrightWebserverSessions.get(sessionId);

    if (!session) {
      return NextResponse.json({
        success: false,
        error: "Sessão não encontrada",
      });
    }

    console.log(`🛑 Parando sessão Playwright WEBSERVER: ${sessionId}`);

    if (session.browser) {
      await session.browser.close();
    }

    playwrightWebserverSessions.delete(sessionId);

    return NextResponse.json({
      success: true,
      message: "Sessão Playwright WEBSERVER finalizada",
    });
  } catch (error) {
    console.error(`❌ Erro ao parar sessão ${sessionId}:`, error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function getWebserverStatus(sessionId: string) {
  try {
    const session = playwrightWebserverSessions.get(sessionId);

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
      type: "webserver_playwright",
      browser_active: !!session.browser,
      page_active: !!session.page,
      currentUrl: session.currentUrl,
      currentTitle: session.currentTitle,
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
    const activeSessions = Array.from(playwrightWebserverSessions.entries())
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
        currentUrl: session.currentUrl,
        currentTitle: session.currentTitle,
      }));

    return NextResponse.json({
      success: true,
      message: "Playwright WEBSERVER ativo",
      active_sessions: activeSessions.length,
      sessions: activeSessions,
      type: "webserver_playwright",
      features: [
        "Playwright headless no servidor",
        "WebView no cliente",
        "Sincronização automática",
        "Screenshots reais",
        "Execução no webserver",
        "Visual no navegador do cliente",
      ],
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
