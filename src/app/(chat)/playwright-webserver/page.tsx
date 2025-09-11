"use client";

import { useState, useEffect, useRef } from "react";
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

export default function PlaywrightWebserverPage() {
  const [sessionId, setSessionId] = useState(
    `ws_${Math.random().toString(36).substr(2, 9)}`,
  );
  const [isConnected, setIsConnected] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<any>(null);
  const [availableTools, setAvailableTools] = useState<string[]>([]);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState("");
  const [testUrl, setTestUrl] = useState("https://www.google.com");
  const [testSelector, setTestSelector] = useState("textarea[name='q']"); // Google mudou para textarea
  const [testText, setTestText] = useState("playwright webserver automation");
  const [isWebViewReady, setIsWebViewReady] = useState(false);
  const [lastScreenshot, setLastScreenshot] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Adicionar log
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setExecutionLog((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  // Recarregar WebView
  const reloadWebView = () => {
    if (iframeRef.current) {
      setIsWebViewReady(false);
      iframeRef.current.src = `/api/proxy?targetUrl=${encodeURIComponent(testUrl)}`;
      addLog(`🔄 WebView recarregado para: ${testUrl}`);
    }
  };

  // Sincronizar WebView com ação do servidor
  const syncWebViewWithServer = async (syncData: any) => {
    if (!isWebViewReady || !iframeRef.current) return;

    try {
      addLog(`🔄 Sincronizando WebView: ${syncData.action}`);

      // Enviar comando para WebView executar a mesma ação
      const message = {
        type: "WEBVIEW_COMMAND",
        command: syncData.action,
        args: syncData.args,
        url: syncData.url,
      };

      iframeRef.current.contentWindow?.postMessage(message, "*");
      addLog(`✅ WebView sincronizado com ${syncData.action}`);
    } catch (error) {
      addLog(`❌ Erro na sincronização: ${error}`);
    }
  };

  // Iniciar sessão Playwright WEBSERVER
  const startWebserverSession = async () => {
    try {
      setIsLoading(true);
      addLog(`🚀 Iniciando Playwright WEBSERVER para sessão: ${sessionId}`);

      const response = await fetch("/api/mcp/playwright-webserver", {
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
        addLog(`✅ Playwright WEBSERVER iniciado!`);
        addLog(`🎭 Tipo: ${result.type}`);
        addLog(`🔧 ${result.tools?.length || 0} tools disponíveis`);
        addLog(`🌐 Modo: ${result.mode}`);
      } else {
        addLog(`❌ Erro: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Erro ao iniciar: ${error}`);
    }

    setIsLoading(false);
  };

  // Parar sessão
  const stopWebserverSession = async () => {
    try {
      setIsLoading(true);
      addLog(`🛑 Parando sessão Playwright WEBSERVER: ${sessionId}`);

      const response = await fetch("/api/mcp/playwright-webserver", {
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
      const response = await fetch("/api/mcp/playwright-webserver", {
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

  // Executar tool Playwright WEBSERVER
  const executeWebserverTool = async (tool: string, args: any) => {
    try {
      setIsLoading(true);
      addLog(`🔧 Executando tool WEBSERVER: ${tool}`);

      const response = await fetch("/api/mcp/playwright-webserver", {
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
        addLog(`✅ ${tool} executado com sucesso no servidor`);
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
          setLastScreenshot(result.result.screenshot);
        }

        // Sincronizar com WebView do cliente
        if (result.sync_data) {
          await syncWebViewWithServer(result.sync_data);
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
      setIsLoading(false);
    }
  };

  // Teste simples: navegar e obter título
  const testSimpleNavigation = async () => {
    if (!isConnected) {
      addLog("❌ Inicie a sessão Playwright WEBSERVER primeiro");
      return;
    }

    addLog("🧪 Teste simples: navegar e obter título...");

    // 1. Navegar
    const navResult = await executeWebserverTool("browser_navigate", {
      url: testUrl,
    });
    if (navResult) {
      addLog(`✅ Navegação: ${JSON.stringify(navResult, null, 2)}`);
    }

    // 2. Aguardar um pouco
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 3. Obter título
    const titleResult = await executeWebserverTool("browser_get_title", {});
    if (titleResult) {
      addLog(`✅ Título: ${JSON.stringify(titleResult, null, 2)}`);
    }

    // 4. Obter URL
    const urlResult = await executeWebserverTool("browser_get_url", {});
    if (urlResult) {
      addLog(`✅ URL: ${JSON.stringify(urlResult, null, 2)}`);
    }
  };

  // Debug: obter conteúdo da página para encontrar seletores
  const debugPageContent = async () => {
    if (!isConnected) {
      addLog("❌ Inicie a sessão Playwright WEBSERVER primeiro");
      return;
    }

    addLog("🔍 Obtendo conteúdo da página para debug...");

    const content = await executeWebserverTool("browser_get_page_content", {});
    if (content && content.content) {
      // Extrair informações sobre inputs/textareas
      const parser = new DOMParser();
      const doc = parser.parseFromString(content.content, "text/html");

      const inputs = Array.from(doc.querySelectorAll("input, textarea")).map(
        (el) => ({
          tag: el.tagName.toLowerCase(),
          name: el.getAttribute("name"),
          id: el.getAttribute("id"),
          class: el.getAttribute("class"),
          type: el.getAttribute("type"),
          placeholder: el.getAttribute("placeholder"),
        }),
      );

      addLog(`📋 Encontrados ${inputs.length} campos de entrada:`);
      inputs.forEach((input, i) => {
        addLog(
          `  ${i + 1}. <${input.tag}> name="${input.name}" id="${input.id}" class="${input.class}" type="${input.type}"`,
        );
      });

      // Sugerir seletores
      const searchInputs = inputs.filter(
        (input) =>
          (input.name && input.name.includes("q")) ||
          (input.id && input.id.includes("search")) ||
          (input.placeholder &&
            input.placeholder.toLowerCase().includes("search")),
      );

      if (searchInputs.length > 0) {
        addLog("🎯 Seletores sugeridos para busca:");
        searchInputs.forEach((input) => {
          if (input.name) addLog(`  • ${input.tag}[name="${input.name}"]`);
          if (input.id) addLog(`  • #${input.id}`);
        });
      }
    }
  };

  // Teste de múltiplos seletores
  const testMultipleSelectors = async () => {
    if (!isConnected) {
      addLog("❌ Inicie a sessão Playwright WEBSERVER primeiro");
      return;
    }

    const selectors = [
      'textarea[name="q"]',
      'input[name="q"]',
      'input[type="search"]',
      'textarea[title*="Search"]',
      'input[title*="Search"]',
      '[role="combobox"]',
      ".gLFyf", // Classe comum do Google
      "#APjFqb", // ID comum do Google
    ];

    addLog("🔍 Testando múltiplos seletores...");

    for (const selector of selectors) {
      try {
        addLog(`⏳ Testando: ${selector}`);
        const result = await executeWebserverTool("browser_wait_for_selector", {
          selector: selector,
          timeout: 2000,
        });

        if (result && result.success) {
          addLog(`✅ ENCONTRADO: ${selector}`);
          setTestSelector(selector);
          return selector;
        }
      } catch {
        addLog(`❌ Não encontrado: ${selector}`);
      }
    }

    addLog(
      "❌ Nenhum seletor funcionou. Execute o debug para mais informações.",
    );
    return null;
  };

  // Teste automático completo
  const runFullAutomationTest = async () => {
    if (!isConnected) {
      addLog("❌ Inicie a sessão Playwright WEBSERVER primeiro");
      return;
    }

    addLog("🤖 Iniciando automação WEBSERVER completa...");

    // 1. Navegar
    await executeWebserverTool("browser_navigate", { url: testUrl });
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 2. Tentar encontrar seletor automaticamente
    addLog("🔍 Procurando seletor automaticamente...");
    const foundSelector = await testMultipleSelectors();

    if (!foundSelector) {
      addLog(
        "❌ Não foi possível encontrar o campo de busca. Executando debug...",
      );
      await debugPageContent();
      return;
    }

    // 3. Continuar com automação
    await executeWebserverTool("browser_click", { selector: foundSelector });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await executeWebserverTool("browser_type", {
      selector: foundSelector,
      text: testText,
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await executeWebserverTool("browser_screenshot", { fullPage: false });
    await executeWebserverTool("browser_get_title", {});
    await executeWebserverTool("browser_get_url", {});

    addLog("🎉 Automação WEBSERVER concluída!");
  };

  // Listener para mensagens do WebView
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "WEBVIEW_READY") {
        setIsWebViewReady(true);
        addLog("🌐 WebView pronto para sincronização");
      } else if (event.data.type === "WEBVIEW_ERROR") {
        setIsWebViewReady(false);
        if (event.data.isFrameBlocked) {
          addLog(`🚫 Site bloqueado para WebView: ${event.data.url}`);
          addLog(`💡 ${event.data.suggestion}`);
          addLog(`✅ Mas o Playwright WEBSERVER ainda funciona no servidor!`);
        } else {
          addLog(`❌ Erro no WebView: ${event.data.error}`);
          addLog(`🔗 URL problemática: ${event.data.url}`);
        }
      } else if (event.data.type === "CHANGE_URL") {
        setTestUrl(event.data.url);
        addLog(`🔄 URL alterada para: ${event.data.url}`);
      } else if (event.data.type === "USE_SERVER_ONLY") {
        setTestUrl(event.data.url);
        addLog(`🚀 Modo apenas servidor ativado para: ${event.data.url}`);
        addLog(`📸 Use os botões de automação para ver screenshots reais!`);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Verificar status periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      if (sessionId) {
        checkStatus();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [sessionId]);

  // Atualizar WebView quando URL de teste mudar
  useEffect(() => {
    if (iframeRef.current) {
      const newSrc = `/api/proxy?targetUrl=${encodeURIComponent(testUrl)}`;
      if (iframeRef.current.src !== newSrc) {
        iframeRef.current.src = newSrc;
        setIsWebViewReady(false); // Reset ready state
        addLog(`🔄 WebView atualizado para: ${testUrl}`);
      }
    }
  }, [testUrl]);

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
        <h1 className="text-3xl font-bold">🌐 Playwright WEBSERVER</h1>
        <p className="text-muted-foreground mt-2">
          Playwright headless no servidor + WebView no cliente - Melhor dos dois
          mundos!
        </p>
      </div>

      {/* WebView */}
      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-600">
            🌐 WebView do Cliente{" "}
            {isWebViewReady ? "(Pronto)" : "(Carregando...)"}
          </CardTitle>
          <CardDescription>
            Visualização no navegador do cliente - sincronizada com servidor
            {testUrl.includes("youtube.com") ||
            testUrl.includes("facebook.com") ||
            testUrl.includes("twitter.com") ? (
              <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900 rounded text-yellow-800 dark:text-yellow-200 text-sm">
                ⚠️ Este site pode bloquear WebView, mas o Playwright WEBSERVER
                funciona normalmente no servidor
              </div>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button
                onClick={reloadWebView}
                variant="outline"
                size="sm"
                className="border-blue-200 text-blue-600"
              >
                🔄 Recarregar WebView
              </Button>
              <div className="text-sm text-muted-foreground flex items-center">
                URL: {testUrl}
              </div>
            </div>
            <div
              className="border rounded-lg overflow-hidden"
              style={{ height: "400px" }}
            >
              <iframe
                ref={iframeRef}
                src={`/api/proxy?targetUrl=${encodeURIComponent(testUrl)}`}
                className="w-full h-full"
                title="WebView Playwright"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status da Sessão */}
      <Card
        className={`border-2 ${isConnected ? "border-green-200 dark:border-green-800" : "border-red-200 dark:border-red-800"}`}
      >
        <CardHeader>
          <CardTitle
            className={isConnected ? "text-green-600" : "text-red-600"}
          >
            {isConnected
              ? "✅ Playwright WEBSERVER Ativo"
              : "❌ Playwright Parado"}
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
                {sessionStatus.browser_active ? "Ativo (Headless)" : "Inativo"}
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
              {sessionStatus.currentUrl && (
                <div>
                  🔗 <strong>URL Atual:</strong> {sessionStatus.currentUrl}
                </div>
              )}
              {sessionStatus.currentTitle && (
                <div>
                  📄 <strong>Título:</strong> {sessionStatus.currentTitle}
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                🌐 <strong>Playwright WEBSERVER:</strong> Headless no servidor +
                WebView no cliente
              </div>
              <div>
                🚀 <strong>Execução:</strong> Real no servidor, visual no
                cliente
              </div>
              <div>
                📸 <strong>Screenshots:</strong> Reais do servidor
              </div>
              <div>
                🔧 <strong>Controle:</strong> DOM direto via Playwright headless
              </div>
              <div>
                🔄 <strong>Sincronização:</strong> Automática entre servidor e
                cliente
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Controles de Sessão */}
      <Card>
        <CardHeader>
          <CardTitle>🔧 Controles de Sessão</CardTitle>
          <CardDescription>
            Gerencie sua sessão Playwright WEBSERVER
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="session-id">Session ID</Label>
            <Input
              id="session-id"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="ws_123456"
              disabled={isConnected}
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {!isConnected ? (
              <Button
                onClick={startWebserverSession}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? "Iniciando..." : "🚀 Iniciar Playwright WEBSERVER"}
              </Button>
            ) : (
              <Button
                onClick={stopWebserverSession}
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
                    executeWebserverTool("browser_navigate", { url: testUrl })
                  }
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? "Navegando..." : "🌐 Navegar"}
                </Button>
                <Button
                  onClick={testSimpleNavigation}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? "Testando..." : "🧪 Teste Simples"}
                </Button>
                <Button
                  onClick={testMultipleSelectors}
                  disabled={isLoading}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {isLoading ? "Testando..." : "🔍 Testar Seletores"}
                </Button>
                <Button
                  onClick={debugPageContent}
                  disabled={isLoading}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  {isLoading ? "Debugando..." : "🐛 Debug Página"}
                </Button>
                <Button
                  onClick={runFullAutomationTest}
                  disabled={isLoading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isLoading ? "Executando..." : "🤖 Automação Completa"}
                </Button>
                <Button
                  onClick={() =>
                    executeWebserverTool("browser_screenshot", {
                      fullPage: false,
                    })
                  }
                  disabled={isLoading}
                  className="bg-pink-600 hover:bg-pink-700"
                >
                  {isLoading ? "Capturando..." : "📸 Screenshot Real"}
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
              <div className="space-y-2">
                <Input
                  id="test-url"
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  placeholder="https://www.google.com"
                />
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTestUrl("https://www.google.com")}
                  >
                    Google
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTestUrl("https://httpbin.org/forms/post")}
                  >
                    HTTPBin Form
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTestUrl("https://example.com")}
                  >
                    Example.com
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTestUrl("https://duckduckgo.com")}
                  >
                    DuckDuckGo
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setTestUrl(
                        "data:text/html,<html><head><title>Teste Local</title></head><body><h1>Página de Teste</h1><input name='q' placeholder='Campo de teste' /></body></html>",
                      )
                    }
                  >
                    Teste Local
                  </Button>
                </div>
              </div>
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
                placeholder="playwright webserver automation"
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
              🔧 Tools Playwright WEBSERVER ({availableTools.length})
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
                          args = { selector: testSelector, timeout: 10000 };
                        } else if (tool === "browser_get_page_content") {
                          args = {};
                        }

                        executeWebserverTool(tool, args);
                      }}
                      disabled={isLoading}
                    >
                      ▶️ Executar
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Tool Playwright WEBSERVER - execução no servidor + visual no
                    cliente
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Screenshot Real do Servidor */}
      {lastScreenshot && (
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-green-600">
              📸 Screenshot REAL do Servidor
            </CardTitle>
            <CardDescription>
              Esta é a imagem real capturada pelo Playwright no servidor -
              mostra o resultado das ações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${lastScreenshot}`}
                alt="Screenshot do Playwright WEBSERVER"
                className="w-full h-auto"
                style={{ maxHeight: "600px", objectFit: "contain" }}
              />
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              💡 Este screenshot mostra exatamente o que o Playwright vê no
              servidor, incluindo texto digitado e ações executadas
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultado */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle>📄 Resultado da Execução WEBSERVER</CardTitle>
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

      {/* Explicação da Arquitetura */}
      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-600">
            🏗️ Como Funciona o Playwright WEBSERVER
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-semibold text-green-600 mb-2 flex items-center">
                  🖥️ Servidor (Onde a mágica acontece)
                </h4>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">✅</span>
                    <span>
                      <strong>Playwright real:</strong> Executa ações reais no
                      Chrome headless
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">✅</span>
                    <span>
                      <strong>Encontra seletores:</strong> Localiza elementos na
                      página
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">✅</span>
                    <span>
                      <strong>Digita texto:</strong> Preenche campos realmente
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">✅</span>
                    <span>
                      <strong>Screenshots:</strong> Captura imagem real da
                      página
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">✅</span>
                    <span>
                      <strong>Dados reais:</strong> Obtém título, URL, conteúdo
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-blue-600 mb-2 flex items-center">
                  👁️ WebView (Visualização)
                </h4>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">ℹ️</span>
                    <span>
                      <strong>Apenas visual:</strong> Mostra página para o
                      usuário
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">ℹ️</span>
                    <span>
                      <strong>Separado:</strong> Instância independente do
                      servidor
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-600">⚠️</span>
                    <span>
                      <strong>Pode falhar:</strong> Sites podem bloquear iframes
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">💡</span>
                    <span>
                      <strong>Não afeta automação:</strong> Servidor funciona
                      independente
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <h4 className="font-semibold text-purple-600 mb-2">
              🎯 Resultado:
            </h4>
            <p className="text-sm">
              <strong>O texto FOI digitado no servidor!</strong> Use o botão{" "}
              <span className="px-2 py-1 bg-pink-100 dark:bg-pink-900 rounded text-pink-600 font-mono text-xs">
                📸 Screenshot Real
              </span>{" "}
              para ver a prova visual. O WebView é apenas para referência - a
              automação real acontece no servidor headless.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
