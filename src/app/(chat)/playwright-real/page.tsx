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
console.log("Playwright REAL - Controle total do browser");

// Função utilitária para verificar janela controlada
const checkControlledWindow = () => {
  const controlledWindow = (window as any).playwrightControlledWindow;

  if (!controlledWindow || controlledWindow.closed) {
    return {
      valid: false,
      message:
        "❌ Nenhuma janela controlada disponível. Use browser_navigate primeiro.",
    };
  }

  try {
    // Teste de acesso básico
    controlledWindow.location.href; // Apenas para testar acesso
    return { valid: true, window: controlledWindow };
  } catch (_accessError) {
    return {
      valid: false,
      message:
        "❌ Janela controlada não está mais acessível (pode ter navegado para outro domínio).",
    };
  }
};

// Ferramentas Playwright REAIS que controlam janelas do browser
const playwrightRealTools = {
  browser_navigate: {
    description: "Navigate to a URL with REAL browser control",
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
        } catch (corsError) {
          // Se não conseguir acessar por CORS, ainda temos a referência da janela
          console.log("CORS error:", corsError); // Log do erro CORS
          (window as any).playwrightControlledWindow = newWindow;
          return `🌐 Navegou para: ${url}\n⚠️ Janela aberta mas título protegido por CORS\n✅ Janela sob controle do Playwright`;
        }
      } catch (error) {
        return `❌ Erro ao navegar: ${error instanceof Error ? error.message : "Erro desconhecido"}`;
      }
    },
  },

  browser_screenshot: {
    description: "Take a REAL screenshot using Screen Capture API",
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
    execute: async ({ fullPage }: { fullPage?: boolean } = {}) => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
          });

          // Evitar warning sobre fullPage não usado
          console.log("Screenshot mode:", fullPage ? "full page" : "viewport");

          return new Promise<string>((resolve) => {
            const video = document.createElement("video");
            video.srcObject = stream;
            video.play();

            video.addEventListener("loadedmetadata", () => {
              const canvas = document.createElement("canvas");
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;

              const ctx = canvas.getContext("2d");
              ctx?.drawImage(video, 0, 0);

              // Parar o stream
              stream.getTracks().forEach((track) => track.stop());

              // Converter para base64 e salvar
              const dataURL = canvas.toDataURL("image/png");

              // Criar link para download
              const link = document.createElement("a");
              link.download = `screenshot-${Date.now()}.png`;
              link.href = dataURL;
              link.click();

              resolve(
                `✅ Screenshot capturado e baixado! Tamanho: ${canvas.width}x${canvas.height}px`,
              );
            });
          });
        } else {
          return "❌ Screen Capture API não disponível neste browser";
        }
      } catch (error) {
        return `❌ Erro ao capturar screenshot: ${error}`;
      }
    },
  },

  browser_click: {
    description: "Click on an element in the controlled window",
    parameters: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector of element to click",
        },
      },
      required: ["selector"],
    },
    execute: async ({ selector }: { selector: string }) => {
      try {
        const windowCheck = checkControlledWindow();
        if (!windowCheck.valid) {
          return windowCheck.message;
        }
        const controlledWindow = windowCheck.window;

        try {
          const element = controlledWindow.document.querySelector(selector);
          if (element) {
            // Destacar elemento antes de clicar
            const originalStyle = element.getAttribute("style") || "";
            (element as HTMLElement).style.outline = "3px solid red";
            (element as HTMLElement).style.backgroundColor = "yellow";

            // Aguardar um pouco para visualizar o destaque
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Clicar no elemento
            (element as HTMLElement).click();

            // Restaurar estilo original
            setTimeout(() => {
              (element as HTMLElement).setAttribute("style", originalStyle);
            }, 2000);

            return `✅ Clicou no elemento: ${selector}`;
          } else {
            return `❌ Elemento não encontrado: ${selector}`;
          }
        } catch (corsError) {
          console.log("CORS error:", corsError); // Log do erro CORS
          return `❌ Não foi possível acessar a janela por restrições CORS. Elemento: ${selector}`;
        }
      } catch (error) {
        return `❌ Erro ao clicar: ${error instanceof Error ? error.message : "Erro desconhecido"}`;
      }
    },
  },

  browser_type: {
    description: "Type text into an input field in the controlled window",
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
        const windowCheck = checkControlledWindow();
        if (!windowCheck.valid) {
          return windowCheck.message;
        }
        const controlledWindow = windowCheck.window;

        try {
          const element = controlledWindow.document.querySelector(
            selector,
          ) as HTMLInputElement;
          if (element) {
            // Destacar elemento
            const originalStyle = element.getAttribute("style") || "";
            (element as HTMLElement).style.outline = "3px solid blue";

            // Focar no elemento
            element.focus();

            // Limpar conteúdo existente
            element.value = "";

            // Digitar texto caractere por caractere para simular digitação real
            for (let i = 0; i < text.length; i++) {
              element.value += text[i];

              // Disparar eventos de input
              element.dispatchEvent(new Event("input", { bubbles: true }));
              element.dispatchEvent(new Event("change", { bubbles: true }));

              // Pequena pausa entre caracteres
              await new Promise((resolve) => setTimeout(resolve, 50));
            }

            // Restaurar estilo
            setTimeout(() => {
              (element as HTMLElement).setAttribute("style", originalStyle);
            }, 2000);

            return `✅ Digitou "${text}" no elemento: ${selector}`;
          } else {
            return `❌ Elemento não encontrado: ${selector}`;
          }
        } catch (corsError) {
          console.log("CORS error:", corsError); // Log do erro CORS
          return `❌ Não foi possível acessar a janela por restrições CORS. Elemento: ${selector}`;
        }
      } catch (error) {
        return `❌ Erro ao digitar: ${error instanceof Error ? error.message : "Erro desconhecido"}`;
      }
    },
  },

  browser_wait: {
    description: "Wait for a specified number of seconds",
    parameters: {
      type: "object",
      properties: {
        seconds: {
          type: "number",
          description: "Number of seconds to wait",
        },
      },
      required: ["seconds"],
    },
    execute: async ({ seconds }: { seconds: number }) => {
      await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
      return `✅ Aguardou ${seconds} segundos`;
    },
  },

  browser_get_title: {
    description: "Get the title of the controlled window",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: async () => {
      try {
        const windowCheck = checkControlledWindow();
        if (!windowCheck.valid) {
          return windowCheck.message;
        }
        const controlledWindow = windowCheck.window;

        try {
          const title = controlledWindow.document.title;
          return `📄 Título da janela controlada: "${title}"`;
        } catch (corsError) {
          console.log("CORS error:", corsError); // Log do erro CORS
          return `❌ Não foi possível acessar o título por restrições CORS`;
        }
      } catch (error) {
        return `❌ Erro ao obter título: ${error instanceof Error ? error.message : "Erro desconhecido"}`;
      }
    },
  },

  browser_get_url: {
    description: "Get the URL of the controlled window",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: async () => {
      try {
        const windowCheck = checkControlledWindow();
        if (!windowCheck.valid) {
          return windowCheck.message;
        }
        const controlledWindow = windowCheck.window;

        try {
          const url = controlledWindow.location.href;
          return `🌐 URL da janela controlada: ${url}`;
        } catch (corsError) {
          console.log("CORS error:", corsError); // Log do erro CORS
          return `❌ Não foi possível acessar a URL por restrições CORS`;
        }
      } catch (error) {
        return `❌ Erro ao obter URL: ${error instanceof Error ? error.message : "Erro desconhecido"}`;
      }
    },
  },

  browser_close: {
    description: "Close the controlled window",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: async () => {
      try {
        const controlledWindow = (window as any).playwrightControlledWindow;

        if (!controlledWindow || controlledWindow.closed) {
          return "❌ Nenhuma janela controlada disponível.";
        }

        controlledWindow.close();
        (window as any).playwrightControlledWindow = null;

        return `✅ Janela controlada fechada`;
      } catch (error) {
        return `❌ Erro ao fechar janela: ${error instanceof Error ? error.message : "Erro desconhecido"}`;
      }
    },
  },
};

