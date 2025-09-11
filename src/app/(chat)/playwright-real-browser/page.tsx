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
// import { Badge } from "@/components/ui/badge"; // Não utilizado

export default function PlaywrightRealBrowserPage() {
  const [sessionId, setSessionId] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState("");
  const [targetUrl, setTargetUrl] = useState("https://www.google.com");
  const [testSelector, setTestSelector] = useState("input[name='q']");
  const [testText, setTestText] = useState("playwright automation");

  // Adicionar log
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setExecutionLog((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  // Conectar ao Real Browser
  const connectToRealBrowser = async () => {
    try {
      setIsLoading(true);
      addLog("🚀 Conectando ao Real Browser Controller...");

      const response = await fetch("/api/mcp/real-browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "connect",
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSessionId(result.sessionId);
        setIsConnected(true);
        addLog(`✅ Conectado! Session: ${result.sessionId}`);
        addLog(`🌐 Tipo: ${result.type}`);
        addLog(`🔧 Capabilities: ${result.capabilities.join(", ")}`);
      } else {
        addLog(`❌ Erro: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Erro na conexão: ${error}`);
    }

    setIsLoading(false);
  };

  // Executar script no browser
  const executeScript = async (command: string, args: any = {}) => {
    try {
      setIsLoading(true);
      addLog(`🔧 Executando: ${command}`);

      const response = await fetch("/api/mcp/real-browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute",
          sessionId: sessionId,
          command: command,
          args: args,
        }),
      });

      const result = await response.json();

      if (result.success && result.script) {
        addLog(`📜 Script gerado para: ${command}`);

        // Executar script no browser
        try {
          const scriptResult = eval(`(function() { ${result.script} })()`);
          addLog(`✅ Resultado: ${JSON.stringify(scriptResult)}`);
          setTestResult(JSON.stringify(scriptResult, null, 2));
          return scriptResult;
        } catch (execError) {
          addLog(`❌ Erro na execução: ${execError}`);
          setTestResult(`❌ Erro na execução: ${execError}`);
          return null;
        }
      } else {
        addLog(`❌ Erro: ${result.error}`);
        setTestResult(`❌ Erro: ${result.error}`);
        return null;
      }
    } catch (error) {
      addLog(`❌ Erro na requisição: ${error}`);
      setTestResult(`❌ Erro: ${error}`);
      return null;
    }

    setIsLoading(false);
  };

  // Abrir janela
  const openWindow = () => {
    executeScript("open_window", { url: targetUrl });
  };

  // Navegar
  const navigate = () => {
    executeScript("navigate", { url: targetUrl });
  };

  // Injetar script de controle
  const injectController = () => {
    executeScript("inject_script", {});
  };

  // Executar comando
  const executeCommand = (action: string) => {
    const args = {
      action: action,
      selector: testSelector,
      text: testText,
    };
    executeScript("execute_command", args);
  };

  // Fechar janela
  const closeWindow = () => {
    executeScript("close_window", {});
  };

  // Teste automático completo
  const runFullTest = async () => {
    if (!isConnected) {
      addLog("❌ Conecte primeiro");
      return;
    }

    addLog("🤖 Iniciando teste automático REAL...");

    // Sequência de comandos reais
    await executeScript("open_window", { url: targetUrl });
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await executeScript("inject_script", {});
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await executeScript("execute_command", {
      action: "click",
      selector: testSelector,
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await executeScript("execute_command", {
      action: "type",
      selector: testSelector,
      text: testText,
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await executeScript("execute_command", { action: "getTitle" });
    await executeScript("execute_command", { action: "getUrl" });

    addLog("🎉 Teste automático REAL concluído!");
  };

  // Verificar status
  const checkStatus = async () => {
    try {
      const response = await fetch("/api/mcp/real-browser", {
        method: "GET",
      });

      const result = await response.json();

      if (result.success) {
        addLog(`📊 Servidor ativo: ${result.activeSessions} sessões`);
        addLog(`🔧 Features: ${result.features.join(", ")}`);
      }
    } catch (error) {
      addLog(`❌ Erro ao verificar status: ${error}`);
    }
  };

  // Verificar status ao carregar
  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          🌐 Playwright Real Browser Controller
        </h1>
        <p className="text-muted-foreground mt-2">
          Controle REAL do browser - abre janelas e executa ações de verdade!
        </p>
      </div>

      {/* Status da Conexão */}
      <Card
        className={`border-2 ${isConnected ? "border-green-200 dark:border-green-800" : "border-red-200 dark:border-red-800"}`}
      >
        <CardHeader>
          <CardTitle
            className={isConnected ? "text-green-600" : "text-red-600"}
          >
            {isConnected
              ? "✅ Real Browser Conectado"
              : "❌ Real Browser Desconectado"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {isConnected ? (
            <>
              <div>
                🆔 <strong>Session ID:</strong> {sessionId}
              </div>
              <div>
                🌐 <strong>Tipo:</strong> Real Browser Controller
              </div>
              <div>
                🚀 <strong>Funcionalidade:</strong> Abre janelas REAIS
              </div>
              <div>
                🎭 <strong>Controle:</strong> DOM direto via script injection
              </div>
            </>
          ) : (
            <>
              <div>
                🌐 <strong>Real Browser:</strong> Abre janelas reais do browser
              </div>
              <div>
                🎭 <strong>Controle:</strong> Injeta scripts para controle DOM
              </div>
              <div>
                ⚡ <strong>Execução:</strong> No browser do usuário (não
                simulação)
              </div>
              <div>
                🔧 <strong>Capacidades:</strong> Click, type, navigate,
                screenshot
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Controles de Conexão */}
      <Card>
        <CardHeader>
          <CardTitle>🔌 Controles de Conexão</CardTitle>
          <CardDescription>
            Conecte ao controlador de browser real
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {!isConnected ? (
              <Button
                onClick={connectToRealBrowser}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? "Conectando..." : "🚀 Conectar Real Browser"}
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setIsConnected(false);
                  setSessionId("");
                  addLog("🔒 Desconectado");
                }}
                variant="destructive"
              >
                🔒 Desconectar
              </Button>
            )}

            <Button
              onClick={checkStatus}
              variant="outline"
              className="border-blue-200 text-blue-600"
            >
              📊 Verificar Status
            </Button>

            {isConnected && (
              <Button
                onClick={runFullTest}
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isLoading ? "Executando..." : "🤖 Teste Automático REAL"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configurações */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>⚙️ Configurações de Teste</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="target-url">URL de Destino</Label>
              <Input
                id="target-url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://www.google.com"
              />
            </div>

            <div>
              <Label htmlFor="test-selector">Seletor CSS para Teste</Label>
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
                placeholder="playwright automation"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controles de Browser */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>🎮 Controles de Browser</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Button
                onClick={openWindow}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                🌐 Abrir Janela
              </Button>

              <Button onClick={navigate} disabled={isLoading} variant="outline">
                🧭 Navegar
              </Button>

              <Button
                onClick={injectController}
                disabled={isLoading}
                className="bg-orange-600 hover:bg-orange-700"
              >
                💉 Injetar Controller
              </Button>

              <Button
                onClick={() => executeCommand("click")}
                disabled={isLoading}
                variant="outline"
              >
                🖱️ Click
              </Button>

              <Button
                onClick={() => executeCommand("type")}
                disabled={isLoading}
                variant="outline"
              >
                ⌨️ Type
              </Button>

              <Button
                onClick={() => executeCommand("getTitle")}
                disabled={isLoading}
                variant="outline"
              >
                📄 Get Title
              </Button>

              <Button
                onClick={() => executeCommand("getUrl")}
                disabled={isLoading}
                variant="outline"
              >
                🔗 Get URL
              </Button>

              <Button
                onClick={closeWindow}
                disabled={isLoading}
                variant="destructive"
              >
                ❌ Fechar Janela
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultado */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle>📄 Último Resultado</CardTitle>
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
          <CardTitle className="text-blue-600">📚 Como Usar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <strong>1. 🚀 Conectar:</strong>
            <p className="ml-4 mt-1">
              Clique em &quot;Conectar Real Browser&quot; para iniciar
            </p>
          </div>
          <div>
            <strong>2. 🌐 Abrir Janela:</strong>
            <p className="ml-4 mt-1">
              Clique em &quot;Abrir Janela&quot; - uma nova aba será aberta
            </p>
          </div>
          <div>
            <strong>3. 💉 Injetar Controller:</strong>
            <p className="ml-4 mt-1">
              Clique em &quot;Injetar Controller&quot; para habilitar controle
            </p>
          </div>
          <div>
            <strong>4. 🎮 Controlar:</strong>
            <p className="ml-4 mt-1">
              Use os botões Click, Type, etc. para controlar a página
            </p>
          </div>
          <div>
            <strong>5. 🤖 Teste Automático:</strong>
            <p className="ml-4 mt-1">
              Clique em &quot;Teste Automático REAL&quot; para sequência
              completa
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Diferenças */}
      <Card className="border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-green-600">🔥 Real vs Simulação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Aspecto</th>
                  <th className="text-left p-2">Vercel Bypass (Simulação)</th>
                  <th className="text-left p-2">Real Browser</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2 font-medium">Janela</td>
                  <td className="p-2">❌ Não abre janela</td>
                  <td className="p-2">✅ Abre janela real</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Controle</td>
                  <td className="p-2">❌ Apenas logs falsos</td>
                  <td className="p-2">✅ Controle DOM real</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Execução</td>
                  <td className="p-2">❌ Simulada</td>
                  <td className="p-2">✅ Real no browser</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Resultados</td>
                  <td className="p-2">❌ Dados fictícios</td>
                  <td className="p-2">✅ Dados reais da página</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">Vercel</td>
                  <td className="p-2">✅ Funciona</td>
                  <td className="p-2">✅ Funciona</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
