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
import { Badge } from "@/components/ui/badge";

export default function PlaywrightServerSessionsPage() {
  const [userId, setUserId] = useState(
    `user_${Math.random().toString(36).substr(2, 9)}`,
  );
  const [sessionStatus, setSessionStatus] = useState<any>(null);
  const [testPrompt, setTestPrompt] = useState(
    "Navigate to Google and search for 'browser automation'",
  );
  const [testResult, setTestResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [allSessions, setAllSessions] = useState<any[]>([]);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Adicionar log
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setExecutionLog((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  // Iniciar sessão browser-use
  const startSession = async () => {
    try {
      setIsLoading(true);
      addLog(`🚀 Iniciando sessão browser-use para: ${userId}`);

      const response = await fetch("/api/browser-use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          userId: userId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSessionStatus(result);
        addLog(`✅ Sessão iniciada! Porta: ${result.port}`);
        addLog(`🌐 WebUI: ${result.webui_url}`);
        addLog(`📹 VNC: ${result.vnc_url}`);

        // Recarregar iframe se necessário
        if (iframeRef.current) {
          iframeRef.current.src = result.webui_url;
        }
      } else {
        addLog(`❌ Erro: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Erro ao iniciar sessão: ${error}`);
    }

    setIsLoading(false);
  };

  // Parar sessão
  const stopSession = async () => {
    try {
      setIsLoading(true);
      addLog(`🛑 Parando sessão para: ${userId}`);

      const response = await fetch("/api/browser-use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "stop",
          userId: userId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSessionStatus(null);
        addLog(`✅ Sessão finalizada`);
      } else {
        addLog(`❌ Erro: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Erro ao parar sessão: ${error}`);
    }

    setIsLoading(false);
  };

  // Verificar status da sessão
  const checkStatus = async () => {
    try {
      const response = await fetch("/api/browser-use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "status",
          userId: userId,
        }),
      });

      const result = await response.json();

      if (result.success && result.status !== "stopped") {
        setSessionStatus(result);
      } else {
        setSessionStatus(null);
      }
    } catch (error) {
      console.error("Erro ao verificar status:", error);
    }
  };

  // Executar comando
  const executeCommand = async () => {
    try {
      setIsLoading(true);
      setTestResult("🚀 Executando comando...");
      addLog(`🎭 Executando: ${testPrompt}`);

      const response = await fetch("/api/browser-use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute",
          userId: userId,
          prompt: testPrompt,
          model: "gpt-4",
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTestResult(JSON.stringify(result.result, null, 2));
        addLog(`✅ Comando executado com sucesso`);
      } else {
        setTestResult(`❌ Erro: ${result.error}`);
        addLog(`❌ Erro: ${result.error}`);
      }
    } catch (error) {
      const errorMsg = `❌ Erro: ${error}`;
      setTestResult(errorMsg);
      addLog(errorMsg);
    }

    setIsLoading(false);
  };

  // Listar todas as sessões
  const listAllSessions = async () => {
    try {
      const response = await fetch("/api/browser-use", {
        method: "GET",
      });

      const result = await response.json();

      if (result.success) {
        setAllSessions(result.sessions);
        addLog(`📊 ${result.active_sessions} sessões ativas encontradas`);
      }
    } catch (error) {
      addLog(`❌ Erro ao listar sessões: ${error}`);
    }
  };

  // Verificar status periodicamente
  useEffect(() => {
    checkStatus();
    listAllSessions();

    const interval = setInterval(() => {
      checkStatus();
      listAllSessions();
    }, 10000); // A cada 10 segundos

    return () => clearInterval(interval);
  }, [userId]);

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
        <h1 className="text-3xl font-bold">🎭 Browser-use Server Sessions</h1>
        <p className="text-muted-foreground mt-2">
          Sessões individuais de browser-use no servidor - Uma instância por
          usuário
        </p>
      </div>

      {/* Status da Sessão Atual */}
      <Card
        className={`border-2 ${sessionStatus ? "border-green-200 dark:border-green-800" : "border-red-200 dark:border-red-800"}`}
      >
        <CardHeader>
          <CardTitle
            className={sessionStatus ? "text-green-600" : "text-red-600"}
          >
            {sessionStatus
              ? `✅ Sessão Ativa (${sessionStatus.status})`
              : "❌ Nenhuma Sessão Ativa"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {sessionStatus ? (
            <>
              <div>
                🆔 <strong>User ID:</strong> {userId}
              </div>
              <div>
                🔌 <strong>Porta:</strong> {sessionStatus.port}
              </div>
              <div>
                ⏰ <strong>Uptime:</strong>{" "}
                {formatUptime(sessionStatus.uptime || 0)}
              </div>
              <div>
                🌐 <strong>WebUI:</strong>{" "}
                <a
                  href={sessionStatus.webui_url}
                  target="_blank"
                  className="text-blue-600 hover:underline"
                >
                  {sessionStatus.webui_url}
                </a>
              </div>
              <div>
                📹 <strong>VNC:</strong>{" "}
                <a
                  href={sessionStatus.vnc_url}
                  target="_blank"
                  className="text-blue-600 hover:underline"
                >
                  {sessionStatus.vnc_url}
                </a>
              </div>
            </>
          ) : (
            <>
              <div>
                🎭 <strong>Browser-use no Servidor:</strong> Cada usuário tem
                sua própria instância
              </div>
              <div>
                🔒 <strong>Isolamento:</strong> Sessões completamente separadas
              </div>
              <div>
                🖥️ <strong>WebUI + VNC:</strong> Interface completa por usuário
              </div>
              <div>
                ⚡ <strong>Performance:</strong> Recursos dedicados do servidor
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Configuração da Sessão */}
      <Card>
        <CardHeader>
          <CardTitle>🔧 Configuração da Sessão</CardTitle>
          <CardDescription>
            Configure sua sessão individual de browser-use
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="user-id">User ID (Identificador único)</Label>
            <Input
              id="user-id"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="user_123456"
              disabled={!!sessionStatus}
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {!sessionStatus ? (
              <Button
                onClick={startSession}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? "Iniciando..." : "🚀 Iniciar Sessão Browser-use"}
              </Button>
            ) : (
              <Button
                onClick={stopSession}
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

            <Button
              onClick={listAllSessions}
              variant="outline"
              className="border-purple-200 text-purple-600"
            >
              📊 Listar Todas Sessões
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Controles de Automação */}
      {sessionStatus && (
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
                onClick={executeCommand}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? "Executando..." : "🚀 Executar Comando"}
              </Button>

              <Button
                onClick={() => window.open(sessionStatus.webui_url, "_blank")}
                variant="outline"
                className="border-purple-200 text-purple-600 hover:bg-purple-50"
              >
                🌐 Abrir WebUI
              </Button>

              <Button
                onClick={() => window.open(sessionStatus.vnc_url, "_blank")}
                variant="outline"
                className="border-orange-200 text-orange-600 hover:bg-orange-50"
              >
                📹 Abrir VNC Viewer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* WebUI Embutido */}
      {sessionStatus && (
        <Card>
          <CardHeader>
            <CardTitle>🖥️ Browser-use WebUI (Sua Sessão)</CardTitle>
            <CardDescription>
              Interface Gradio da sua sessão individual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden bg-white">
              <div className="bg-gray-100 p-2 text-sm font-mono text-gray-600 border-b flex justify-between">
                <span>{sessionStatus.webui_url}</span>
                <span className="text-xs">
                  🎭 Sessão: {userId} | Porta: {sessionStatus.port}
                </span>
              </div>
              <iframe
                ref={iframeRef}
                src={sessionStatus.webui_url}
                className="w-full h-96 border-0"
                onLoad={() => {
                  addLog("🌐 WebUI da sessão carregado");
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Todas as Sessões Ativas */}
      {allSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              📊 Todas as Sessões Ativas ({allSessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {allSessions.map((session, index) => (
                <div key={index} className="border rounded p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="font-mono text-sm">
                      <Badge
                        variant={
                          session.status === "running" ? "default" : "secondary"
                        }
                      >
                        {session.userId}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Porta: {session.port} | Uptime:{" "}
                      {formatUptime(session.uptime)}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Iniciado: {new Date(session.startTime).toLocaleString()} |
                    Última atividade:{" "}
                    {new Date(session.lastActivity).toLocaleString()}
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
            <CardTitle>📄 Resultado do Comando</CardTitle>
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

      {/* Setup Instructions */}
      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-600">
            📚 Setup do Browser-use Server
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <strong>1. Clonar browser-use no servidor:</strong>
            <pre className="bg-gray-100 p-2 rounded mt-1 text-xs">
              cd /path/to/your/server git clone
              https://github.com/browser-use/web-ui.git browser-use-server cd
              browser-use-server
            </pre>
          </div>
          <div>
            <strong>2. Instalar dependências:</strong>
            <pre className="bg-gray-100 p-2 rounded mt-1 text-xs">
              python -m venv venv source venv/bin/activate # Linux/Mac
              venv\Scripts\activate # Windows pip install -r requirements.txt
              playwright install --with-deps
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
            <strong>4. Modificar webui.py para suportar sessões:</strong>
            <pre className="bg-gray-100 p-2 rounded mt-1 text-xs">
              # Adicionar suporte a --user-session no webui.py # Cada sessão
              terá sua própria pasta de dados
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Vantagens */}
      <Card className="border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-green-600">
            🔥 Vantagens das Sessões no Servidor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            🎭 <strong>Isolamento Total:</strong> Cada usuário tem sua própria
            instância
          </p>
          <p>
            🖥️ <strong>Recursos do Servidor:</strong> CPU/RAM dedicados para
            automação
          </p>
          <p>
            🔒 <strong>Segurança:</strong> Sessões completamente separadas
          </p>
          <p>
            📹 <strong>VNC Individual:</strong> Cada usuário vê apenas seu
            browser
          </p>
          <p>
            ⚡ <strong>Performance:</strong> Sem limitações do browser cliente
          </p>
          <p>
            🌐 <strong>WebUI Completo:</strong> Interface Gradio completa por
            usuário
          </p>
          <p>
            🔄 <strong>Persistência:</strong> Sessões mantidas enquanto ativas
          </p>
          <p>
            🧹 <strong>Cleanup Automático:</strong> Sessões inativas são limpas
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
