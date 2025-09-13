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

export default function PlaywrightHybridPage() {
  const [currentUrl, setCurrentUrl] = useState("https://google.com");
  const [mcpServerUrl, setMcpServerUrl] = useState("http://localhost:3001");
  const [testPrompt, setTestPrompt] = useState(
    "Abra o Google, clique no campo de busca e digite 'playwright hybrid test'",
  );
  const [testResult, setTestResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [isBrowserReady, setIsBrowserReady] = useState(false);
  const [isMcpConnected, setIsMcpConnected] = useState(false);
  const [availableTools, setAvailableTools] = useState<string[]>([]);
  const [, setMcpMode] = useState<"none" | "mock" | "real">("none");

  // Removido: não precisamos mais de iframe

  // Adicionar log
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setExecutionLog((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  // Removido: não precisamos mais de WebView - tudo acontece no navegador real

  // Conectar ao Desktop Agent
  const connectToMcp = async () => {
    try {
      addLog(`🔍 Procurando Desktop Agent...`);
      setIsMcpConnected(false);
      setAvailableTools([]);
      setMcpMode("none");

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
        setMcpMode("real");
        addLog(`✅ ${data.message}`);
        addLog(`🔧 Tools disponíveis: ${data.tools?.join(", ")}`);

        if (data.agentType === "REAL_DESKTOP_AGENT") {
          addLog(`🎭 Desktop Agent REAL conectado!`);
          addLog(`📡 Porta: ${data.agentInfo?.port || "desconhecida"}`);
          addLog(
            `🖥️ Navegador: ${data.agentInfo?.playwright || "inicializando"}`,
          );
        }
      } else {
        setIsMcpConnected(false);
        addLog(`❌ ${data.error}`);

        if (data.instructions) {
          addLog(`💡 Instruções:`);
          data.instructions.forEach((instruction: string, _index: number) => {
            addLog(`   ${instruction}`);
          });
        }
      }
    } catch (error) {
      setIsMcpConnected(false);
      addLog(`❌ Erro na conexão: ${error}`);
      addLog(`💡 Certifique-se de que o Desktop Agent está rodando!`);
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
        // Atualizar URL atual
        setCurrentUrl(url);
        addLog(`🌐 Abrindo navegador e navegando para: ${url}`);

        if (isMcpConnected) {
          // Executar no Desktop Agent (navegador real)
          addLog(`🔍 Verificando se navegador está aberto...`);
          const mcpResult = await executeMcpCommand("browser_navigate", {
            url,
          });

          if (mcpResult && mcpResult.success) {
            addLog(`✅ Navegador aberto e navegação executada`);
            setIsBrowserReady(true);
          } else {
            addLog(
              `⚠️ Possível problema: ${mcpResult.error || "Navegador pode não estar aberto"}`,
            );
          }

          return mcpResult.error
            ? `❌ ${mcpResult.error}`
            : `✅ Navegador aberto em: ${url}`;
        } else {
          return `❌ Desktop Agent não conectado. Conecte primeiro.`;
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
          // Executar no MCP (navegador real)
          const mcpResult = await executeMcpCommand("browser_click", {
            selector,
          });

          if (mcpResult && mcpResult.success) {
            addLog(`✅ Clique executado no navegador real`);
          }

          return mcpResult.error
            ? `❌ ${mcpResult.error}`
            : `✅ Clicou em: ${selector} (Navegador Real)`;
        } else {
          return `❌ Desktop Agent não conectado. Conecte primeiro.`;
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
          // Executar no MCP (navegador real)
          const mcpResult = await executeMcpCommand("browser_type", {
            selector,
            text,
          });

          if (mcpResult && mcpResult.success) {
            addLog(`✅ Texto digitado no navegador real`);
          }

          return mcpResult.error
            ? `❌ ${mcpResult.error}`
            : `✅ Digitou "${text}" em: ${selector} (Navegador Real)`;
        } else {
          return `❌ Desktop Agent não conectado. Conecte primeiro.`;
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
          // Usar Desktop Agent real
          const mcpResult = await executeMcpCommand("browser_screenshot", {});

          if (mcpResult.error) {
            return `❌ ${mcpResult.error}`;
          } else {
            return `✅ Screenshot capturado pelo navegador real`;
          }
        } else {
          return `❌ Desktop Agent não conectado. Screenshot requer navegador real.`;
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
          const message = `📄 Título (Navegador Real): "${title}"`;
          addLog(message);
          return message;
        } else {
          return `❌ Desktop Agent não conectado. Conecte primeiro.`;
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
          const message = `🔗 URL (Navegador Real): ${url}`;
          addLog(message);
          return message;
        } else {
          return `❌ Desktop Agent não conectado. Conecte primeiro.`;
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
          args: [
            'textarea[name="q"], input[name="q"], [aria-label*="Pesquisar"], [title*="Pesquisar"]',
          ],
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
        args: [
          'textarea[name="q"], input[name="q"], [aria-label*="Pesquisar"], [title*="Pesquisar"]',
          text,
        ],
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

  // Verificar se Desktop Agent está conectado
  useEffect(() => {
    if (isMcpConnected) {
      setIsBrowserReady(true);
      addLog("✅ Desktop Agent conectado - navegador pronto!");
    } else {
      setIsBrowserReady(false);
    }
  }, [isMcpConnected]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          🎭 Playwright Hybrid (Desktop Agent)
        </h1>
        <p className="text-muted-foreground mt-2">
          Controle do navegador local via Desktop Agent
        </p>
      </div>

      {/* Status */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card
          className={`border-2 ${isBrowserReady ? "border-green-200 dark:border-green-800" : "border-yellow-200 dark:border-yellow-800"}`}
        >
          <CardHeader>
            <CardTitle
              className={isBrowserReady ? "text-green-600" : "text-yellow-600"}
            >
              {isBrowserReady
                ? "✅ Navegador Pronto"
                : "⏳ Aguardando Navegador"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>🖥️ Chrome/Firefox local</div>
            <div>📱 Controle via IA</div>
            <div>🔄 Tempo real</div>
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

      {/* Configuração Desktop Agent */}
      <Card>
        <CardHeader>
          <CardTitle>🔌 Conexão Desktop Agent</CardTitle>
          <CardDescription>
            Conecte-se ao Desktop Agent rodando no seu computador
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="mcp-server-url">
              URL do Servidor (opcional - use para tunnel ou servidor remoto)
            </Label>
            <Input
              id="mcp-server-url"
              value={mcpServerUrl}
              onChange={(e) => setMcpServerUrl(e.target.value)}
              placeholder="https://1c72bdd72f34.ngrok-free.app/"
            />
            <p className="text-xs text-muted-foreground mt-1">
              ℹ️ Se não especificado, tentará automaticamente localhost:8768 e
              8766. Para usar tunnel (ngrok/cloudflare), cole a URL completa
              aqui.
            </p>
          </div>

          <Button
            onClick={connectToMcp}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isMcpConnected ? "🔄 Reconectar" : "🔍 Procurar Desktop Agent"}
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
              🌐 Abrir Navegador
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
                  addLog("🧪 Testando Desktop Agent...");
                  const result = await hybridTools.getTitle();
                  addLog(`✅ Teste Desktop Agent: ${result}`);
                } catch (error) {
                  addLog(`❌ Erro teste Desktop Agent: ${error}`);
                }
              }}
              variant="outline"
              className="border-orange-200 text-orange-600 hover:bg-orange-50"
            >
              🧪 Testar Desktop Agent
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status do Navegador Local */}
      <Card>
        <CardHeader>
          <CardTitle>🖥️ Navegador Local do Usuário</CardTitle>
          <CardDescription>
            O Desktop Agent controla o Chrome/Firefox instalado no seu
            computador
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
            <div className="bg-gray-100 dark:bg-gray-800 p-3 text-sm font-mono text-gray-600 dark:text-gray-300 border-b flex justify-between items-center">
              <span className="flex items-center gap-2">
                🌐 <strong>Navegador Real:</strong> {currentUrl}
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                {isMcpConnected ? "🎭 Desktop Agent Ativo" : "❌ Offline"}
              </span>
            </div>

            <div className="p-6 text-center">
              <div className="mb-4">
                <div className="text-6xl mb-4">🖥️</div>
                <h3 className="text-xl font-semibold mb-2">
                  Navegador Aberto no Seu Computador
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Todas as ações acontecem no seu navegador real. Você pode ver
                  e interagir diretamente!
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border">
                  <div className="text-2xl mb-2">👀</div>
                  <div className="font-semibold">Visualização Real</div>
                  <div className="text-gray-500">Veja tudo acontecendo</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border">
                  <div className="text-2xl mb-2">🎮</div>
                  <div className="font-semibold">Controle Total</div>
                  <div className="text-gray-500">Via comandos de IA</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border">
                  <div className="text-2xl mb-2">🔒</div>
                  <div className="font-semibold">100% Local</div>
                  <div className="text-gray-500">Dados não saem do PC</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border">
                  <div className="text-2xl mb-2">⚡</div>
                  <div className="font-semibold">Performance</div>
                  <div className="text-gray-500">Velocidade nativa</div>
                </div>
              </div>

              {isMcpConnected && (
                <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-green-700 dark:text-green-300 font-semibold">
                    ✅ Desktop Agent Conectado!
                  </div>
                  <div className="text-green-600 dark:text-green-400 text-sm">
                    Seu navegador está pronto para receber comandos
                  </div>
                </div>
              )}
            </div>
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
            ✨ Vantagens do Desktop Agent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            🎭 <strong>Playwright Real:</strong> Engine completo no seu PC
          </p>
          <p>
            🖥️ <strong>Navegador Local:</strong> Chrome/Firefox do usuário
          </p>
          <p>
            👀 <strong>Visualização Direta:</strong> Veja tudo acontecendo em
            tempo real
          </p>
          <p>
            🔒 <strong>100% Local:</strong> Dados não saem do seu computador
          </p>
          <p>
            ⚡ <strong>Performance Nativa:</strong> Velocidade máxima
          </p>
          <p>
            🌐 <strong>HTTP API:</strong> Comunicação simples e confiável
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
