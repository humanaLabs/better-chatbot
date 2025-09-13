"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Bot,
  User,
  Globe,
  Monitor,
  Zap,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface Message {
  id: string;
  type: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  status?: "loading" | "success" | "error";
}

export default function PlaywrightHybridPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverUrl, setServerUrl] = useState("http://localhost:8768");
  const [, setAgentInfo] = useState<any>(null);

  useEffect(() => {
    if (messages.length === 0) {
      addMessage(
        "system",
        "🎭 Bem-vindo ao Playwright Hybrid! Digite comandos em linguagem natural para controlar o navegador.",
      );
    }
  }, [messages.length]);

  const addMessage = (
    type: "user" | "assistant" | "system",
    content: string,
    status?: "loading" | "success" | "error",
  ) => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content,
      timestamp: new Date(),
      status,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const updateLastMessage = (
    status: "loading" | "success" | "error",
    content?: string,
  ) => {
    setMessages((prev) => {
      const updated = [...prev];
      const lastMessage = updated[updated.length - 1];
      if (lastMessage) {
        lastMessage.status = status;
        if (content) lastMessage.content = content;
      }
      return updated;
    });
  };

  const connectToDesktopAgent = async () => {
    setIsLoading(true);
    addMessage("system", "🔍 Procurando Desktop Agent...", "loading");

    try {
      const response = await fetch("/api/mcp/playwright-hybrid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "connect",
          serverUrl: serverUrl,
        }),
      });

      const data = await response.json();

      if (data.success && data.agentInfo) {
        setIsConnected(true);
        setAgentInfo(data.agentInfo);
        updateLastMessage(
          "success",
          `✅ 🎭 DESKTOP AGENT REAL conectado (${serverUrl}) - Navegador no cliente!`,
        );
        addMessage(
          "system",
          `🔧 Tools disponíveis: ${data.agentInfo.tools?.join(", ") || "Carregando..."}`,
        );
        addMessage("system", "🎭 Desktop Agent REAL conectado!");
        addMessage("system", `📡 Porta: ${data.agentInfo.port || "8768"}`);
        addMessage(
          "system",
          `🖥️ Navegador: ${data.agentInfo.browser || "initialized"}`,
        );
        addMessage("system", "✅ Desktop Agent conectado - navegador pronto!");
      } else {
        throw new Error(data.error || "Falha na conexão");
      }
    } catch (error) {
      updateLastMessage("error", `❌ Erro: ${error}`);
      setIsConnected(false);
    }

    setIsLoading(false);
  };

  const executeCommand = async (command: string) => {
    if (!isConnected) {
      addMessage("system", "❌ Conecte-se ao Desktop Agent primeiro!", "error");
      return;
    }

    addMessage("user", command);
    addMessage("assistant", "🧠 Interpretando comando...", "loading");

    try {
      // Usar LLM para interpretar comando inteligentemente
      const result = await interpretWithLLM(command);
      updateLastMessage("success", result);
    } catch (error) {
      updateLastMessage("error", `❌ Erro: ${error}`);
    }
  };

  const interpretWithLLM = async (command: string): Promise<string> => {
    try {
      console.log("🧠 Interpretando comando:", command);

      // PASSO 1: Obter contexto da página (DOM apenas - simples e confiável)
      let pageContext: any = null;
      try {
        console.log("📄 Analisando DOM da página...");
        const contextResponse = await fetch("/api/mcp/playwright-hybrid", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "execute",
            toolName: "browser_analyze",
            args: {},
          }),
        });

        if (contextResponse.ok) {
          const contextData = await contextResponse.json();
          if (contextData.success && contextData.result) {
            pageContext = contextData.result;
            console.log("✅ Contexto DOM obtido:", {
              url: pageContext?.url,
              title: pageContext?.title,
              inputs: pageContext?.inputs?.length || 0,
              buttons: pageContext?.buttons?.length || 0,
            });
            console.log(
              "🔘 Botões encontrados na página:",
              pageContext?.buttons?.map((b) => ({
                text: b.text,
                selector: b.selector,
                tag: b.tag,
              })),
            );
          }
        }
      } catch (contextError) {
        console.warn("⚠️ Falha ao obter contexto DOM:", contextError);
      }

      // PASSO 2: Interpretar comando com LLM usando contexto DOM
      console.log("🧠 Interpretando com LLM...");
      const interpretResponse = await fetch("/api/mcp/interpret-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: command,
          pageContext: pageContext,
        }),
      });

      if (!interpretResponse.ok) {
        throw new Error(
          `Erro na interpretação: ${interpretResponse.status} - ${await interpretResponse.text()}`,
        );
      }

      const interpretData = await interpretResponse.json();
      if (!interpretData.success) {
        throw new Error(
          interpretData.error || "Falha na interpretação do comando",
        );
      }

      const interpretationResult = interpretData.result;
      console.log("✅ Comando interpretado:", {
        toolName: interpretationResult.toolName,
        args: interpretationResult.args,
      });

      // PASSO 3: Executar comando interpretado
      console.log("🎭 Executando comando:", interpretationResult.toolName);
      const executeResponse = await fetch("/api/mcp/playwright-hybrid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute",
          toolName: interpretationResult.toolName,
          args: interpretationResult.args,
        }),
      });

      if (!executeResponse.ok) {
        const errorText = await executeResponse.text();
        throw new Error(
          `Erro na execução: ${executeResponse.status} - ${errorText}`,
        );
      }

      const executeData = await executeResponse.json();
      if (!executeData.success) {
        throw new Error(executeData.error || "Falha na execução do comando");
      }

      console.log("✅ Resultado:", executeData.result);

      // Tratar diferentes tipos de resultado
      if (executeData.result.message) {
        return `✅ ${executeData.result.message}`;
      } else if (executeData.result.title) {
        return `📄 Título: ${executeData.result.title}`;
      } else if (executeData.result.url) {
        return `🔗 URL: ${executeData.result.url}`;
      } else {
        return `✅ Comando executado com sucesso`;
      }
    } catch (error) {
      console.error("❌ Erro na interpretação/execução:", error);
      // Fallback para interpretação simples
      return await interpretAndExecuteFallback(command);
    }
  };

  const interpretAndExecuteFallback = async (
    command: string,
  ): Promise<string> => {
    console.log("🔄 Usando fallback simples para:", command);

    const lowerCommand = command.toLowerCase();
    let action = "navigate";
    let args: any = {};

    // Lógica de interpretação simples
    if (
      lowerCommand.includes("abra") ||
      lowerCommand.includes("navegue") ||
      lowerCommand.includes("vá")
    ) {
      const urlMatch = command.match(/https?:\/\/[^\s]+/);
      let url = "https://google.com";

      if (urlMatch) {
        url = urlMatch[0];
      } else {
        const domainMatch = command.match(/([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/);
        if (domainMatch) {
          url = `https://${domainMatch[0]}`;
        } else {
          const siteMatch = command.match(/abra\s+([a-zA-Z0-9.-]+)/i);
          if (siteMatch) {
            const siteName = siteMatch[1].toLowerCase();
            if (!siteName.includes(".")) {
              url = `https://${siteName}.com`;
            } else {
              url = `https://${siteName}`;
            }
          }
        }
      }

      action = "navigate";
      args = { url };
    } else if (lowerCommand.includes("clique")) {
      action = "click";
      args = { selector: 'button, a, input[type="submit"], [role="button"]' };
    } else if (lowerCommand.includes("digite")) {
      const textMatch = command.match(/"([^"]+)"|'([^']+)'|digite\s+(.+)/i);
      const text = textMatch
        ? (textMatch[1] || textMatch[2] || textMatch[3]).trim()
        : "hello world";
      action = "type";
      args = { selector: "input, textarea", text };
    } else if (
      lowerCommand.includes("screenshot") ||
      lowerCommand.includes("captura")
    ) {
      action = "screenshot";
      args = {};
    } else if (lowerCommand.includes("título")) {
      action = "get_title";
      args = {};
    } else if (lowerCommand.includes("url")) {
      action = "get_url";
      args = {};
    }

    return await executeBrowserAction(action, args);
  };

  const executeBrowserAction = async (
    action: string,
    args: any,
  ): Promise<string> => {
    try {
      console.log(`🎭 Executando no Playwright MCP: browser_${action}`);

      const response = await fetch("/api/mcp/playwright-hybrid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute",
          toolName: `browser_${action}`,
          args: args,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      console.log("✅ MCP Result:", result);

      if (!result.success) {
        throw new Error(result.error || "Comando falhou");
      }

      // Tratar diferentes tipos de resposta
      if (action === "get_title") {
        const title =
          result.result?.title || result.result?.result?.title || result.result;
        return `📄 Título da página: ${title}`;
      } else if (action === "get_url") {
        const url =
          result.result?.url || result.result?.result?.url || result.result;
        return `🔗 URL atual: ${url}`;
      } else if (action === "screenshot") {
        if (result.result.screenshot) {
          const base64Data = result.result.screenshot;
          const filename =
            result.result.filename || `screenshot-${Date.now()}.png`;

          // Criar download do screenshot
          const link = document.createElement("a");
          link.href = `data:image/png;base64,${base64Data}`;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          return `✅ Screenshot capturado e baixado: ${filename}`;
        }
        return `✅ Screenshot capturado`;
      } else {
        return `✅ ${result.result?.message || "Comando executado com sucesso"}`;
      }
    } catch (error) {
      console.error("❌ Erro na execução:", error);
      throw error;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      executeCommand(inputValue.trim());
      setInputValue("");
    }
  };

  const getMessageIcon = (message: Message) => {
    if (message.type === "user") return <User className="w-4 h-4" />;
    if (message.type === "system") {
      if (message.status === "loading")
        return <Loader2 className="w-4 h-4 animate-spin" />;
      if (message.status === "error")
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      if (message.status === "success")
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      return <Zap className="w-4 h-4" />;
    }
    return <Bot className="w-4 h-4" />;
  };

  const getMessageBadge = (message: Message) => {
    if (message.status === "loading")
      return <Badge variant="secondary">Processando...</Badge>;
    if (message.status === "error")
      return <Badge variant="destructive">Erro</Badge>;
    if (message.status === "success")
      return <Badge variant="default">Sucesso</Badge>;
    return null;
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="flex-shrink-0 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe className="w-6 h-6" />
            <h1 className="text-2xl font-bold">Playwright Hybrid</h1>
            {isConnected && (
              <Badge variant="default" className="bg-green-500">
                <Monitor className="w-3 h-3 mr-1" />
                Conectado
              </Badge>
            )}
          </div>
        </div>

        {/* Connection Panel */}
        {!isConnected && (
          <Card className="p-4 mb-4">
            <div className="flex gap-2">
              <Input
                placeholder="URL do Desktop Agent (ex: http://localhost:8768)"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                className="flex-1"
              />
              <Button onClick={connectToDesktopAgent} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Conectar"
                )}
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.type === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`flex gap-3 max-w-[80%] ${
                message.type === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                {getMessageIcon(message)}
              </div>
              <div
                className={`rounded-lg p-3 ${
                  message.type === "user"
                    ? "bg-primary text-primary-foreground"
                    : message.type === "system"
                      ? "bg-muted"
                      : "bg-secondary"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">
                    {message.type === "user"
                      ? "Você"
                      : message.type === "system"
                        ? "Sistema"
                        : "Assistente"}
                  </span>
                  {getMessageBadge(message)}
                </div>
                <div className="text-sm whitespace-pre-wrap">
                  {message.content}
                </div>
                <div className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Digite um comando... (ex: 'Abra o Google')"
            disabled={!isConnected || isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={!isConnected || isLoading || !inputValue.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
