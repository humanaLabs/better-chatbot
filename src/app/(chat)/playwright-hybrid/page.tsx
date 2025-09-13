"use client";

import { useState, useEffect, useRef } from "react";
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
  status?: "success" | "error" | "loading";
}

export default function PlaywrightHybridPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [mcpServerUrl, setMcpServerUrl] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showConnectionSetup, setShowConnectionSetup] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Adicionar mensagem inicial
  useEffect(() => {
    if (messages.length === 0) {
      addMessage(
        "system",
        "👋 Olá! Sou seu assistente para controle remoto do navegador. Para começar, conecte-se ao seu Desktop Agent local.",
      );
    }
  }, []);

  const addMessage = (
    type: Message["type"],
    content: string,
    status?: Message["status"],
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

  const updateLastMessage = (status: Message["status"], content?: string) => {
    setMessages((prev) =>
      prev.map((msg, index) =>
        index === prev.length - 1
          ? { ...msg, status, ...(content && { content }) }
          : msg,
      ),
    );
  };

  const connectToDesktopAgent = async () => {
    if (!mcpServerUrl.trim() && !isConnected) {
      addMessage(
        "system",
        "🔍 Tentando conectar automaticamente ao Desktop Agent local...",
      );
    } else if (mcpServerUrl.trim()) {
      addMessage("system", `🌐 Conectando ao Desktop Agent: ${mcpServerUrl}`);
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/mcp/playwright-hybrid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "connect",
          serverUrl: mcpServerUrl.trim() || "http://localhost:3001",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsConnected(true);
        setShowConnectionSetup(false);
        addMessage("system", `✅ ${data.message}`, "success");
        addMessage(
          "system",
          '🎉 Perfeito! Agora você pode controlar seu navegador. Digite comandos como:\n\n• "Abra o Google"\n• "Clique no campo de busca"\n• "Digite \'hello world\'"\n• "Capture uma screenshot"',
        );
      } else {
        addMessage("system", `❌ ${data.error}`, "error");
        if (data.instructions) {
          const instructions = data.instructions.join("\n");
          addMessage("system", `💡 Para resolver:\n\n${instructions}`);
        }
      }
    } catch (error) {
      addMessage("system", `❌ Erro na conexão: ${error}`, "error");
    }

    setIsLoading(false);
  };

  const executeCommand = async (command: string) => {
    if (!isConnected) {
      addMessage("system", "❌ Conecte-se ao Desktop Agent primeiro!", "error");
      return;
    }

    addMessage("user", command);
    addMessage("assistant", "Executando comando...", "loading");

    try {
      // Interpretar comando e executar
      const result = await interpretAndExecute(command);
      updateLastMessage("success", result);
    } catch (error) {
      updateLastMessage("error", `❌ Erro: ${error}`);
    }
  };

  const interpretAndExecute = async (command: string): Promise<string> => {
    const lowerCommand = command.toLowerCase();

    // Detectar tipo de comando
    if (
      lowerCommand.includes("abra") ||
      lowerCommand.includes("navegue") ||
      lowerCommand.includes("vá para")
    ) {
      const urlMatch =
        command.match(/https?:\/\/[^\s]+/) ||
        command.match(/(google|youtube|facebook|instagram|twitter)\.com/i);
      let url = "https://google.com";

      if (urlMatch) {
        url = urlMatch[0].startsWith("http")
          ? urlMatch[0]
          : `https://${urlMatch[0]}`;
      } else if (lowerCommand.includes("google")) {
        url = "https://google.com";
      } else if (lowerCommand.includes("youtube")) {
        url = "https://youtube.com";
      }

      return await executeBrowserAction("navigate", { url });
    }

    if (lowerCommand.includes("clique")) {
      let selector = "a, button, input";

      if (lowerCommand.includes("busca") || lowerCommand.includes("pesquisa")) {
        selector =
          'input[name="q"], textarea[name="q"], [aria-label*="Pesquisar"]';
      } else if (
        lowerCommand.includes("botão") ||
        lowerCommand.includes("button")
      ) {
        selector = 'button, input[type="submit"], [role="button"]';
      }

      return await executeBrowserAction("click", { selector });
    }

    if (lowerCommand.includes("digite") || lowerCommand.includes("escreva")) {
      const textMatch = command.match(
        /"([^"]+)"|'([^']+)'|digite\s+(.+)|escreva\s+(.+)/i,
      );
      const text = textMatch
        ? (textMatch[1] || textMatch[2] || textMatch[3] || textMatch[4]).trim()
        : "hello world";
      const selector =
        'input[name="q"], textarea[name="q"], [contenteditable="true"], input[type="text"]';

      return await executeBrowserAction("type", { selector, text });
    }

    if (
      lowerCommand.includes("screenshot") ||
      lowerCommand.includes("captura")
    ) {
      return await executeBrowserAction("screenshot", {});
    }

    if (lowerCommand.includes("título")) {
      return await executeBrowserAction("get_title", {});
    }

    if (lowerCommand.includes("url")) {
      return await executeBrowserAction("get_url", {});
    }

    // Comando não reconhecido
    return '🤔 Comando não reconhecido. Tente:\n\n• "Abra o Google"\n• "Clique no campo de busca"\n• "Digite \'sua mensagem\'"\n• "Capture uma screenshot"';
  };

  const executeBrowserAction = async (
    action: string,
    args: any,
  ): Promise<string> => {
    const response = await fetch("/api/mcp/playwright-hybrid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "execute",
        toolName: `browser_${action}`,
        args: args,
      }),
    });

    const data = await response.json();

    if (data.success) {
      const result = data.result;

      if (action === "navigate") {
        return `✅ Navegador aberto em: ${args.url}`;
      } else if (action === "click") {
        return `✅ Clique executado no elemento`;
      } else if (action === "type") {
        return `✅ Texto "${args.text}" digitado com sucesso`;
      } else if (action === "screenshot") {
        return `✅ Screenshot capturado com sucesso`;
      } else if (action === "getTitle") {
        return `📄 Título da página: "${result.title || result.result || "Não encontrado"}"`;
      } else if (action === "getUrl") {
        return `🔗 URL atual: ${result.url || result.result || "Não encontrada"}`;
      }

      return `✅ Comando executado com sucesso`;
    } else {
      throw new Error(data.error || "Erro desconhecido");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    executeCommand(inputMessage.trim());
    setInputMessage("");
  };

  const getMessageIcon = (message: Message) => {
    if (message.type === "user") return <User className="w-6 h-6" />;
    if (message.type === "system") return <Bot className="w-6 h-6" />;
    return <Globe className="w-6 h-6" />;
  };

  const getStatusIcon = (status?: Message["status"]) => {
    if (status === "loading")
      return <Loader2 className="w-4 h-4 animate-spin" />;
    if (status === "success")
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === "error")
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    return null;
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Monitor className="w-6 h-6" />
              <h1 className="text-xl font-semibold">
                Controle Remoto do Navegador
              </h1>
            </div>
            <Badge
              variant={isConnected ? "default" : "secondary"}
              className="flex items-center gap-1"
            >
              {isConnected ? (
                <>
                  <CheckCircle className="w-3 h-3" />
                  Conectado
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3" />
                  Desconectado
                </>
              )}
            </Badge>
          </div>

          {!isConnected && (
            <Button
              onClick={() => setShowConnectionSetup(!showConnectionSetup)}
              variant="outline"
              size="sm"
            >
              <Zap className="w-4 h-4 mr-2" />
              Conectar
            </Button>
          )}
        </div>

        {/* Connection Setup */}
        {showConnectionSetup && !isConnected && (
          <div className="border-t p-4 bg-muted/50">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">
                Configuração de Conexão
              </span>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="https://abc123.ngrok-free.app/ (opcional)"
                value={mcpServerUrl}
                onChange={(e) => setMcpServerUrl(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={connectToDesktopAgent}
                disabled={isLoading}
                className="shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Conectar"
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              💡 Deixe vazio para conectar automaticamente ao Desktop Agent
              local (localhost:8768)
            </p>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="flex gap-3">
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.type === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {getMessageIcon(message)}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {message.type === "user"
                    ? "Você"
                    : message.type === "system"
                      ? "Sistema"
                      : "Assistente"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {message.timestamp.toLocaleTimeString()}
                </span>
                {getStatusIcon(message.status)}
              </div>

              <Card className="p-3">
                <div className="whitespace-pre-wrap text-sm">
                  {message.content}
                </div>
              </Card>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={
              isConnected
                ? "Digite um comando... (ex: 'Abra o Google')"
                : "Conecte-se primeiro ao Desktop Agent"
            }
            disabled={!isConnected || isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={!isConnected || !inputMessage.trim() || isLoading}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>

        {isConnected && (
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputMessage("Abra o Google")}
            >
              Abra o Google
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputMessage("Clique no campo de busca")}
            >
              Clique no campo de busca
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputMessage("Capture uma screenshot")}
            >
              Screenshot
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputMessage("Qual é o título da página?")}
            >
              Título da página
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
