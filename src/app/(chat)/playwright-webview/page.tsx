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

export default function PlaywrightWebViewPage() {
  const [currentUrl, setCurrentUrl] = useState("https://google.com");
  const [testPrompt, setTestPrompt] = useState(
    "Clique no campo de busca e digite 'playwright webview test'",
  );
  const [testResult, setTestResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [isWebViewReady, setIsWebViewReady] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Ferramentas do Playwright WebView
  const webViewTools = {
    navigate: async (url: string) => {
      try {
        setCurrentUrl(url);
        addLog(`🌐 Navegando para: ${url}`);

        // Usar nossa API proxy para carregar a página
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;

        if (iframeRef.current) {
          iframeRef.current.src = proxyUrl;

          return new Promise((resolve) => {
            const handleLoad = () => {
              addLog(`✅ Página carregada: ${url}`);
              resolve(`✅ Navegou para: ${url}`);
            };

            iframeRef.current!.onload = handleLoad;
          });
        }

        return "❌ WebView não disponível";
      } catch (error) {
        const errorMsg = `❌ Erro ao navegar: ${error}`;
        addLog(errorMsg);
        return errorMsg;
      }
    },

    click: async (selector: string) => {
      try {
        addLog(`🖱️ Tentando clicar em: ${selector}`);

        const result = await executeCommand("click", selector);

        const message = result.success
          ? `✅ ${result.message}`
          : `❌ ${result.message}`;
        addLog(message);
        return message;
      } catch (error) {
        const errorMsg = `❌ Erro ao clicar: ${error}`;
        addLog(errorMsg);
        return errorMsg;
      }
    },

    type: async (selector: string, text: string) => {
      try {
        addLog(`⌨️ Tentando digitar "${text}" em: ${selector}`);

        const result = await executeCommand("type", selector, text);

        const message = result.success
          ? `✅ ${result.message}`
          : `❌ ${result.message}`;
        addLog(message);
        return message;
      } catch (error) {
        const errorMsg = `❌ Erro ao digitar: ${error}`;
        addLog(errorMsg);
        return errorMsg;
      }
    },

    getTitle: async () => {
      try {
        const result = await executeCommand("getTitle");

        const message = `📄 Título: "${result.title}"`;
        addLog(message);
        return message;
      } catch (error) {
        const errorMsg = `❌ Erro ao obter título: ${error}`;
        addLog(errorMsg);
        return errorMsg;
      }
    },

    getUrl: async () => {
      try {
        const result = await executeCommand("getUrl");

        const message = `🔗 URL: ${result.url}`;
        addLog(message);
        return message;
      } catch (error) {
        const errorMsg = `❌ Erro ao obter URL: ${error}`;
        addLog(errorMsg);
        return errorMsg;
      }
    },

    screenshot: async () => {
      try {
        addLog(`📸 Capturando screenshot...`);

        const result = await executeInWebView(`
          if (typeof html2canvas !== 'undefined') {
            return html2canvas(document.body).then(canvas => {
              return { success: true, dataUrl: canvas.toDataURL() };
            });
          }
          return { success: false, message: 'html2canvas não disponível' };
        `);

        if (result.success) {
          addLog(`✅ Screenshot capturado`);
          return `✅ Screenshot capturado (${result.dataUrl.length} bytes)`;
        } else {
          addLog(`❌ ${result.message}`);
          return `❌ ${result.message}`;
        }
      } catch (error) {
        const errorMsg = `❌ Erro ao capturar screenshot: ${error}`;
        addLog(errorMsg);
        return errorMsg;
      }
    },

    findElements: async (selector: string) => {
      try {
        addLog(`🔍 Procurando elementos: ${selector}`);

        const result = await executeInWebView(`
          const elements = document.querySelectorAll('${selector}');
          const elementInfo = Array.from(elements).map((el, index) => ({
            index: index,
            tagName: el.tagName,
            text: el.textContent ? el.textContent.substring(0, 50) : '',
            id: el.id || '',
            className: el.className || ''
          }));
          return { success: true, count: elements.length, elements: elementInfo };
        `);

        const message = `🔍 Encontrados ${result.count} elementos para "${selector}"`;
        addLog(message);
        return (
          message +
          (result.count > 0
            ? `\\n${JSON.stringify(result.elements, null, 2)}`
            : "")
        );
      } catch (error) {
        const errorMsg = `❌ Erro ao procurar elementos: ${error}`;
        addLog(errorMsg);
        return errorMsg;
      }
    },
  };

  // Executar JavaScript no WebView
  const executeInWebView = (script: string): Promise<any> => {
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

      // Timeout de 5 segundos
      setTimeout(() => {
        window.removeEventListener("message", handleMessage);
        reject(new Error("Timeout na execução do script"));
      }, 5000);

      // Enviar comando para o WebView
      iframeRef.current.contentWindow.postMessage(
        {
          type: "WEBVIEW_EXECUTE",
          id: messageId,
          script: script,
        },
        "*",
      );
    });
  };

  // Executar comando direto no WebView (mais confiável)
  const executeCommand = (
    command: string,
    selector?: string,
    text?: string,
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!iframeRef.current?.contentWindow) {
        reject(new Error("WebView não acessível"));
        return;
      }

      const messageId = `command_${Date.now()}_${Math.random()}`;

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

      // Timeout de 5 segundos
      setTimeout(() => {
        window.removeEventListener("message", handleMessage);
        reject(new Error("Timeout no comando"));
      }, 5000);

      // Enviar comando direto para o WebView
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

  // Adicionar log
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setExecutionLog((prev) => [...prev, `[${timestamp}] ${message}`]);
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
      const text = textMatch ? textMatch[1] || textMatch[2] : "teste webview";
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

    if (
      lowerPrompt.includes("encontre") ||
      lowerPrompt.includes("procure") ||
      lowerPrompt.includes("find")
    ) {
      const selectorMatch = prompt.match(/["']([^"']+)["']/);
      const selector = selectorMatch ? selectorMatch[1] : "a, button, input";
      actions.push({ name: "findElements", args: [selector] });
    }

    // Executar ações
    let results = "";
    for (const action of actions) {
      try {
        const tool = webViewTools[action.name as keyof typeof webViewTools];
        if (tool) {
          const result = await (tool as any)(...action.args);
          results += result + "\\n\\n";

          // Aguardar um pouco entre ações
          if (actions.length > 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
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
    setTestResult("🚀 Executando teste no WebView...");

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
        addLog("✅ WebView Playwright está pronto!");
      }
    };

    window.addEventListener("message", handleMessage);

    // Fallback - verificar após 3 segundos se não receber mensagem
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
        <h1 className="text-3xl font-bold">🌐 Playwright WebView (Embutido)</h1>
        <p className="text-muted-foreground mt-2">
          Browser embutido na aplicação com controle total via WebView
        </p>
      </div>

      {/* Status */}
      <Card
        className={`border-2 ${isWebViewReady ? "border-green-200 dark:border-green-800" : "border-yellow-200 dark:border-yellow-800"}`}
      >
        <CardHeader>
          <CardTitle
            className={isWebViewReady ? "text-green-600" : "text-yellow-600"}
          >
            {isWebViewReady ? "✅ WebView Pronto" : "⏳ Inicializando WebView"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <span>{isWebViewReady ? "✅" : "⏳"}</span>
            <span>Browser embutido na aplicação</span>
          </div>
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>Controle total do DOM</span>
          </div>
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>Sem limitações CORS</span>
          </div>
        </CardContent>
      </Card>

      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle>🎮 Controles do WebView</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="current-url">URL Atual</Label>
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
              placeholder="Ex: Abra o Google, clique no campo de busca e digite 'playwright webview test'"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => webViewTools.navigate(currentUrl)}
              variant="outline"
              className="border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              🌐 Navegar
            </Button>

            <Button
              onClick={executeTest}
              disabled={isLoading || !isWebViewReady}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "Executando..." : "🚀 Executar Teste"}
            </Button>

            <Button
              onClick={() => webViewTools.screenshot()}
              variant="outline"
              disabled={!isWebViewReady}
            >
              📸 Screenshot
            </Button>

            <Button
              onClick={async () => {
                try {
                  const result = await executeCommand("test");
                  addLog(`🧪 Teste: ${JSON.stringify(result)}`);
                } catch (error) {
                  addLog(`❌ Erro no teste: ${error}`);
                }
              }}
              variant="outline"
              disabled={!isWebViewReady}
              className="border-orange-200 text-orange-600 hover:bg-orange-50"
            >
              🧪 Testar Comunicação
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* WebView */}
      <Card>
        <CardHeader>
          <CardTitle>🖥️ WebView Browser</CardTitle>
          <CardDescription>Browser embutido com controle total</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden bg-white">
            <div className="bg-gray-100 p-2 text-sm font-mono text-gray-600 border-b">
              {currentUrl}
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
      <Card className="border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-green-600">
            ✅ Vantagens do WebView
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            ✅ <strong>Embutido:</strong> Browser dentro da aplicação
          </p>
          <p>
            ✅ <strong>Controle total:</strong> Acesso completo ao DOM
          </p>
          <p>
            ✅ <strong>Sem CORS:</strong> Mesmo domínio da aplicação
          </p>
          <p>
            ✅ <strong>Sem instalação:</strong> Funciona direto no browser
          </p>
          <p>
            ✅ <strong>Integração nativa:</strong> React + WebView
          </p>
          <p>
            ✅ <strong>Screenshots reais:</strong> Captura o que você vê
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
