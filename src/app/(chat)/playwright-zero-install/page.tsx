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

export default function PlaywrightZeroInstallPage() {
  const [selectedSolution, setSelectedSolution] =
    useState<string>("browser-api");
  const [testUrl, setTestUrl] = useState("https://www.google.com");
  const [testResult, setTestResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [browserSupport, setBrowserSupport] = useState<any>({});

  // Adicionar log
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setExecutionLog((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  // Verificar suporte do browser
  useEffect(() => {
    const checkBrowserSupport = () => {
      const support = {
        webRTC: !!navigator.mediaDevices?.getDisplayMedia,
        webExtensions: !!(window as any).chrome?.runtime,
        serviceWorker: "serviceWorker" in navigator,
        webAssembly: typeof WebAssembly !== "undefined",
        sharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
        crossOriginIsolated: window.crossOriginIsolated,
        permissions: !!navigator.permissions,
        clipboard: !!navigator.clipboard,
        geolocation: !!navigator.geolocation,
        notifications: "Notification" in window,
      };
      setBrowserSupport(support);
      addLog(
        `🔍 Browser capabilities detected: ${Object.entries(support)
          .filter(([, v]) => v)
          .map(([k]) => k)
          .join(", ")}`,
      );
    };

    checkBrowserSupport();
  }, []);

  // Solução 1: Browser APIs Nativas
  const testBrowserAPIs = async () => {
    try {
      addLog("🌐 Testando Browser APIs nativas...");

      // Screen Capture API
      if (navigator.mediaDevices?.getDisplayMedia) {
        addLog("📹 Solicitando captura de tela...");
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });

        // Criar elemento de vídeo para mostrar captura
        const video = document.createElement("video");
        video.srcObject = stream;
        video.play();

        addLog("✅ Captura de tela ativa!");

        // Parar captura após 3 segundos
        setTimeout(() => {
          stream.getTracks().forEach((track) => track.stop());
          addLog("🛑 Captura de tela parada");
        }, 3000);

        return { success: true, method: "Screen Capture API" };
      } else {
        throw new Error("Screen Capture API não suportada");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      addLog(`❌ Erro: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  };

  // Solução 2: WebRTC + Screen Share
  const testWebRTCControl = async () => {
    try {
      addLog("📡 Testando WebRTC Screen Share...");

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      // Simular controle via análise de frames
      const video = document.createElement("video");
      video.srcObject = stream;
      video.play();

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Capturar frame
        const captureFrame = () => {
          ctx?.drawImage(video, 0, 0);
          const imageData = canvas.toDataURL("image/png");
          addLog(`📸 Frame capturado: ${imageData.length} bytes`);
        };

        // Capturar um frame
        setTimeout(captureFrame, 1000);

        // Parar após 5 segundos
        setTimeout(() => {
          stream.getTracks().forEach((track) => track.stop());
          addLog("🛑 WebRTC stream parado");
        }, 5000);
      };

      return { success: true, method: "WebRTC Screen Share" };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      addLog(`❌ Erro WebRTC: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  };

  // Solução 3: Bookmarklet Injection
  const generateBookmarklet = () => {
    const bookmarkletCode = `
      javascript:(function(){
        // Injetar controlador Playwright
        if(window.playwrightController) {
          alert('Playwright Controller já ativo!');
          return;
        }
        
        // Criar controlador
        window.playwrightController = {
          click: function(selector) {
            const el = document.querySelector(selector);
            if(el) { el.click(); return {success: true, selector}; }
            return {success: false, error: 'Element not found'};
          },
          type: function(selector, text) {
            const el = document.querySelector(selector);
            if(el) { 
              el.focus(); 
              el.value = text; 
              el.dispatchEvent(new Event('input', {bubbles: true}));
              return {success: true, selector, text}; 
            }
            return {success: false, error: 'Element not found'};
          },
          getTitle: () => document.title,
          getUrl: () => window.location.href,
          screenshot: function() {
            // Usar html2canvas se disponível
            if(window.html2canvas) {
              return window.html2canvas(document.body).then(canvas => ({
                success: true, 
                dataUrl: canvas.toDataURL()
              }));
            }
            return {success: false, error: 'html2canvas not available'};
          }
        };
        
        // Feedback visual
        const indicator = document.createElement('div');
        indicator.innerHTML = '🎭 Playwright Controller Ativo';
        indicator.style.cssText = 'position:fixed;top:10px;right:10px;background:#4CAF50;color:white;padding:10px;border-radius:5px;z-index:9999;font-family:monospace;';
        document.body.appendChild(indicator);
        
        setTimeout(() => indicator.remove(), 3000);
        
        console.log('🎭 Playwright Controller ativo!', window.playwrightController);
        alert('🎭 Playwright Controller ativo! Abra o console para usar.');
      })();
    `;

    return bookmarkletCode;
  };

  // Solução 4: Service Worker Proxy
  const installServiceWorkerProxy = async () => {
    try {
      addLog("⚙️ Instalando Service Worker Proxy...");

      if (!("serviceWorker" in navigator)) {
        throw new Error("Service Workers não suportados");
      }

      // Registrar service worker inline
      const swCode = `
        self.addEventListener('fetch', event => {
          if (event.request.url.includes('/playwright-proxy/')) {
            event.respondWith(
              fetch(event.request.url.replace('/playwright-proxy/', '/'))
                .then(response => response.text())
                .then(html => {
                  // Injetar script de controle
                  const modifiedHtml = html.replace(
                    '</head>',
                    '<script>window.playwrightProxy = true;</script></head>'
                  );
                  return new Response(modifiedHtml, {
                    headers: { 'Content-Type': 'text/html' }
                  });
                })
            );
          }
        });
      `;

      const blob = new Blob([swCode], { type: "application/javascript" });
      const swUrl = URL.createObjectURL(blob);

      await navigator.serviceWorker.register(swUrl);
      addLog("✅ Service Worker registrado!");

      return { success: true, method: "Service Worker Proxy" };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      addLog(`❌ Erro Service Worker: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  };

  // Executar teste da solução selecionada
  const executeTest = async () => {
    setIsLoading(true);
    setTestResult("🚀 Executando teste...");

    try {
      let result;

      switch (selectedSolution) {
        case "browser-api":
          result = await testBrowserAPIs();
          break;
        case "webrtc":
          result = await testWebRTCControl();
          break;
        case "service-worker":
          result = await installServiceWorkerProxy();
          break;
        default:
          result = { success: false, error: "Solução não implementada" };
      }

      setTestResult(JSON.stringify(result, null, 2));
    } catch (error) {
      setTestResult(`❌ Erro: ${error}`);
    }

    setIsLoading(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          🎯 Playwright Zero-Install Solutions
        </h1>
        <p className="text-muted-foreground mt-2">
          Controle do browser do usuário SEM instalação - Limitações e Soluções
          Reais
        </p>
      </div>

      {/* Realidade das Limitações */}
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-red-600">
            🚫 Realidade: Por que é impossível
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            ❌ <strong>Sandbox do Browser:</strong> Impede acesso ao sistema
            operacional
          </div>
          <div>
            ❌ <strong>CORS Policy:</strong> Bloqueia controle cross-origin
          </div>
          <div>
            ❌ <strong>Segurança:</strong> Browsers impedem execução de binários
          </div>
          <div>
            ❌ <strong>Playwright:</strong> Requer instalação local obrigatória
          </div>
          <div>
            ❌ <strong>Automação Real:</strong> Só funciona com software
            instalado
          </div>
        </CardContent>
      </Card>

      {/* Browser Support */}
      <Card>
        <CardHeader>
          <CardTitle>🔍 Capacidades do seu Browser</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(browserSupport).map(([feature, supported]) => (
              <Badge
                key={feature}
                variant={supported ? "default" : "secondary"}
                className={supported ? "bg-green-600" : "bg-gray-400"}
              >
                {supported ? "✅" : "❌"} {feature}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Soluções Viáveis */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Solução 1: Browser APIs */}
        <Card
          className={`cursor-pointer border-2 ${selectedSolution === "browser-api" ? "border-blue-500" : "border-gray-200"}`}
          onClick={() => setSelectedSolution("browser-api")}
        >
          <CardHeader>
            <CardTitle className="text-blue-600">
              🌐 Browser APIs Nativas
              <Badge className="ml-2 bg-yellow-500">Limitado</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>✅ Screen Capture API</div>
            <div>✅ Clipboard API</div>
            <div>✅ Geolocation API</div>
            <div>❌ Não controla outros sites</div>
            <div>❌ Requer permissão do usuário</div>
          </CardContent>
        </Card>

        {/* Solução 2: WebRTC */}
        <Card
          className={`cursor-pointer border-2 ${selectedSolution === "webrtc" ? "border-green-500" : "border-gray-200"}`}
          onClick={() => setSelectedSolution("webrtc")}
        >
          <CardHeader>
            <CardTitle className="text-green-600">
              📡 WebRTC Screen Share
              <Badge className="ml-2 bg-orange-500">Visual Only</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>✅ Captura tela em tempo real</div>
            <div>✅ Análise de imagem</div>
            <div>✅ Detecção de elementos</div>
            <div>❌ Só visualização, sem controle</div>
            <div>❌ Requer permissão</div>
          </CardContent>
        </Card>

        {/* Solução 3: Bookmarklet */}
        <Card
          className={`cursor-pointer border-2 ${selectedSolution === "bookmarklet" ? "border-purple-500" : "border-gray-200"}`}
          onClick={() => setSelectedSolution("bookmarklet")}
        >
          <CardHeader>
            <CardTitle className="text-purple-600">
              🔖 Bookmarklet Injection
              <Badge className="ml-2 bg-green-500">Funciona</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>✅ Injeta código na página</div>
            <div>✅ Controle DOM direto</div>
            <div>✅ Funciona em qualquer site</div>
            <div>⚠️ Usuário precisa clicar</div>
            <div>⚠️ Por página visitada</div>
          </CardContent>
        </Card>

        {/* Solução 4: Service Worker */}
        <Card
          className={`cursor-pointer border-2 ${selectedSolution === "service-worker" ? "border-indigo-500" : "border-gray-200"}`}
          onClick={() => setSelectedSolution("service-worker")}
        >
          <CardHeader>
            <CardTitle className="text-indigo-600">
              ⚙️ Service Worker Proxy
              <Badge className="ml-2 bg-blue-500">Avançado</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>✅ Intercepta requests</div>
            <div>✅ Modifica HTML/JS</div>
            <div>✅ Proxy transparente</div>
            <div>❌ Complexo de implementar</div>
            <div>❌ Limitações CORS</div>
          </CardContent>
        </Card>
      </div>

      {/* Controles de Teste */}
      <Card>
        <CardHeader>
          <CardTitle>🧪 Testar Solução Selecionada</CardTitle>
          <CardDescription>
            Solução atual: <Badge>{selectedSolution}</Badge>
          </CardDescription>
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

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={executeTest}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "Testando..." : "🚀 Testar Solução"}
            </Button>

            {selectedSolution === "bookmarklet" && (
              <Button
                onClick={() => {
                  const bookmarklet = generateBookmarklet();
                  navigator.clipboard.writeText(bookmarklet);
                  addLog("📋 Bookmarklet copiado! Cole na barra de endereços.");
                }}
                variant="outline"
                className="border-purple-200 text-purple-600"
              >
                📋 Copiar Bookmarklet
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bookmarklet Generator */}
      {selectedSolution === "bookmarklet" && (
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="text-purple-600">
              🔖 Bookmarklet Gerado
            </CardTitle>
            <CardDescription>
              Arraste este link para sua barra de favoritos ou copie e cole na
              barra de endereços
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 p-3 rounded text-xs font-mono break-all">
              <a
                href={generateBookmarklet()}
                className="text-blue-600 hover:underline"
                onClick={(e) => e.preventDefault()}
              >
                🎭 Playwright Controller
              </a>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              <strong>Como usar:</strong>
              <ol className="list-decimal list-inside ml-4 mt-1">
                <li>Copie o código acima</li>
                <li>Vá para qualquer site (ex: Google)</li>
                <li>Cole na barra de endereços e pressione Enter</li>
                <li>O controlador será injetado na página</li>
                <li>
                  Use o console para controlar:{" "}
                  <code>
                    window.playwrightController.click(&apos;button&apos;)
                  </code>
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultado */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle>📄 Resultado do Teste</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={testResult}
              readOnly
              rows={8}
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

      {/* Recomendações Finais */}
      <Card className="border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-green-600">
            💡 Recomendações Realistas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <strong>🥇 Para Automação REAL:</strong>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>
                Use <strong>browser-use</strong> (instalação local)
              </li>
              <li>Ou extensão do browser (instalação única)</li>
              <li>Ou aplicação desktop (Electron/Tauri)</li>
            </ul>
          </div>
          <div>
            <strong>🥈 Para Controle Limitado:</strong>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>Bookmarklet (funciona, mas manual)</li>
              <li>Browser APIs (só mesmo domínio)</li>
              <li>WebRTC (só visualização)</li>
            </ul>
          </div>
          <div>
            <strong>🚫 Impossível:</strong>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>Instalação automática de software</li>
              <li>Controle cross-origin sem permissão</li>
              <li>Playwright puro no browser</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
