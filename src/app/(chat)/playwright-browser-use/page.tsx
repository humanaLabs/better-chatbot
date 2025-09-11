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

export default function PlaywrightBrowserUsePage() {
  const [browserUseUrl, setBrowserUseUrl] = useState("http://localhost:7788");
  const [testPrompt, setTestPrompt] = useState(
    "Navigate to Google and search for 'browser-use playwright'",
  );
  const [testResult, setTestResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [isBrowserUseConnected, setIsBrowserUseConnected] = useState(false);
  const [browserUseStatus, setBrowserUseStatus] = useState<any>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Adicionar log
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setExecutionLog((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  // Conectar ao Browser-use
  const connectToBrowserUse = async () => {
    try {
      addLog(`🔌 Conectando ao Browser-use: ${browserUseUrl}`);

      // Verificar se Browser-use está rodando
      const response = await fetch(`${browserUseUrl}/api/status`, {
        method: "GET",
      });

      if (response.ok) {
        const status = await response.json();
        setIsBrowserUseConnected(true);
        setBrowserUseStatus(status);
        addLog(`✅ Conectado ao Browser-use!`);
        addLog(`🎭 Status: ${JSON.stringify(status)}`);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      addLog(`❌ Erro ao conectar: ${error}`);
      addLog(
        `💡 Certifique-se que Browser-use está rodando em ${browserUseUrl}`,
      );
      setIsBrowserUseConnected(false);
    }
  };

  // Executar comando no Browser-use
  const executeBrowserUseCommand = async (prompt: string) => {
    try {
      addLog(`🎭 Executando no Browser-use: ${prompt}`);

      const response = await fetch(`${browserUseUrl}/api/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt,
          model: "gpt-4", // ou outro modelo configurado
          max_steps: 10,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        addLog(`✅ Browser-use Result: ${JSON.stringify(result)}`);
        return result;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      addLog(`❌ Erro na execução: ${errorMessage}`);
      return { error: errorMessage };
    }
  };

  // Executar teste
  const executeTest = async () => {
    setIsLoading(true);
    setTestResult("🚀 Executando no Browser-use...");

    try {
      if (!isBrowserUseConnected) {
        setTestResult("❌ Browser-use não conectado. Conecte primeiro.");
        return;
      }

      const result = await executeBrowserUseCommand(testPrompt);

      if (result.error) {
        setTestResult(`❌ Erro: ${result.error}`);
      } else {
        setTestResult(
          `✅ Executado com sucesso!\n\n${JSON.stringify(result, null, 2)}`,
        );
      }
    } catch (error) {
      setTestResult(`❌ Erro no teste: ${error}`);
    }

    setIsLoading(false);
  };

  // Verificar status periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      if (isBrowserUseConnected) {
        connectToBrowserUse();
      }
    }, 30000); // A cada 30 segundos

    return () => clearInterval(interval);
  }, [isBrowserUseConnected, browserUseUrl]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          🔥 Playwright Browser-use Integration
        </h1>
        <p className="text-muted-foreground mt-2">
          Integração com browser-use - a melhor solução de automação web com IA
        </p>
      </div>

      {/* Status */}
      <Card
        className={`border-2 ${isBrowserUseConnected ? "border-green-200 dark:border-green-800" : "border-red-200 dark:border-red-800"}`}
      >
        <CardHeader>
          <CardTitle
            className={
              isBrowserUseConnected ? "text-green-600" : "text-red-600"
            }
          >
            {isBrowserUseConnected
              ? "✅ Browser-use Conectado"
              : "❌ Browser-use Offline"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            🎭 <strong>Browser-use WebUI:</strong> Interface Gradio profissional
          </div>
          <div>
            🤖 <strong>Multi-LLM:</strong> OpenAI, Anthropic, Google, Ollama
          </div>
          <div>
            🖥️ <strong>Browser Real:</strong> Usa seu Chrome/Firefox
          </div>
          <div>
            📹 <strong>Screen Recording:</strong> Gravação HD das ações
          </div>
          <div>
            🔄 <strong>Sessões Persistentes:</strong> Mantém login entre tarefas
          </div>
          {browserUseStatus && (
            <div>
              📊 <strong>Status:</strong> {JSON.stringify(browserUseStatus)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuração */}
      <Card>
        <CardHeader>
          <CardTitle>🔌 Configuração Browser-use</CardTitle>
          <CardDescription>
            Configure a conexão com o servidor Browser-use
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="browser-use-url">URL do Browser-use WebUI</Label>
            <Input
              id="browser-use-url"
              value={browserUseUrl}
              onChange={(e) => setBrowserUseUrl(e.target.value)}
              placeholder="http://localhost:7788"
            />
          </div>

          <Button
            onClick={connectToBrowserUse}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isBrowserUseConnected
              ? "🔄 Reconectar"
              : "🔌 Conectar ao Browser-use"}
          </Button>
        </CardContent>
      </Card>

      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle>🎮 Controles de Automação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="test-prompt">Comando em Linguagem Natural</Label>
            <Textarea
              id="test-prompt"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Ex: Navigate to Google and search for 'browser automation'"
              rows={3}
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={executeTest}
              disabled={isLoading || !isBrowserUseConnected}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "Executando..." : "🚀 Executar com Browser-use"}
            </Button>

            <Button
              onClick={() => window.open(browserUseUrl, "_blank")}
              variant="outline"
              className="border-purple-200 text-purple-600 hover:bg-purple-50"
            >
              🌐 Abrir Browser-use WebUI
            </Button>

            <Button
              onClick={() =>
                window.open(
                  `${browserUseUrl.replace("7788", "6080")}/vnc.html`,
                  "_blank",
                )
              }
              variant="outline"
              className="border-orange-200 text-orange-600 hover:bg-orange-50"
            >
              📹 Abrir VNC Viewer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Browser-use WebUI Embed */}
      <Card>
        <CardHeader>
          <CardTitle>🖥️ Browser-use WebUI (Embutido)</CardTitle>
          <CardDescription>
            Interface Gradio do Browser-use embutida
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden bg-white">
            <div className="bg-gray-100 p-2 text-sm font-mono text-gray-600 border-b flex justify-between">
              <span>{browserUseUrl}</span>
              <span className="text-xs">
                {isBrowserUseConnected ? "🔥 Browser-use Ativo" : "❌ Offline"}
              </span>
            </div>
            <iframe
              ref={iframeRef}
              src={browserUseUrl}
              className="w-full h-96 border-0"
              onLoad={() => {
                addLog("🌐 Browser-use WebUI carregado");
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

      {/* Instruções de Instalação */}
      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-600">
            📚 Como Instalar Browser-use
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <strong>1. Clonar repositório:</strong>
            <pre className="bg-gray-100 p-2 rounded mt-1 text-xs">
              git clone https://github.com/browser-use/web-ui.git cd web-ui
            </pre>
          </div>
          <div>
            <strong>2. Instalar dependências:</strong>
            <pre className="bg-gray-100 p-2 rounded mt-1 text-xs">
              uv venv --python 3.11 source .venv/bin/activate # Linux/Mac
              .venv\Scripts\activate # Windows uv pip install -r
              requirements.txt playwright install --with-deps
            </pre>
          </div>
          <div>
            <strong>3. Configurar .env:</strong>
            <pre className="bg-gray-100 p-2 rounded mt-1 text-xs">
              cp .env.example .env # Adicionar suas API keys (OpenAI, Anthropic,
              etc.)
            </pre>
          </div>
          <div>
            <strong>4. Rodar WebUI:</strong>
            <pre className="bg-gray-100 p-2 rounded mt-1 text-xs">
              python webui.py --ip 127.0.0.1 --port 7788
            </pre>
          </div>
          <div>
            <strong>5. Acessar:</strong>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>
                WebUI: <code>http://localhost:7788</code>
              </li>
              <li>
                VNC Viewer: <code>http://localhost:6080/vnc.html</code>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Vantagens */}
      <Card className="border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-green-600">
            🔥 Vantagens do Browser-use
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            🎭 <strong>Projeto Maduro:</strong> 14.8k stars, comunidade ativa
          </p>
          <p>
            🤖 <strong>Multi-LLM:</strong> OpenAI, Anthropic, Google, Ollama,
            DeepSeek
          </p>
          <p>
            🖥️ <strong>Browser Real:</strong> Usa seu Chrome/Firefox existente
          </p>
          <p>
            🔄 <strong>Sessões Persistentes:</strong> Mantém login entre tarefas
          </p>
          <p>
            📹 <strong>Screen Recording:</strong> Gravação HD das ações
          </p>
          <p>
            🐳 <strong>Docker Support:</strong> Deploy fácil com VNC
          </p>
          <p>
            🎯 <strong>Linguagem Natural:</strong> Comandos em inglês simples
          </p>
          <p>
            ⚡ <strong>Performance:</strong> Otimizado para automação web
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
