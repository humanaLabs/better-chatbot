"use client";

import { useState, useRef, useEffect } from "react";
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

export default function PlaywrightHybridPage() {
  const [currentUrl, setCurrentUrl] = useState("https://google.com");
  const [mcpServerUrl, setMcpServerUrl] = useState("http://localhost:3001");
  const [testPrompt, setTestPrompt] = useState(
    "Abra o Google, clique no campo de busca e digite 'playwright hybrid test'",
  );
  const [testResult, setTestResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [isWebViewReady, setIsWebViewReady] = useState(false);
  const [isMcpConnected, setIsMcpConnected] = useState(false);
  const [availableTools, setAvailableTools] = useState<string[]>([]);
  const [mcpMode, setMcpMode] = useState<"none" | "mock" | "real">("none");

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Adicionar log
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setExecutionLog((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  // Executar comando direto no WebView (para sincronização)
  const executeCommandInWebView = (
    command: string,
    selector?: string,
    text?: string,
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!iframeRef.current?.contentWindow) {
        reject(new Error("WebView não acessível"));
        return;
      }

      const messageId = `webview_${Date.now()}_${Math.random()}`;

      const handleMessage = (event: MessageEvent) => {
        if (
          event.data?.type === "WEBVIEW_RESULT" &&
          event.data?.id === messageId
        ) {
          window.removeEventListener("message", handleMessage);
          resolve(event.data.result);
        }
      };

      window.addEventListener("message", handleMessage);

      // Timeout de 3 segundos para sincronização
      setTimeout(() => {
        window.removeEventListener("message", handleMessage);
        reject(new Error("Timeout na sincronização WebView"));
      }, 3000);

      // Enviar comando para o WebView
      iframeRef.current.contentWindow.postMessage(
        {
          type: "WEBVIEW_COMMAND",
          id: messageId,
          command: command,
          selector: selector,
          text: text,
        },
        "*",
      );
    });
  };

  // Conectar ao servidor MCP Playwright
  const connectToMcp = async () => {
    try {
      addLog(`🔌 Conectando ao MCP Server: ${mcpServerUrl}`);

      const response = await fetch("/api/mcp/playwright-hybrid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "connect",
          serverUrl: mcpServerUrl,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsMcpConnected(true);
        setAvailableTools(data.tools || []);
        setMcpMode(data.message?.includes("mock") ? "mock" : "real");
        addLog(`✅ Conectado ao MCP! Tools: ${data.tools?.join(", ")}`);
        addLog(
          `🔧 Modo: ${data.message?.includes("mock") ? "Mock (Simulação + WebView)" : "Real (Playwright MCP)"}`,
        );
      } else {
        addLog(`❌ Erro ao conectar: ${data.error}`);
      }
    } catch (error) {
      addLog(`❌ Erro na conexão: ${error}`);
    }
  };

  // Executar comando no Playwright MCP real
  const executeMcpCommand = async (toolName: string, args: any) => {
    try {
      addLog(`🎭 Executando no Playwright MCP: ${toolName}`);

      const response = await fetch("/api/mcp/playwright-hybrid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute",
          toolName: toolName,
          args: args,
        }),
      });

      const data = await response.json();

      if (data.success) {
        addLog(`✅ MCP Result: ${JSON.stringify(data.result)}`);
        return data.result;
      } else {
        addLog(`❌ MCP Error: ${data.error}`);
        return { error: data.error };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      addLog(`❌ Erro na execução MCP: ${errorMessage}`);
      return { error: errorMessage };
    }
  };

  // Ferramentas Hybrid (WebView + MCP)
  const hybridTools = {
    navigate: async (url: string) => {
      try {
        // 1. Atualizar WebView visual
        setCurrentUrl(url);
        if (iframeRef.current) {
          iframeRef.current.src = `/api/proxy?url=${encodeURIComponent(url)}`;
        }
        addLog(`🌐 WebView navegando para: ${url}`);

        // 2. Executar no Playwright MCP real
        if (isMcpConnected) {
          await executeMcpCommand("browser_navigate", { url });
          return `✅ Navegou para: ${url} (WebView + MCP)`;
        } else {
          return `✅ Navegou para: ${url} (apenas WebView)`;
        }
      } catch (error) {
        const errorMsg = `❌ Erro ao navegar: ${error}`;
        addLog(errorMsg);
        return errorMsg;
      }
    },

    click: async (selector: string) => {
      try {
        addLog(`🖱️ Clicando em: ${selector}`);

        if (isMcpConnected) {
          // Executar no MCP (real ou mock)
          const mcpResult = await executeMcpCommand("browser_click", {
            selector,
          });

          // Se for modo mock, executar também no WebView para sincronizar
          if (mcpResult && mcpResult.success) {
            try {
              addLog(`🔄 Tentando sincronizar clique com WebView...`);
              const webViewResult = await executeCommandInWebView(
                "click",
                selector,
              );
              addLog(
                `✅ WebView Click Result: ${JSON.stringify(webViewResult)}`,
              );
              addLog(`🔄 Sincronizado com WebView`);
            } catch (webViewError) {
              addLog(`⚠️ Erro na sincronização WebView: ${webViewError}`);
            }
          }

          return mcpResult.error
            ? `❌ ${mcpResult.error}`
            : `✅ Clicou em: ${selector} (MCP + WebView)`;
        } else {
          return `❌ MCP não conectado. Use apenas WebView ou conecte ao servidor.`;
        }
      } catch (error) {
        const errorMsg = `❌ Erro ao clicar: ${error}`;
        addLog(errorMsg);
        return errorMsg;
      }
    },

    type: async (selector: string, text: string) => {
      try {
        addLog(`⌨️ Digitando "${text}" em: ${selector}`);

        if (isMcpConnected) {
          // Executar no MCP (real ou mock)
          const mcpResult = await executeMcpCommand("browser_type", {
            selector,
            text,
          });

          // Se for modo mock, executar também no WebView para sincronizar
          if (mcpResult && mcpResult.success) {
            try {
              addLog(`🔄 Tentando sincronizar com WebView...`);
              const webViewResult = await executeCommandInWebView(
                "type",
                selector,
                text,
              );
              addLog(`✅ WebView Result: ${JSON.stringify(webViewResult)}`);
              addLog(`🔄 Sincronizado com WebView`);
            } catch (webViewError) {
              addLog(`⚠️ Erro na sincronização WebView: ${webViewError}`);
            }
          }

          return mcpResult.error
            ? `❌ ${mcpResult.error}`
            : `✅ Digitou "${text}" em: ${selector} (MCP + WebView)`;
        } else {
          return `❌ MCP não conectado. Use apenas WebView ou conecte ao servidor.`;
        }
      } catch (error) {
        const errorMsg = `❌ Erro ao digitar: ${error}`;
        addLog(errorMsg);
        return errorMsg;
      }
    },

    screenshot: async () => {
      try {
        addLog(`📸 Capturando screenshot...`);

        if (isMcpConnected) {
          // Usar Playwright MCP real
          const mcpResult = await executeMcpCommand("browser_screenshot", {});

          if (mcpResult.error) {
            return `❌ ${mcpResult.error}`;
          } else {
            return `✅ Screenshot capturado pelo Playwright MCP real`;
          }
        } else {
          return `❌ MCP não conectado. Screenshot requer Playwright real.`;
        }
      } catch (error) {
        const errorMsg = `❌ Erro ao capturar screenshot: ${error}`;
        addLog(errorMsg);
        return errorMsg;
      }
    },

    getTitle: async () => {
      try {
        if (isMcpConnected) {
          const mcpResult = await executeMcpCommand("browser_get_title", {});
          const title =
            mcpResult.title || mcpResult.result || "Título não encontrado";
          const message = `📄 Título (MCP Real): "${title}"`;
          addLog(message);
          return message;
        } else {
          return `❌ MCP não conectado. Use conectar ao servidor primeiro.`;
        }
      } catch (error) {
        const errorMsg = `❌ Erro ao obter título: ${error}`;
        addLog(errorMsg);
        return errorMsg;
      }
    },

    getUrl: async () => {
      try {
        if (isMcpConnected) {
          const mcpResult = await executeMcpCommand("browser_get_url", {});
          const url = mcpResult.url || mcpResult.result || "URL não encontrada";
          const message = `🔗 URL (MCP Real): ${url}`;
          addLog(message);
          return message;
        } else {
          return `❌ MCP não conectado. Use conectar ao servidor primeiro.`;
        }
      } catch (error) {
        const errorMsg = `❌ Erro ao obter URL: ${error}`;
        addLog(errorMsg);
        return errorMsg;
      }
    },
  };

  // Interpretar prompt e executar ações
  const parseAndExecutePrompt = async (prompt: string) => {
    const actions: Array<{ name: string; args: any[] }> = [];
    const lowerPrompt = prompt.toLowerCase();

    // Detectar navegação
    const urlMatch = prompt.match(/https?:\/\/[^\s]+/);
    if (
      urlMatch ||
      lowerPrompt.includes("abra") ||
      lowerPrompt.includes("navegue")
    ) {
      const url = urlMatch ? urlMatch[0] : "https://google.com";
      actions.push({ name: "navigate", args: [url] });
    }

    // Detectar clique
    if (lowerPrompt.includes("clique") || lowerPrompt.includes("click")) {
      if (lowerPrompt.includes("busca") || lowerPrompt.includes("search")) {
        actions.push({
          name: "click",
          args: ['input[name="q"], input[type="search"], #search'],
        });
      } else if (
        lowerPrompt.includes("botão") ||
        lowerPrompt.includes("button")
      ) {
        actions.push({ name: "click", args: ['button, input[type="submit"]'] });
      } else {
        actions.push({ name: "click", args: ["a, button, input"] });
      }
    }

    // Detectar digitação
    if (
      lowerPrompt.includes("digite") ||
      lowerPrompt.includes("escreva") ||
      lowerPrompt.includes("type")
    ) {
      const textMatch = prompt.match(/"([^"]+)"|'([^']+)'/);
      const text = textMatch ? textMatch[1] || textMatch[2] : "teste hybrid";
      actions.push({
        name: "type",
        args: ['input[name="q"], input[type="search"], #search', text],
      });
    }

    // Detectar informações
    if (lowerPrompt.includes("título") || lowerPrompt.includes("title")) {
      actions.push({ name: "getTitle", args: [] });
    }

    if (lowerPrompt.includes("url") || lowerPrompt.includes("endereço")) {
      actions.push({ name: "getUrl", args: [] });
    }

    if (lowerPrompt.includes("screenshot") || lowerPrompt.includes("captura")) {
      actions.push({ name: "screenshot", args: [] });
    }

    // Executar ações
    let results = "";
    for (const action of actions) {
      try {
        const tool = hybridTools[action.name as keyof typeof hybridTools];
        if (tool) {
          const result = await (tool as any)(...action.args);
          results += result + "\\n\\n";

          // Aguardar entre ações
          if (actions.length > 1) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }
      } catch (error) {
        results += `❌ Erro na ação ${action.name}: ${error}\\n\\n`;
      }
    }

    return results || "❌ Nenhuma ação reconhecida no prompt";
  };

  // Executar teste
  const executeTest = async () => {
    setIsLoading(true);
    setTestResult("🚀 Executando teste Hybrid...");

    try {
      const result = await parseAndExecutePrompt(testPrompt);
      setTestResult(result);
    } catch (error) {
      setTestResult(`❌ Erro no teste: ${error}`);
    }

    setIsLoading(false);
  };

  // Verificar se WebView está pronto
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "WEBVIEW_READY") {
        setIsWebViewReady(true);
        addLog("✅ WebView está pronto!");
      }
    };

    window.addEventListener("message", handleMessage);

    // Fallback
    const timer = setTimeout(() => {
      if (iframeRef.current?.contentWindow) {
        setIsWebViewReady(true);
        addLog("✅ WebView inicializado (fallback)");
      }
    }, 3000);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          🎭 Playwright Hybrid (WebView + MCP Real)
        </h1>
        <p className="text-muted-foreground mt-2">
          Visualização no WebView + Controle via Playwright MCP Real
        </p>
      </div>

      {/* Status */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card
          className={`border-2 ${isWebViewReady ? "border-green-200 dark:border-green-800" : "border-yellow-200 dark:border-yellow-800"}`}
        >
          <CardHeader>
            <CardTitle
              className={isWebViewReady ? "text-green-600" : "text-yellow-600"}
            >
              {isWebViewReady
                ? "✅ WebView Pronto"
                : "⏳ Inicializando WebView"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>🖥️ Visualização embutida</div>
            <div>📱 Interface responsiva</div>
            <div>🔄 Sincronização automática</div>
          </CardContent>
        </Card>

        <Card
          className={`border-2 ${isMcpConnected ? "border-green-200 dark:border-green-800" : "border-red-200 dark:border-red-800"}`}
        >
          <CardHeader>
            <CardTitle
              className={isMcpConnected ? "text-green-600" : "text-red-600"}
            >
              {isMcpConnected ? "✅ MCP Conectado" : "❌ MCP Desconectado"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>🎭 Playwright Engine Real</div>
            <div>
              🔧 Tools:{" "}
              {availableTools.length > 0
                ? availableTools.join(", ")
                : "Nenhuma"}
            </div>
            <div>🌐 Server: {mcpServerUrl}</div>
          </CardContent>
        </Card>
      </div>

      {/* Configuração MCP */}
      <Card>
        <CardHeader>
          <CardTitle>🔌 Configuração MCP Server</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="mcp-server-url">
              URL do Servidor MCP Playwright
            </Label>
            <Input
              id="mcp-server-url"
              value={mcpServerUrl}
              onChange={(e) => setMcpServerUrl(e.target.value)}
              placeholder="http://localhost:3001"
            />
          </div>

          <Button
            onClick={connectToMcp}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isMcpConnected ? "🔄 Reconectar" : "🔌 Conectar ao MCP"}
          </Button>
        </CardContent>
      </Card>

      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle>🎮 Controles Hybrid</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="current-url">URL para WebView</Label>
            <Input
              id="current-url"
              value={currentUrl}
              onChange={(e) => setCurrentUrl(e.target.value)}
              placeholder="https://google.com"
            />
          </div>

          <div>
            <Label htmlFor="test-prompt">Comando para Executar</Label>
            <Textarea
              id="test-prompt"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Ex: Abra o Google, clique no campo de busca e digite 'playwright hybrid test'"
              rows={3}
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => hybridTools.navigate(currentUrl)}
              variant="outline"
              className="border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              🌐 Navegar WebView
            </Button>

            <Button
              onClick={executeTest}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "Executando..." : "🚀 Executar Hybrid"}
            </Button>

            <Button
              onClick={() => hybridTools.screenshot()}
              variant="outline"
              disabled={!isMcpConnected}
            >
              📸 Screenshot MCP
            </Button>

            <Button
              onClick={() => hybridTools.getTitle()}
              variant="outline"
              disabled={!isMcpConnected}
            >
              📄 Título MCP
            </Button>

            <Button
              onClick={async () => {
                try {
                  addLog("🧪 Testando WebView direto...");
                  const result = await executeCommandInWebView("test");
                  addLog(`✅ Teste WebView: ${JSON.stringify(result)}`);
                } catch (error) {
                  addLog(`❌ Erro teste WebView: ${error}`);
                }
              }}
              variant="outline"
              className="border-orange-200 text-orange-600 hover:bg-orange-50"
            >
              🧪 Testar WebView
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* WebView */}
      <Card>
        <CardHeader>
          <CardTitle>🖥️ WebView (Visualização)</CardTitle>
          <CardDescription>
            Browser embutido para visualização - controle via MCP Real
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden bg-white">
            <div className="bg-gray-100 p-2 text-sm font-mono text-gray-600 border-b flex justify-between">
              <span>{currentUrl}</span>
              <span className="text-xs">
                {isMcpConnected
                  ? mcpMode === "mock"
                    ? "🎭 MCP Mock + WebView"
                    : "🎭 MCP Real"
                  : "❌ MCP Offline"}
              </span>
            </div>
            <iframe
              ref={iframeRef}
              src={`/api/proxy?url=${encodeURIComponent(currentUrl)}`}
              className="w-full h-96 border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              onLoad={() => {
                setIsWebViewReady(true);
                addLog("🌐 Página carregada no WebView");
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Resultado */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle>📄 Resultado</CardTitle>
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

      {/* Vantagens */}
      <Card className="border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="text-purple-600">
            ✨ Vantagens do Hybrid
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            🎭 <strong>Playwright Real:</strong> Engine completo via MCP
          </p>
          <p>
            🖥️ <strong>Visualização:</strong> WebView embutido para feedback
          </p>
          <p>
            🔄 <strong>Sincronização:</strong> WebView atualiza após comandos
            MCP
          </p>
          <p>
            🚫 <strong>Sem instalação:</strong> Cliente não precisa instalar
            nada
          </p>
          <p>
            🌐 <strong>HTTP Transport:</strong> MCP via API, não stdio
          </p>
          <p>
            ⚡ <strong>Melhor dos mundos:</strong> Visual + Poder real
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