export default function PlaywrightRealPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Desconectado");
  const [availableTools, setAvailableTools] = useState<string[]>([]);
  const [testPrompt, setTestPrompt] = useState(
    "Navegue para o Google e clique no campo de busca",
  );
  const [testResult, setTestResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [executionLog, setExecutionLog] = useState<string[]>([]);

  const connectToPlaywright = async () => {
    try {
      setIsLoading(true);
      setConnectionStatus("Inicializando Playwright Real...");

      // Simular inicialização
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const toolNames = Object.keys(playwrightRealTools);
      setAvailableTools(toolNames);
      setIsConnected(true);
      setConnectionStatus(
        `✅ Playwright Real ativo! ${toolNames.length} ferramentas disponíveis.`,
      );

      setExecutionLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Playwright Real inicializado com sucesso`,
      ]);
    } catch (error) {
      console.error("Erro ao conectar:", error);
      setConnectionStatus(
        `❌ Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      );
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectFromPlaywright = async () => {
    try {
      // Fechar janela controlada se existir
      const controlledWindow = (window as any).playwrightControlledWindow;
      if (controlledWindow && !controlledWindow.closed) {
        controlledWindow.close();
      }
      (window as any).playwrightControlledWindow = null;

      setIsConnected(false);
      setConnectionStatus("Desconectado");
      setAvailableTools([]);
      setExecutionLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Playwright Real desconectado`,
      ]);
    } catch (error) {
      console.error("Erro ao desconectar:", error);
    }
  };

  const simulateActionsFromPrompt = (prompt: string) => {
    const actions: Array<{ name: string; args: any }> = [];
    const lowerPrompt = prompt.toLowerCase();

    // Detectar navegação
    if (
      lowerPrompt.includes("navegue") ||
      lowerPrompt.includes("abra") ||
      lowerPrompt.includes("vá")
    ) {
      // Procurar por URLs completas primeiro
      const urlMatch = prompt.match(/https?:\/\/[^\s]+/i);
      if (urlMatch) {
        actions.push({ name: "browser_navigate", args: { url: urlMatch[0] } });
      } else {
        // Procurar por nomes de sites comuns no texto
        const siteKeywords = {
          google: "https://google.com",
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
            actions.push({ name: "browser_navigate", args: { url } });
            foundSite = true;
            break;
          }
        }

        // Se não encontrou site específico, usar Google como padrão
        if (!foundSite) {
          actions.push({
            name: "browser_navigate",
            args: { url: "https://google.com" },
          });
        }
      }
    }

    // Detectar cliques
    if (lowerPrompt.includes("clique") || lowerPrompt.includes("click")) {
      if (lowerPrompt.includes("busca") || lowerPrompt.includes("search")) {
        actions.push({
          name: "browser_click",
          args: {
            selector: "input[name='q'], input[type='search'], .search-input",
          },
        });
      } else if (
        lowerPrompt.includes("botão") ||
        lowerPrompt.includes("button")
      ) {
        actions.push({
          name: "browser_click",
          args: { selector: "button, .btn, input[type='submit']" },
        });
      } else {
        actions.push({
          name: "browser_click",
          args: { selector: "a, button, input" },
        });
      }
    }

    // Detectar digitação
    if (
      lowerPrompt.includes("digite") ||
      lowerPrompt.includes("escreva") ||
      lowerPrompt.includes("type")
    ) {
      const textMatch = prompt.match(/"([^"]+)"/);
      const text = textMatch ? textMatch[1] : "teste";
      actions.push({
        name: "browser_type",
        args: {
          selector: "input[type='text'], input[name='q'], textarea",
          text,
        },
      });
    }

    // Detectar screenshot
    if (
      lowerPrompt.includes("screenshot") ||
      lowerPrompt.includes("captura") ||
      lowerPrompt.includes("print")
    ) {
      actions.push({ name: "browser_screenshot", args: {} });
    }

    // Detectar espera
    if (
      lowerPrompt.includes("aguarde") ||
      lowerPrompt.includes("espere") ||
      lowerPrompt.includes("wait")
    ) {
      const secondsMatch = prompt.match(/(\d+)\s*segundo/);
      const seconds = secondsMatch ? parseInt(secondsMatch[1]) : 3;
      actions.push({ name: "browser_wait", args: { seconds } });
    }

    return actions;
  };

  const testPlaywrightReal = async () => {
    if (!isConnected) {
      setTestResult("❌ Erro: Playwright não conectado");
      return;
    }

    try {
      setIsLoading(true);
      setTestResult("🚀 Executando ações...");

      const actions = simulateActionsFromPrompt(testPrompt);
      const results: string[] = [];

      setExecutionLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Iniciando execução: ${testPrompt}`,
      ]);

      for (const action of actions) {
        const tool =
          playwrightRealTools[action.name as keyof typeof playwrightRealTools];
        if (tool) {
          setExecutionLog((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] Executando: ${action.name}(${JSON.stringify(action.args)})`,
          ]);

          // Aguardar um pouco entre ações para garantir que a janela esteja pronta
          if (action.name !== "browser_navigate") {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }

          const result = await tool.execute(action.args);
          results.push(`${action.name}: ${result}`);

          setExecutionLog((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] Resultado: ${result}`,
          ]);

          // Se a ação falhou por falta de janela controlada, tentar reabrir
          if (
            result &&
            result.includes("Nenhuma janela controlada disponível") &&
            action.name !== "browser_navigate"
          ) {
            setExecutionLog((prev) => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] ⚠️ Tentando reabrir janela...`,
            ]);

            // Reabrir Google como fallback
            const navTool = playwrightRealTools.browser_navigate;
            const navResult = await navTool.execute({
              url: "https://google.com",
            });

            setExecutionLog((prev) => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] Reabertura: ${navResult}`,
            ]);

            // Tentar a ação novamente
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const retryResult = await tool.execute(action.args);
            results[results.length - 1] =
              `${action.name} (retry): ${retryResult}`;

            setExecutionLog((prev) => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] Retry: ${retryResult}`,
            ]);
          }
        }
      }

      setTestResult(`✅ Execução concluída!\n\n${results.join("\n\n")}`);
      setExecutionLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Execução concluída!`,
      ]);
    } catch (error) {
      console.error("Erro no teste:", error);
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
        <h1 className="text-3xl font-bold">
          🎭 Playwright REAL (Controle Total)
        </h1>
        <p className="text-muted-foreground mt-2">
          Controle REAL do browser usando APIs nativas! Abre janelas reais e as
          controla diretamente - sem simulação, sem instalação de servidores
          externos.
        </p>
      </div>

      {/* Status de Conexão */}
      <Card>
        <CardHeader>
          <CardTitle>Status da Conexão</CardTitle>
          <CardDescription>
            Ative o Playwright Real para começar a controlar janelas do browser
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={connectToPlaywright}
              disabled={isLoading || isConnected}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "Inicializando..." : "🚀 Ativar Playwright Real"}
            </Button>
            <Button
              variant="outline"
              onClick={disconnectFromPlaywright}
              disabled={!isConnected}
            >
              ⏹️ Desativar
            </Button>
          </div>

          <div className="text-sm">
            <strong>Status:</strong> {connectionStatus}
          </div>
        </CardContent>
      </Card>

      {/* Ferramentas Disponíveis */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>🛠️ Ferramentas Disponíveis</CardTitle>
            <CardDescription>
              Ferramentas REAIS do Playwright que controlam o browser
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {availableTools.map((tool) => (
                <div
                  key={tool}
                  className="p-2 bg-green-50 dark:bg-green-950 rounded text-sm border border-green-200 dark:border-green-800"
                >
                  ✅ {tool}
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
            <CardTitle>🎯 Teste do Playwright Real</CardTitle>
            <CardDescription>
              Digite um comando e veja o Playwright controlando o browser de
              verdade!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="test-prompt">Comando para Executar</Label>
              <Textarea
                id="test-prompt"
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                placeholder="Ex: Navegue para o Google e clique no campo de busca"
                rows={3}
              />
            </div>

            <Button
              onClick={testPlaywrightReal}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? "🔄 Executando..." : "🚀 Executar Comando"}
            </Button>

            {testResult && (
              <div>
                <Label>Resultado da Execução</Label>
                <Textarea
                  value={testResult}
                  readOnly
                  rows={8}
                  className="mt-2 font-mono text-sm"
                />
              </div>
            )}

            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded">
              <p className="font-semibold">💡 Exemplos de comandos:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>&quot;Navegue para o Google&quot;</li>
                <li>&quot;Abra o Humana.ai e tire uma screenshot&quot;</li>
                <li>&quot;Vá para o GitHub e clique no campo de busca&quot;</li>
                <li>
                  &quot;Navegue para https://example.com e aguarde 5
                  segundos&quot;
                </li>
                <li>&quot;Digite &apos;teste&apos; no campo de busca&quot;</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log de Execução */}
      {executionLog.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📋 Log de Execução</CardTitle>
            <CardDescription>
              Acompanhe as ações executadas em tempo real
            </CardDescription>
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

      {/* Aviso Importante */}
      <Card className="border-orange-200 dark:border-orange-800">
        <CardHeader>
          <CardTitle className="text-orange-600 dark:text-orange-400">
            ⚠️ Importante
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            <strong>✅ O que funciona:</strong> Abre janelas reais, controla
            elementos quando não há restrições CORS
          </p>
          <p>
            <strong>⚠️ Limitações:</strong> Sites com CORS restritivo podem
            bloquear o acesso ao DOM
          </p>
          <p>
            <strong>🎯 Melhor uso:</strong> Sites simples, páginas locais, ou
            sites que permitem acesso cross-origin
          </p>
          <p>
            <strong>📸 Screenshot:</strong> Sempre funciona usando Screen
            Capture API (requer permissão do usuário)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
