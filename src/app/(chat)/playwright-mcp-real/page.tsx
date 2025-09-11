"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function PlaywrightMCPRealPage() {
  const [sessionId, setSessionId] = useState(
    `pw_${Math.random().toString(36).substr(2, 9)}`,
  );
  const [isConnected, setIsConnected] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<any>(null);
  const [availableTools, setAvailableTools] = useState<string[]>([]);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState("");
  const [testUrl, setTestUrl] = useState("https://www.google.com");
  const [testSelector, setTestSelector] = useState("input[name='q']");
  const [testText, setTestText] = useState("playwright real automation");

  // Adicionar log
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setExecutionLog((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  // Iniciar sessão Playwright REAL
  const startPlaywrightSession = async () => {
    try {
      setIsLoading(true);
      addLog(`🚀 Iniciando Playwright REAL para sessão: ${sessionId}`);

      const response = await fetch("/api/mcp/playwright-real", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_session",
          sessionId: sessionId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIsConnected(true);
        setSessionStatus(result);
        setAvailableTools(result.tools || []);
        addLog(`✅ Playwright REAL iniciado!`);
        addLog(`🎭 Tipo: ${result.type}`);
        addLog(`🔧 ${result.tools?.length || 0} tools disponíveis`);
        addLog(`🌐 Browser: ${result.browser_visible ? "Visível" : "Oculto"}`);
      } else {
        addLog(`❌ Erro: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Erro ao iniciar: ${error}`);
    }

    setIsLoading(false);
  };

  // Parar sessão
  const stopPlaywrightSession = async () => {
    try {
      setIsLoading(true);
      addLog(`🛑 Parando sessão Playwright: ${sessionId}`);

      const response = await fetch("/api/mcp/playwright-real", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "stop_session",
          sessionId: sessionId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIsConnected(false);
        setSessionStatus(null);
        setAvailableTools([]);
        addLog(`✅ Sessão finalizada`);
      } else {
        addLog(`❌ Erro: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Erro ao parar: ${error}`);
    }

    setIsLoading(false);
  };

  // Verificar status
  const checkStatus = async () => {
    try {
      const response = await fetch("/api/mcp/playwright-real", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_status",
          sessionId: sessionId,
        }),
      });

      const result = await response.json();

      if (result.success && result.status !== "stopped") {
        setSessionStatus(result);
        setIsConnected(result.status === "running");
      } else {
        setSessionStatus(null);
        setIsConnected(false);
      }
    } catch (error) {
      console.error("Erro ao verificar status:", error);
    }
  };

  // Executar tool Playwright REAL
  const executePlaywrightTool = async (tool: string, args: any) => {
    try {
      setIsLoading(true);
      addLog(`🔧 Executando tool REAL: ${tool}`);

      const response = await fetch("/api/mcp/playwright-real", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute_tool",
          sessionId: sessionId,
          tool: tool,
          args: args,
        }),
      });

      const result = await response.json();

      if (result.success) {
        addLog(`✅ ${tool} executado com sucesso`);
        setTestResult(JSON.stringify(result.result, null, 2));

        // Log específico por tipo de resultado
        if (result.result.title) {
          addLog(`📄 Título: ${result.result.title}`);
        }
        if (result.result.url) {
          addLog(`🔗 URL: ${result.result.url}`);
        }
        if (result.result.screenshot) {
          addLog(`📸 Screenshot capturado: ${result.result.size} bytes`);
        }

        return result.result;
      } else {
        addLog(`❌ Erro: ${result.error}`);
        setTestResult(`❌ Erro: ${result.error}`);

        // Se a sessão foi fechada, resetar estado
        if (result.session_closed) {
          addLog(`🔄 Sessão foi fechada. Resetando estado...`);
          setIsConnected(false);
          setSessionStatus(null);
          setAvailableTools([]);
        }

        return null;
      }
    } catch (error) {
      addLog(`❌ Erro na execução: ${error}`);
      setTestResult(`❌ Erro: ${error}`);
      return null;
    } finally {
      // SEMPRE desabilitar loading, mesmo em caso de erro
      setIsLoading(false);
    }
  };

  // Teste automático completo
  const runFullAutomationTest = async () => {
    if (!isConnected) {
      addLog("❌ Inicie a sessão Playwright primeiro");
      return;
    }

    addLog("🤖 Iniciando automação REAL completa...");

    // Sequência de automação real
    await executePlaywrightTool("browser_navigate", { url: testUrl });
    await new Promise((resolve) => setTimeout(resolve, 3000));

    await executePlaywrightTool("browser_wait_for_selector", {
      selector: testSelector,
      timeout: 5000,
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await executePlaywrightTool("browser_click", { selector: testSelector });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await executePlaywrightTool("browser_type", {
      selector: testSelector,
      text: testText,
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await executePlaywrightTool("browser_screenshot", { fullPage: false });
    await executePlaywrightTool("browser_get_title", {});
    await executePlaywrightTool("browser_get_url", {});

    addLog("🎉 Automação REAL concluída!");
  };

  // Verificar status periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      if (sessionId) {
        checkStatus();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [sessionId]);

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">🎭 Playwright MCP 100% REAL</h1>
        <p className="text-muted-foreground mt-2">
          MCP Playwright REAL - não é simulação! Browser real com interface
          visual
        </p>
      </div>

      {/* Status da Sessão */}
      <Card
        className={`border-2 ${isConnected ? "border-green-200 dark:border-green-800" : "border-red-200 dark:border-red-800"}`}
      >
        <CardHeader>
          <CardTitle
            className={isConnected ? "text-green-600" : "text-red-600"}
          >
            {isConnected ? "✅ Playwright REAL Ativo" : "❌ Playwright Parado"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {isConnected && sessionStatus ? (
            <>
              <div>
                🆔 <strong>Session ID:</strong> {sessionStatus.sessionId}
              </div>
              <div>
                🌐 <strong>Browser:</strong>{" "}
                {sessionStatus.browser_active ? "Ativo" : "Inativo"}
              </div>
              <div>
                ⏰ <strong>Uptime:</strong>{" "}
                {formatUptime(sessionStatus.uptime || 0)}
              </div>
              <div>
                🔧 <strong>Tools:</strong> {sessionStatus.tools?.length || 0}{" "}
                disponíveis
              </div>
              <div>
                🎭 <strong>Tipo:</strong> {sessionStatus.type}
              </div>
              <div>
                📡 <strong>Status:</strong> {sessionStatus.status}
              </div>
            </>
          ) : (
            <>
              <div>
                🎭 <strong>Playwright MCP REAL:</strong> Browser real com
                interface visual
              </div>
              <div>
                🚀 <strong>Execução:</strong> Nativa, não simulada
              </div>
              <div>
                📸 <strong>Screenshots:</strong> Reais da página
              </div>
              <div>
                🔧 <strong>Controle:</strong> DOM direto via Playwright
              </div>
              <div>
                ⚡ <strong>Performance:</strong> Máxima, sem overhead
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Controles de Sessão */}
      <Card>
        <CardHeader>
          <CardTitle>🔧 Controles de Sessão</CardTitle>
          <CardDescription>Gerencie sua sessão Playwright REAL</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="session-id">Session ID</Label>
            <Input
              id="session-id"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="pw_123456"
              disabled={isConnected}
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {!isConnected ? (
              <Button
                onClick={startPlaywrightSession}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? "Iniciando..." : "🚀 Iniciar Playwright REAL"}
              </Button>
            ) : (
              <Button
                onClick={stopPlaywrightSession}
                disabled={isLoading}
                variant="destructive"
              >
                {isLoading ? "Parando..." : "🛑 Parar Sessão"}
              </Button>
            )}

            <Button
              onClick={checkStatus}
              variant="outline"
              className="border-blue-200 text-blue-600"
            >
              🔄 Verificar Status
            </Button>

            {isConnected && (
              <>
                <Button
                  onClick={() =>
                    executePlaywrightTool("browser_navigate", { url: testUrl })
                  }
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? "Navegando..." : "🌐 Navegar Primeiro"}
                </Button>
                <Button
                  onClick={runFullAutomationTest}
                  disabled={isLoading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isLoading ? "Executando..." : "🤖 Automação Completa"}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configurações de Teste */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>⚙️ Configurações de Automação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="test-url">URL de Teste</Label>
              <Input
                id="test-url"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                placeholder="https://www.google.com"
              />
            </div>

            <div>
              <Label htmlFor="test-selector">Seletor CSS</Label>
              <Input
                id="test-selector"
                value={testSelector}
                onChange={(e) => setTestSelector(e.target.value)}
                placeholder="input[name='q']"
              />
            </div>

            <div>
              <Label htmlFor="test-text">Texto para Digitar</Label>
              <Input
                id="test-text"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="playwright real automation"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tools Disponíveis */}
      {isConnected && availableTools.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              🔧 Tools Playwright REAL ({availableTools.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {availableTools.map((tool, index) => (
                <div key={index} className="border rounded p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <Badge variant="default">{tool}</Badge>
                    <Button
                      size="sm"
                      onClick={() => {
                        // Executar com argumentos baseados no tool
                        let args = {};

                        if (tool === "browser_navigate") {
                          args = { url: testUrl };
                        } else if (tool === "browser_click") {
                          args = { selector: testSelector };
                        } else if (tool === "browser_type") {
                          args = { selector: testSelector, text: testText };
                        } else if (tool === "browser_screenshot") {
                          args = { fullPage: false };
                        } else if (tool === "browser_wait_for_selector") {
                          args = { selector: testSelector, timeout: 5000 };
                        }

                        executePlaywrightTool(tool, args);
                      }}
                      disabled={isLoading}
                    >
                      ▶️ Executar
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Tool Playwright REAL - execução nativa
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultado */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle>📄 Resultado da Execução REAL</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={testResult}
              readOnly
              rows={10}
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>
      )}

      {/* Log */}
      {executionLog.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📋 Log de Execução</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-40 overflow-y-auto">
              {executionLog.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instruções */}
      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-600">
            📚 Como Usar Playwright REAL
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <strong>1. 🚀 Iniciar Sessão:</strong>
            <p className="ml-4 mt-1">
              Clique em &quot;Iniciar Playwright REAL&quot; - um browser real
              será aberto
            </p>
          </div>
          <div>
            <strong>2. ⚙️ Configurar:</strong>
            <p className="ml-4 mt-1">
              Configure URL, seletor e texto nos campos de configuração
            </p>
          </div>
          <div>
            <strong>3. 🔧 Executar Tools:</strong>
            <p className="ml-4 mt-1">
              Clique nos botões &quot;Executar&quot; das tools para ações
              individuais
            </p>
          </div>
          <div>
            <strong>4. 🤖 Automação Completa:</strong>
            <p className="ml-4 mt-1">
              Use &quot;Automação Completa&quot; para sequência automática
            </p>
          </div>
          <div>
            <strong>5. 📸 Ver Resultados:</strong>
            <p className="ml-4 mt-1">
              Veja resultados reais no painel de resultados
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Diferenças REAL vs Mock */}
      <Card className="border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-green-600">
            🔥 Playwright REAL vs Mock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Aspecto</th>
                  <th className="text-left p-2">Mock/Simulação</th>
                  <th className="text-left p-2">Playwright REAL</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2 font-medium">Browser</td>
                  <td className="p-2">❌ Não abre browser</td>
                  <td className="p-2">✅ Browser real visível</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Execução</td>
                  <td className="p-2">❌ Dados fictícios</td>
                  <td className="p-2">✅ Execução nativa</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Screenshots</td>
                  <td className="p-2">❌ Simulados</td>
                  <td className="p-2">✅ Screenshots reais</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Interação</td>
                  <td className="p-2">❌ Logs falsos</td>
                  <td className="p-2">✅ Cliques/digitação reais</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">Resultados</td>
                  <td className="p-2">❌ Dados hardcoded</td>
                  <td className="p-2">✅ Dados reais da página</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
