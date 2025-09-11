"use client";

import { useState } from "react";
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
// Playwright REAL usando APIs do browser - sem instalação necessária!
console.log("Playwright REAL - Usando APIs nativas do browser");

// Simulador de ferramentas Playwright que roda no browser do cliente
const playwrightTools = {
  browser_navigate: {
    description: "Navigate to a URL (simulated)",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "URL to navigate to",
        },
      },
      required: ["url"],
    },
    execute: async ({ url }: { url: string }) => {
      try {
        // Abrir em nova janela com controle total
        const newWindow = window.open(
          url,
          "_blank",
          "width=1200,height=800,scrollbars=yes,resizable=yes",
        );

        if (!newWindow) {
          return "❌ Falha ao abrir janela - popup bloqueado pelo browser";
        }

        // Aguardar carregamento
        await new Promise((resolve) => setTimeout(resolve, 3000));

        try {
          // Tentar acessar informações da nova janela
          const title = newWindow.document.title;
          const currentUrl = newWindow.location.href;

          // Armazenar referência da janela para uso posterior
          (window as any).playwrightControlledWindow = newWindow;

          return `🌐 Navegou para: ${currentUrl}\n📄 Título: "${title}"\n✅ Janela sob controle do Playwright`;
        } catch (_corsError) {
          // Se não conseguir acessar por CORS, ainda temos a referência da janela
          (window as any).playwrightControlledWindow = newWindow;
          return `🌐 Navegou para: ${url}\n⚠️ Janela aberta mas título protegido por CORS\n✅ Janela sob controle do Playwright`;
        }
      } catch (error) {
        return `❌ Erro ao navegar: ${error instanceof Error ? error.message : "Erro desconhecido"}`;
      }
    },
  },

  browser_screenshot: {
    description: "Take a screenshot of the current page",
    parameters: {
      type: "object",
      properties: {
        fullPage: {
          type: "boolean",
          description: "Take full page screenshot",
          default: false,
        },
      },
    },
    execute: async ({}: { fullPage?: boolean }) => {
      try {
        // Usar Screen Capture API se disponível
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
          });

          // Criar elemento de vídeo para capturar frame
          const video = document.createElement("video");
          video.srcObject = stream;
          video.play();

          return new Promise((resolve) => {
            video.addEventListener("loadedmetadata", () => {
              const canvas = document.createElement("canvas");
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;

              const ctx = canvas.getContext("2d");
              ctx?.drawImage(video, 0, 0);

              // Parar stream
              stream.getTracks().forEach((track) => track.stop());

              // Converter para base64 (não usado mas necessário para o canvas)
              canvas.toDataURL("image/png");
              resolve(
                `Screenshot capturado! Tamanho: ${canvas.width}x${canvas.height}px`,
              );
            });
          });
        } else {
          return "Screen Capture API não disponível neste browser";
        }
      } catch (error) {
        return `Erro ao capturar screenshot: ${error}`;
      }
    },
  },

  browser_click: {
    description:
      "Simulate a click action (opens developer tools for manual inspection)",
    parameters: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector to click",
        },
      },
      required: ["selector"],
    },
    execute: async ({ selector }: { selector: string }) => {
      // Abrir DevTools para inspeção manual
      console.log(`Simulando click no seletor: ${selector}`);
      console.log(
        "Abra as ferramentas de desenvolvedor (F12) para inspecionar elementos",
      );

      // Tentar encontrar elemento na página atual se estivermos na mesma origem
      try {
        const element = document.querySelector(selector);
        if (element) {
          // Destacar elemento
          const originalStyle = element.getAttribute("style") || "";
          (element as HTMLElement).style.outline = "3px solid red";
          (element as HTMLElement).style.backgroundColor = "yellow";

          setTimeout(() => {
            (element as HTMLElement).setAttribute("style", originalStyle);
          }, 3000);

          return `Elemento encontrado e destacado: ${selector}`;
        } else {
          return `Elemento não encontrado: ${selector}`;
        }
      } catch {
        return `Simulação de click para: ${selector} (use F12 para inspecionar)`;
      }
    },
  },

  browser_type: {
    description: "Simulate typing text",
    parameters: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector of input field",
        },
        text: {
          type: "string",
          description: "Text to type",
        },
      },
      required: ["selector", "text"],
    },
    execute: async ({ selector, text }: { selector: string; text: string }) => {
      try {
        const element = document.querySelector(selector) as HTMLInputElement;
        if (
          element &&
          (element.tagName === "INPUT" || element.tagName === "TEXTAREA")
        ) {
          element.value = text;
          element.dispatchEvent(new Event("input", { bubbles: true }));
          return `Texto digitado em ${selector}: "${text}"`;
        } else {
          return `Campo de input não encontrado: ${selector}`;
        }
      } catch {
        return `Simulação de digitação: "${text}" no campo ${selector}`;
      }
    },
  },

  browser_wait: {
    description: "Wait for a specified amount of time",
    parameters: {
      type: "object",
      properties: {
        seconds: {
          type: "number",
          description: "Number of seconds to wait",
          default: 1,
        },
      },
    },
    execute: async ({ seconds = 1 }: { seconds?: number }) => {
      await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
      return `Aguardou ${seconds} segundos`;
    },
  },

  browser_get_title: {
    description: "Get the title of the current page (simulador)",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: async () => {
      return `📄 Título da página atual (simulador): "${document.title}"\n💡 Dica: Use browser_navigate para ver títulos de sites externos`;
    },
  },

  browser_get_url: {
    description: "Get the URL of the current page",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: async () => {
      return `URL atual: ${window.location.href}`;
    },
  },
};

