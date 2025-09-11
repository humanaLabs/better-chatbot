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

export default function PlaywrightIframePage() {
  const [isConnected, setIsConnected] = useState(false);
  const [testUrl, setTestUrl] = useState("https://httpbin.org/html");
  const [testPrompt, setTestPrompt] = useState("Clique no primeiro link");
  const [testResult, setTestResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Estado para comunicação com iframe
  const [pendingCommands, setPendingCommands] = useState<
    Map<
      string,
      { resolve: (value: any) => void; reject: (reason?: any) => void }
    >
  >(new Map());

  // Listener para mensagens do iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "PLAYWRIGHT_IFRAME_RESULT") {
        const { id, result } = event.data;
        const pending = pendingCommands.get(id);
        if (pending) {
          pending.resolve(result);
          setPendingCommands((prev) => {
            const newMap = new Map(prev);
            newMap.delete(id);
            return newMap;
          });
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [pendingCommands]);

  // Função para enviar comando para iframe
  const sendIframeCommand = (command: string, args: any[]): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!iframeRef.current?.contentWindow) {
        reject(new Error("Iframe não acessível"));
        return;
      }

      const id = `cmd_${Date.now()}_${Math.random()}`;

      setPendingCommands((prev) => {
        const newMap = new Map(prev);
        newMap.set(id, { resolve, reject });
        return newMap;
      });

      // Timeout para comandos
      setTimeout(() => {
        setPendingCommands((prev) => {
          const newMap = new Map(prev);
          if (newMap.has(id)) {
            newMap.delete(id);
            reject(new Error("Timeout: comando não respondeu"));
          }
          return newMap;
        });
      }, 10000);

      // Enviar comando
      iframeRef.current.contentWindow.postMessage(
        {
          type: "PLAYWRIGHT_IFRAME_COMMAND",
          command,
          args,
          id,
        },
        "*",
      );
    });
  };

  // Ferramentas que funcionam via iframe com proxy
  const iframeTools = {
    navigate: async (url: string) => {
      if (iframeRef.current) {
        iframeRef.current.src = `/api/proxy?url=${encodeURIComponent(url)}`;
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return `✅ Navegou para: ${url}`;
      }
      return "❌ Iframe não disponível";
    },

    click: async (selector: string) => {
      try {
        const result = await sendIframeCommand("click", [selector]);
        if (result.success) {
          return `✅ ${result.message}`;
        } else {
          return `❌ ${result.message}`;
        }
      } catch (error) {
        return `❌ Erro ao clicar: ${error instanceof Error ? error.message : error}`;
      }
    },

    type: async (selector: string, text: string) => {
      try {
        const result = await sendIframeCommand("type", [selector, text]);
        if (result.success) {
          return `✅ ${result.message}`;
        } else {
          return `❌ ${result.message}`;
        }
      } catch (error) {
        return `❌ Erro ao digitar: ${error instanceof Error ? error.message : error}`;
      }
    },

    getTitle: async () => {
      try {
        const result = await sendIframeCommand("getTitle", []);
        if (result.success) {
          return `📄 Título: "${result.title}"`;
        } else {
          return `❌ Erro ao obter título`;
        }
      } catch (error) {
        return `❌ Erro ao obter título: ${error instanceof Error ? error.message : error}`;
      }
    },

    screenshot: async () => {
      try {
        const result = await sendIframeCommand("screenshot", []);
        if (result.success) {
          return `✅ ${result.message}`;
        } else {
          return `❌ ${result.message}`;
        }
      } catch (error) {
        return `❌ Erro ao capturar screenshot: ${error instanceof Error ? error.message : error}`;
      }
    },
  };

  const connectToIframe = async () => {
    try {
      setIsLoading(true);
      setIsConnected(true);
      setTestResult("✅ Iframe Playwright ativo!");
      setExecutionLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Iframe Playwright inicializado`,
      ]);
    } catch (error) {
      setTestResult(`❌ Erro: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectFromIframe = () => {
    setIsConnected(false);
    setTestResult("");
    setExecutionLog([]);
    if (iframeRef.current) {
      iframeRef.current.src = "about:blank";
    }
  };

  const parsePrompt = (prompt: string) => {
    const actions: Array<{ name: string; args: any }> = [];
    const lowerPrompt = prompt.toLowerCase();

    // Detectar navegação
    if (lowerPrompt.includes("navegue") || lowerPrompt.includes("abra")) {
      const urlMatch = prompt.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        actions.push({ name: "navigate", args: [urlMatch[0]] });
      } else if (lowerPrompt.includes("httpbin")) {
        actions.push({ name: "navigate", args: ["https://httpbin.org/html"] });
      } else {
        actions.push({ name: "navigate", args: [testUrl] });
      }
    }

    // Detectar cliques
    if (lowerPrompt.includes("clique") || lowerPrompt.includes("click")) {
      if (lowerPrompt.includes("link") || lowerPrompt.includes("primeiro")) {
        actions.push({ name: "click", args: ["a"] });
      } else if (
        lowerPrompt.includes("botão") ||
        lowerPrompt.includes("button")
      ) {
        actions.push({ name: "click", args: ["button"] });
      } else {
        actions.push({
          name: "click",
          args: ["a, button, input[type='submit']"],
        });
      }
    }

    // Detectar digitação
    if (lowerPrompt.includes("digite") || lowerPrompt.includes("escreva")) {
      const textMatch = prompt.match(/"([^"]+)"/);
      const text = textMatch ? textMatch[1] : "teste";
      actions.push({
        name: "type",
        args: ["input[type='text'], textarea", text],
      });
    }

    // Detectar título
    if (lowerPrompt.includes("título") || lowerPrompt.includes("title")) {
      actions.push({ name: "getTitle", args: [] });
    }

    // Detectar screenshot
    if (lowerPrompt.includes("screenshot") || lowerPrompt.includes("captura")) {
      actions.push({ name: "screenshot", args: [] });
    }

    return actions;
  };

  const executeIframeTest = async () => {
    if (!isConnected) {
      setTestResult("❌ Iframe não conectado");
      return;
    }

    try {
      setIsLoading(true);
      setTestResult("🚀 Executando ações...");

      const actions = parsePrompt(testPrompt);
      const results: string[] = [];

      setExecutionLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Iniciando: ${testPrompt}`,
      ]);

      for (const action of actions) {
        const tool = iframeTools[action.name as keyof typeof iframeTools];
        if (tool) {
          setExecutionLog((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] Executando: ${action.name}(${JSON.stringify(action.args)})`,
          ]);

          const result = await (tool as any)(...action.args);
          results.push(`${action.name}: ${result}`);

          setExecutionLog((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] Resultado: ${result}`,
          ]);

          // Aguardar entre ações
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      setTestResult(`✅ Execução concluída!\n\n${results.join("\n\n")}`);
      setExecutionLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Execução concluída!`,
      ]);
    } catch (error) {
      const errorMsg = `❌ Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`;
      setTestResult(errorMsg);
      setExecutionLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ${errorMsg}`,
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">🖼️ Playwright Iframe (Sem CORS)</h1>
        <p className="text-muted-foreground mt-2">
          Controle páginas web via iframe com proxy - contorna CORS
          completamente
        </p>
      </div>

      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle>🎮 Controles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="test-url">URL para Testar</Label>
            <Input
              id="test-url"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              placeholder="https://httpbin.org/html"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={connectToIframe}
              disabled={isLoading || isConnected}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? "Conectando..." : "🚀 Ativar Iframe"}
            </Button>
            <Button
              variant="outline"
              onClick={disconnectFromIframe}
              disabled={!isConnected}
            >
              ⏹️ Desativar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Iframe de Controle */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>🖼️ Página Controlada</CardTitle>
            <CardDescription>
              Esta página está sendo controlada pelo Playwright
            </CardDescription>
          </CardHeader>
          <CardContent>
            <iframe
              ref={iframeRef}
              src={`/api/proxy?url=${encodeURIComponent(testUrl)}`}
              className="w-full h-96 border rounded"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </CardContent>
        </Card>
      )}

      {/* Teste de Comandos */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>🎯 Teste de Comandos</CardTitle>
            <CardDescription>
              Execute comandos Playwright no iframe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="test-prompt">Comando</Label>
              <Textarea
                id="test-prompt"
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                placeholder="Ex: Navegue para httpbin e clique no primeiro link"
                rows={3}
              />
            </div>

            <Button
              onClick={executeIframeTest}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? "🔄 Executando..." : "🚀 Executar Comando"}
            </Button>

            {testResult && (
              <div>
                <Label>Resultado</Label>
                <Textarea
                  value={testResult}
                  readOnly
                  rows={8}
                  className="mt-2 font-mono text-sm"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Log de Execução */}
      {executionLog.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📋 Log de Execução</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-60 overflow-y-auto">
              {executionLog.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instruções */}
      <Card className="border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="text-purple-600">🔧 Como Funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>1. Iframe Sandbox:</strong> Carrega páginas em iframe
            controlado
          </p>
          <p>
            <strong>2. Proxy API:</strong> Contorna CORS via servidor proxy
          </p>
          <p>
            <strong>3. Script Injection:</strong> Injeta código de controle nas
            páginas
          </p>
          <p>
            <strong>4. Sem CORS:</strong> Funciona com qualquer site
          </p>
          <p>
            <strong>5. Controle Real:</strong> Cliques, digitação e navegação
            reais
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
