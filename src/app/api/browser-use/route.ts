import { NextRequest, NextResponse } from "next/server";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";

// Mapa de sessões ativas por usuário
const userSessions = new Map<
  string,
  {
    process: ChildProcess;
    port: number;
    status: "starting" | "running" | "stopped";
    startTime: Date;
    lastActivity: Date;
  }
>();

// Portas disponíveis para browser-use (8000-8100)
const getAvailablePort = (): number => {
  const usedPorts = Array.from(userSessions.values()).map((s) => s.port);
  for (let port = 8000; port <= 8100; port++) {
    if (!usedPorts.includes(port)) {
      return port;
    }
  }
  throw new Error("Nenhuma porta disponível");
};

// Cleanup de sessões antigas (mais de 1 hora inativas)
const cleanupOldSessions = () => {
  const now = new Date();
  for (const [userId, session] of userSessions.entries()) {
    const inactiveTime = now.getTime() - session.lastActivity.getTime();
    if (inactiveTime > 60 * 60 * 1000) {
      // 1 hora
      console.log(`🧹 Limpando sessão inativa do usuário: ${userId}`);
      session.process.kill();
      userSessions.delete(userId);
    }
  }
};

// Executar cleanup a cada 10 minutos
setInterval(cleanupOldSessions, 10 * 60 * 1000);

export async function POST(request: NextRequest) {
  try {
    const { action, userId } = await request.json();

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: "userId é obrigatório",
      });
    }

    switch (action) {
      case "start":
        return await startBrowserUseSession(userId);
      case "stop":
        return await stopBrowserUseSession(userId);
      case "status":
        return await getSessionStatus(userId);
      case "execute":
        return await executeBrowserUseCommand(userId, await request.json());
      default:
        return NextResponse.json({
          success: false,
          error: "Ação não reconhecida",
        });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro na API browser-use:", errorMessage);
    return NextResponse.json({
      success: false,
      error: errorMessage,
    });
  }
}