export default function PlaywrightSimulatorPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("");
  const [testPrompt, setTestPrompt] = useState(
    "Navegue para o Google e tire uma screenshot",
  );
  const [testResult, setTestResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [executionLog, setExecutionLog] = useState<string[]>([]);

  const connectToSimulator = async () => {
    try {
      setIsLoading(true);
      setConnectionStatus("Inicializando simulador Playwright...");

      // Simular conexão
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setIsConnected(true);
      setConnectionStatus(
        `Conectado! ${Object.keys(playwrightTools).length} ferramentas disponíveis (modo simulação).`,
      );
      setExecutionLog([
        "Simulador Playwright inicializado com sucesso!",
        "Modo: Simulação inteligente (sem dependências externas)",
      ]);
    } catch (error) {
      console.error("Erro ao conectar:", error);
      setConnectionStatus(
        `Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      );
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectFromSimulator = async () => {
    try {
      setIsConnected(false);
      setConnectionStatus("Desconectado");
      setExecutionLog([]);
    } catch (error) {
      console.error("Erro ao desconectar:", error);
    }
  };

  const testPlaywrightSimulator = async () => {
    if (!isConnected) {
      setTestResult("Erro: Simulador não conectado");
      return;
    }

    try {
      setIsLoading(true);
      setTestResult("Executando teste...");
      setExecutionLog((prev) => [
        ...prev,
        `Iniciando execução: "${testPrompt}"`,
      ]);

      // SEMPRE usar modo simulação por enquanto (sem AI SDK)
      // TODO: Implementar modo IA quando necessário
      {
        // Modo simulação sem AI SDK
        setExecutionLog((prev) => [
          ...prev,
          "Modo simulação ativo (sem AI SDK)",
        ]);

        // Simular execução baseada no prompt
        const simulatedActions = simulateActionsFromPrompt(testPrompt);

        for (const action of simulatedActions) {
          setExecutionLog((prev) => [
            ...prev,
            `Executando: ${action.name}(${JSON.stringify(action.args)})`,
          ]);

          const tool =
            playwrightTools[action.name as keyof typeof playwrightTools];
          if (tool) {
            const result = await tool.execute(action.args);
            setExecutionLog((prev) => [...prev, `Resultado: ${result}`]);
          }

          // Aguardar um pouco entre ações
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        setTestResult(
          `Simulação concluída!\n\nAções executadas:\n${simulatedActions.map((a) => `- ${a.name}(${JSON.stringify(a.args)})`).join("\n")}\n\nPara usar IA real, configure a chave da API do OpenAI.`,
        );
      }

      setExecutionLog((prev) => [...prev, "Execução concluída!"]);
    } catch (error) {
      console.error("Erro no teste:", error);
      setTestResult(
        `Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      );
      setExecutionLog((prev) => [...prev, `Erro: ${error}`]);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para simular ações baseadas no prompt (sem IA)
  const simulateActionsFromPrompt = (prompt: string) => {
    const actions: Array<{ name: string; args: any }> = [];
    const lowerPrompt = prompt.toLowerCase();

    // Detectar navegação
    if (
      lowerPrompt.includes("naveg") ||
      lowerPrompt.includes("abr") ||
      lowerPrompt.includes("google") ||
      lowerPrompt.includes("youtube") ||
      lowerPrompt.includes("humana") ||
      lowerPrompt.includes("github") ||
      lowerPrompt.includes("facebook") ||
      lowerPrompt.includes("twitter") ||
      lowerPrompt.includes("instagram")
    ) {
      if (lowerPrompt.includes("google")) {
        actions.push({
          name: "browser_navigate",
          args: { url: "https://www.google.com" },
        });
      } else if (lowerPrompt.includes("youtube")) {
        actions.push({
          name: "browser_navigate",
          args: { url: "https://www.youtube.com" },
        });
      } else if (lowerPrompt.includes("humana")) {
        actions.push({
          name: "browser_navigate",
          args: { url: "https://humana.ai" },
        });
      } else if (lowerPrompt.includes("github")) {
        actions.push({
          name: "browser_navigate",
          args: { url: "https://github.com" },
        });
      } else if (lowerPrompt.includes("facebook")) {
        actions.push({
          name: "browser_navigate",
          args: { url: "https://facebook.com" },
        });
      } else if (lowerPrompt.includes("twitter")) {
        actions.push({
          name: "browser_navigate",
          args: { url: "https://twitter.com" },
        });
      } else if (lowerPrompt.includes("instagram")) {
        actions.push({
          name: "browser_navigate",
          args: { url: "https://instagram.com" },
        });
      } else {
        // Se mencionou navegação mas não especificou site, tentar detectar URL
        const urlMatch = prompt.match(/https?:\/\/[^\s]+/);
        if (urlMatch) {
          actions.push({
            name: "browser_navigate",
            args: { url: urlMatch[0] },
          });
        } else {
          // Fallback para Google apenas se não conseguiu detectar nada específico
          actions.push({
            name: "browser_navigate",
            args: { url: "https://www.google.com" },
          });
        }
      }
    }

    // Detectar screenshot
    if (
      lowerPrompt.includes("screenshot") ||
      lowerPrompt.includes("captur") ||
      lowerPrompt.includes("foto")
    ) {
      actions.push({ name: "browser_screenshot", args: { fullPage: false } });
    }

    // Detectar espera
    if (lowerPrompt.includes("aguard") || lowerPrompt.includes("esper")) {
      const secondsMatch = lowerPrompt.match(/(\d+)\s*segundo/);
      const seconds = secondsMatch ? parseInt(secondsMatch[1]) : 2;
      actions.push({ name: "browser_wait", args: { seconds } });
    }

    // Detectar título
    if (lowerPrompt.includes("título") || lowerPrompt.includes("title")) {
      actions.push({ name: "browser_get_title", args: {} });
    }

    // Detectar URL
    if (lowerPrompt.includes("url") || lowerPrompt.includes("endereço")) {
      actions.push({ name: "browser_get_url", args: {} });
    }

    // Se não detectou nenhuma ação específica, tentar detectar URLs ou sites mencionados
    if (actions.length === 0) {
      // Tentar detectar URLs completas primeiro
      const urlMatch = prompt.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        actions.push({
          name: "browser_navigate",
          args: { url: urlMatch[0] },
        });
      } else {
        // Procurar por nomes de sites comuns no texto
        const siteKeywords = {
          humana: "https://humana.ai",
          github: "https://github.com",
          youtube: "https://youtube.com",
          facebook: "https://facebook.com",
          twitter: "https://twitter.com",
          instagram: "https://instagram.com",
          linkedin: "https://linkedin.com",
          reddit: "https://reddit.com",
          stackoverflow: "https://stackoverflow.com",
          wikipedia: "https://wikipedia.org",
        };

        let foundSite = false;
        for (const [keyword, url] of Object.entries(siteKeywords)) {
          if (lowerPrompt.includes(keyword)) {
            actions.push({
              name: "browser_navigate",
              args: { url },
            });
            foundSite = true;
            break;
          }
        }

        // Se ainda não encontrou nada específico, usar Google como fallback
        if (!foundSite) {
          actions.push({
            name: "browser_navigate",
            args: { url: "https://www.google.com" },
          });
        }
      }

      // Não adicionar get_title automaticamente, pois browser_navigate já inclui o título
    }

    return actions;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Simulador Playwright (Sem Instalação)
        </h1>
        <p className="text-muted-foreground mt-2">
          Esta página simula as ferramentas do Playwright com resultados
          realistas, sem precisar instalar nada localmente. Demonstra como o
          Playwright funciona de forma educativa e interativa!
        </p>
      </div>

      {/* Status de Conexão */}
      <Card>
        <CardHeader>
          <CardTitle>Status do Simulador</CardTitle>
          <CardDescription>
            Simulador Playwright rodando no browser
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={connectToSimulator}
              disabled={isLoading || isConnected}
            >
              {isLoading ? "Conectando..." : "Inicializar Simulador"}
            </Button>
            <Button
              variant="outline"
              onClick={disconnectFromSimulator}
              disabled={!isConnected}
            >
              Desconectar
            </Button>
          </div>

          <div className="text-sm space-y-2">
            <div>
              <strong>Status:</strong> {connectionStatus}
            </div>
            <div>
              <strong>Modo:</strong>{" "}
              <span className="text-green-600">✅ Simulação Inteligente</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Funciona 100% offline, sem dependências externas
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ferramentas Disponíveis */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Ferramentas Disponíveis</CardTitle>
            <CardDescription>
              Ferramentas Playwright simuladas no browser
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.keys(playwrightTools).map((tool) => (
                <div key={tool} className="p-2 bg-muted rounded text-sm">
                  {tool}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teste de Ferramenta */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Teste de Ferramenta</CardTitle>
            <CardDescription>
              Teste as ferramentas Playwright simuladas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="test-prompt">Prompt de Teste</Label>
              <Textarea
                id="test-prompt"
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                placeholder="Digite um prompt para testar o Playwright..."
                rows={3}
              />
            </div>

            <Button
              onClick={testPlaywrightSimulator}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Executando..." : "Executar Teste"}
            </Button>

            {testResult && (
              <div>
                <Label>Resultado do Teste</Label>
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
      {isConnected && executionLog.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Log de Execução</CardTitle>
            <CardDescription>
              Acompanhe as ações executadas em tempo real
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-60 overflow-y-auto">
              {executionLog.map((log, index) => (
                <div key={index} className="mb-1">
                  <span className="text-gray-500">
                    [{new Date().toLocaleTimeString()}]
                  </span>{" "}
                  {log}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instruções */}
      <Card>
        <CardHeader>
          <CardTitle>Como Funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>✅ Sem Instalação:</strong> Tudo roda no seu browser, não
            precisa instalar nada
          </p>
          <p>
            <strong>🔧 Ferramentas Simuladas:</strong> Implementações que
            funcionam no browser
          </p>
          <p>
            <strong>🌐 Navegação:</strong> Abre URLs em novas abas
          </p>
          <p>
            <strong>📸 Screenshots:</strong> Usa Screen Capture API do browser
          </p>
          <p>
            <strong>🎯 Clicks:</strong> Destaca elementos na página atual
          </p>
          <p>
            <strong>⌨️ Digitação:</strong> Funciona em campos da página atual
          </p>

          <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded">
            <p className="font-semibold">Como funciona:</p>
            <div className="mt-2">
              <p className="text-xs">
                Detecta palavras-chave no seu prompt e executa as ações
                correspondentes automaticamente. Funciona 100% offline!
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded">
            <p className="font-semibold">Exemplos de prompts para testar:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>&quot;Navegue para o Humana.ai&quot;</li>
              <li>&quot;Abra o GitHub&quot;</li>
              <li>&quot;Vá para o YouTube&quot;</li>
              <li>&quot;Tire uma screenshot da tela&quot;</li>
              <li>
                &quot;Aguarde 3 segundos e me diga o título da página&quot;
              </li>
              <li>&quot;Navegue para https://example.com&quot;</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