async function startBrowserUseSession(userId: string) {
  try {
    // Verificar se já existe sessão ativa
    if (userSessions.has(userId)) {
      const session = userSessions.get(userId)!;
      if (session.status === "running") {
        return NextResponse.json({
          success: true,
          message: "Sessão já ativa",
          port: session.port,
          status: session.status,
        });
      }
    }

    const port = getAvailablePort();

    // Verificar se browser-use está instalado
    const browserUsePath = path.join(process.cwd(), "browser-use-server");
    if (!fs.existsSync(browserUsePath)) {
      return NextResponse.json({
        success: false,
        error: "Browser-use não instalado. Execute: npm run setup-browser-use",
      });
    }

    console.log(
      `🚀 Iniciando browser-use para usuário ${userId} na porta ${port}`,
    );

    // Iniciar processo browser-use
    const browserUseProcess = spawn(
      "python",
      [
        "webui.py",
        "--ip",
        "127.0.0.1",
        "--port",
        port.toString(),
        "--user-session",
        userId,
      ],
      {
        cwd: browserUsePath,
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          BROWSER_USE_USER_ID: userId,
          BROWSER_USE_SESSION_PORT: port.toString(),
        },
      },
    );

    // Registrar sessão
    userSessions.set(userId, {
      process: browserUseProcess,
      port: port,
      status: "starting",
      startTime: new Date(),
      lastActivity: new Date(),
    });

    // Monitorar processo
    browserUseProcess.stdout?.on("data", (data) => {
      console.log(`[${userId}] Browser-use stdout:`, data.toString());

      // Detectar quando o servidor está pronto
      if (data.toString().includes("Running on")) {
        const session = userSessions.get(userId);
        if (session) {
          session.status = "running";
          session.lastActivity = new Date();
        }
      }
    });

    browserUseProcess.stderr?.on("data", (data) => {
      console.error(`[${userId}] Browser-use stderr:`, data.toString());
    });

    browserUseProcess.on("close", (code) => {
      console.log(
        `[${userId}] Browser-use processo finalizado com código: ${code}`,
      );
      userSessions.delete(userId);
    });

    // Aguardar inicialização (máximo 30 segundos)
    let attempts = 0;
    while (attempts < 30) {
      const session = userSessions.get(userId);
      if (session?.status === "running") {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }

    const finalSession = userSessions.get(userId);
    if (!finalSession || finalSession.status !== "running") {
      return NextResponse.json({
        success: false,
        error: "Timeout ao iniciar browser-use",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Browser-use iniciado com sucesso",
      port: port,
      status: "running",
      webui_url: `http://localhost:${port}`,
      vnc_url: `http://localhost:${port + 1000}/vnc.html`, // VNC na porta +1000
    });
  } catch (error) {
    console.error(`❌ Erro ao iniciar sessão para ${userId}:`, error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function stopBrowserUseSession(userId: string) {
  try {
    const session = userSessions.get(userId);

    if (!session) {
      return NextResponse.json({
        success: false,
        error: "Sessão não encontrada",
      });
    }

    console.log(`🛑 Parando sessão browser-use para usuário: ${userId}`);

    // Matar processo
    session.process.kill("SIGTERM");

    // Aguardar finalização
    setTimeout(() => {
      if (userSessions.has(userId)) {
        session.process.kill("SIGKILL");
        userSessions.delete(userId);
      }
    }, 5000);

    return NextResponse.json({
      success: true,
      message: "Sessão finalizada",
    });
  } catch (error) {
    console.error(`❌ Erro ao parar sessão para ${userId}:`, error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function getSessionStatus(userId: string) {
  try {
    const session = userSessions.get(userId);

    if (!session) {
      return NextResponse.json({
        success: true,
        status: "stopped",
        message: "Nenhuma sessão ativa",
      });
    }

    // Atualizar última atividade
    session.lastActivity = new Date();

    return NextResponse.json({
      success: true,
      status: session.status,
      port: session.port,
      startTime: session.startTime,
      lastActivity: session.lastActivity,
      webui_url: `http://localhost:${session.port}`,
      vnc_url: `http://localhost:${session.port + 1000}/vnc.html`,
      uptime: Date.now() - session.startTime.getTime(),
    });
  } catch (error) {
    console.error(`❌ Erro ao obter status para ${userId}:`, error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function executeBrowserUseCommand(
  userId: string,
  { prompt, model = "gpt-4" }: { prompt: string; model?: string },
) {
  try {
    const session = userSessions.get(userId);

    if (!session || session.status !== "running") {
      return NextResponse.json({
        success: false,
        error: "Sessão não ativa. Inicie a sessão primeiro.",
      });
    }

    // Atualizar última atividade
    session.lastActivity = new Date();

    // Executar comando via API do browser-use
    const response = await fetch(
      `http://localhost:${session.port}/api/execute`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt,
          model: model,
          max_steps: 10,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      result: result,
      session_info: {
        userId: userId,
        port: session.port,
        uptime: Date.now() - session.startTime.getTime(),
      },
    });
  } catch (error) {
    console.error(`❌ Erro ao executar comando para ${userId}:`, error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function GET() {
  try {
    // Listar todas as sessões ativas
    const sessions = Array.from(userSessions.entries()).map(
      ([userId, session]) => ({
        userId,
        status: session.status,
        port: session.port,
        startTime: session.startTime,
        lastActivity: session.lastActivity,
        uptime: Date.now() - session.startTime.getTime(),
      }),
    );

    return NextResponse.json({
      success: true,
      active_sessions: sessions.length,
      sessions: sessions,
      available_ports: Array.from({ length: 101 }, (_, i) => 8000 + i).filter(
        (port) =>
          !Array.from(userSessions.values()).some((s) => s.port === port),
      ),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao listar sessões:", errorMessage);
    return NextResponse.json({
      success: false,
      error: errorMessage,
    });
  }
}
