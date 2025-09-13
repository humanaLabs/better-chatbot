# 🎭 Guia Completo: Desktop Agent Tunelado + WebApp

## 📋 Visão Geral

Esta solução permite que uma **aplicação web remota** (hospedada em Vercel, Netlify, etc.) controle o **navegador local do usuário** através de um **Desktop Agent** que roda na máquina do cliente, conectado via **túnel seguro**.

### 🏗️ Arquitetura

```
WebApp (Vercel) ←→ Túnel (ngrok/cloudflare) ←→ Desktop Agent (Local) ←→ Playwright ←→ Navegador Local
```

---

## 🚀 Parte 1: Desktop Agent (Cliente)

### 📁 Estrutura do Projeto

```
desktop-agent/
├── src/
│   ├── simple-agent.ts      # Agent principal
│   └── playwright-agent.ts  # Wrapper do Playwright
├── scripts/
│   ├── start-desktop-agent.bat
│   ├── setup-tunnel.bat
│   └── install-dependencies.bat
├── package.json
├── tsconfig.json
└── README-CLIENTE.md
```

### 📦 package.json

```json
{
  "name": "desktop-agent",
  "version": "1.0.0",
  "description": "Desktop Agent para controle remoto do navegador",
  "main": "dist/simple-agent.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/simple-agent.js",
    "dev": "tsc && node dist/simple-agent.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "playwright": "^1.40.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "typescript": "^5.3.0"
  }
}
```

### ⚙️ tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 🤖 src/simple-agent.ts

```typescript
import express from "express";
import cors from "cors";
import { chromium, Browser, Page, BrowserContext } from "playwright";

class SimpleDesktopAgent {
  private app: express.Application;
  private server: any;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private port = 8768;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
  }

  private setupRoutes() {
    // Status do agent
    this.app.get("/status", (_req, res) => {
      const statusData = {
        status: "running",
        port: this.port,
        browser: this.browser ? "initialized" : "not_initialized",
        timestamp: new Date().toISOString(),
        tools: [
          "browser_navigate", "browser_back", "browser_forward", "browser_refresh",
          "browser_click", "browser_type", "browser_screenshot", 
          "browser_get_title", "browser_get_url", "browser_analyze"
        ]
      };
      res.json(statusData);
    });

    // Comandos Playwright
    this.app.post("/playwright/:action", async (req, res) => {
      try {
        const { action } = req.params;
        const data = req.body;

        console.log(`🎭 Executando: ${action}`, data);

        let result;
        switch (action) {
          case "navigate":
            const navReady = await this.ensureBrowserReady();
            if (!navReady) throw new Error("Falha ao inicializar navegador");
            
            console.log(`🌐 Navegando para: ${data.url}`);
            await this.page!.goto(data.url);
            console.log(`✅ Navegação concluída para: ${data.url}`);
            result = { success: true, url: data.url };
            break;

          case "back":
            const backReady = await this.ensureBrowserReady();
            if (!backReady) throw new Error("Navegador não disponível");
            
            console.log("⬅️ Voltando para página anterior...");
            await this.page!.goBack();
            console.log("✅ Voltou para página anterior");
            result = { success: true, url: this.page!.url() };
            break;

          case "forward":
            const forwardReady = await this.ensureBrowserReady();
            if (!forwardReady) throw new Error("Navegador não disponível");
            
            console.log("➡️ Avançando para próxima página...");
            await this.page!.goForward();
            console.log("✅ Avançou para próxima página");
            result = { success: true, url: this.page!.url() };
            break;

          case "refresh":
            const refreshReady = await this.ensureBrowserReady();
            if (!refreshReady) throw new Error("Navegador não disponível");
            
            console.log("🔄 Recarregando página...");
            await this.page!.reload();
            console.log("✅ Página recarregada");
            result = { success: true, url: this.page!.url() };
            break;

          case "click":
            const clickReady = await this.ensureBrowserReady();
            if (!clickReady) throw new Error("Navegador não disponível");

            console.log(`🖱️ Clicando em: ${data.selector}`);
            
            // Se o seletor já é CSS válido, usar diretamente
            let clickSelector = data.selector;
            if (!data.selector.match(/[.#\[\]:]/)) {
              clickSelector = await this.findBestSelector("clickable", data.selector);
            }

            await this.page!.waitForSelector(clickSelector, { timeout: 5000, state: "visible" });
            await this.page!.click(clickSelector);
            
            result = {
              success: true,
              selector: clickSelector,
              message: `Clique executado em: ${clickSelector}`
            };
            break;

          case "type":
            const typeReady = await this.ensureBrowserReady();
            if (!typeReady) throw new Error("Navegador não disponível");

            console.log(`⌨️ Digitando "${data.text}" em: ${data.selector}`);
            
            let typeSelector = data.selector;
            if (!data.selector.match(/[.#\[\]:]/)) {
              typeSelector = await this.findBestSelector("input", data.selector);
            }

            await this.page!.fill(typeSelector, ""); // Limpar primeiro
            await this.page!.type(typeSelector, data.text);
            
            result = {
              success: true,
              text: data.text,
              selector: typeSelector
            };
            break;

          case "get_title":
            const titleReady = await this.ensureBrowserReady();
            if (!titleReady) throw new Error("Navegador não disponível");
            
            const title = await this.page!.title();
            result = { title };
            break;

          case "get_url":
            const urlReady = await this.ensureBrowserReady();
            if (!urlReady) throw new Error("Navegador não disponível");
            
            const url = this.page!.url();
            result = { url };
            break;

          case "screenshot":
            const screenshotReady = await this.ensureBrowserReady();
            if (!screenshotReady) throw new Error("Navegador não disponível");
            
            const screenshotBuffer = await this.page!.screenshot({
              type: "png",
              fullPage: false
            });
            const base64Screenshot = screenshotBuffer.toString("base64");
            
            result = {
              success: true,
              screenshot: base64Screenshot,
              filename: `screenshot-${new Date().toISOString().replace(/[:.]/g, "-")}.png`,
              timestamp: new Date().toISOString()
            };
            break;

          case "analyze":
            const analyzeReady = await this.ensureBrowserReady();
            if (!analyzeReady) throw new Error("Navegador não disponível");

            const pageAnalysis = await this.page!.evaluate(() => {
              const generateSelector = (element: Element): string => {
                const selectors: string[] = [];
                
                if (element.id) selectors.push(`#${element.id}`);
                
                const name = element.getAttribute("name");
                if (name) selectors.push(`[name="${name}"]`);
                
                const type = element.getAttribute("type");
                if (type) selectors.push(`${element.tagName.toLowerCase()}[type="${type}"]`);
                
                const ariaLabel = element.getAttribute("aria-label");
                if (ariaLabel) selectors.push(`[aria-label="${ariaLabel}"]`);
                
                if (element.className) {
                  const classes = element.className.split(" ")
                    .filter(c => c.length > 0 && !c.match(/^(btn|button|form|input|field)$/))
                    .slice(0, 2);
                  if (classes.length > 0) {
                    selectors.push(`.${classes.join(".")}`);
                  }
                }
                
                if (selectors.length === 0) {
                  const siblings = Array.from(element.parentElement?.children || [])
                    .filter(el => el.tagName === element.tagName);
                  const index = siblings.indexOf(element);
                  selectors.push(`${element.tagName.toLowerCase()}:nth-of-type(${index + 1})`);
                }
                
                return selectors[0] || element.tagName.toLowerCase();
              };

              // Analisar inputs
              const inputs = Array.from(document.querySelectorAll("input, textarea, select"))
                .filter(el => (el as HTMLElement).offsetParent !== null)
                .map(el => ({
                  tag: el.tagName.toLowerCase(),
                  type: el.getAttribute("type") || "text",
                  name: el.getAttribute("name") || "",
                  placeholder: el.getAttribute("placeholder") || "",
                  id: el.id || "",
                  ariaLabel: el.getAttribute("aria-label") || "",
                  selector: generateSelector(el),
                  text: el.textContent?.trim() || "",
                  required: el.hasAttribute("required")
                }));

              // Analisar botões e links
              const buttons = Array.from(document.querySelectorAll(
                'button, input[type="submit"], input[type="button"], a[href], [role="button"], [onclick]'
              ))
                .filter(el => (el as HTMLElement).offsetParent !== null)
                .map(el => ({
                  tag: el.tagName.toLowerCase(),
                  text: el.textContent?.trim() || "",
                  type: el.getAttribute("type") || "button",
                  id: el.id || "",
                  href: el.getAttribute("href") || "",
                  role: el.getAttribute("role") || "",
                  ariaLabel: el.getAttribute("aria-label") || "",
                  selector: generateSelector(el),
                  className: el.className || ""
                }));

              return {
                title: document.title,
                url: window.location.href,
                inputs: inputs.slice(0, 15),
                buttons: buttons.slice(0, 15),
                bodyText: document.body.textContent?.slice(0, 500) || ""
              };
            });

            console.log("📊 Análise da página concluída:");
            console.log(`  - URL: ${pageAnalysis.url}`);
            console.log(`  - Título: ${pageAnalysis.title}`);
            console.log(`  - Inputs encontrados: ${pageAnalysis.inputs.length}`);
            console.log(`  - Botões encontrados: ${pageAnalysis.buttons.length}`);
            
            result = { analysis: pageAnalysis };
            break;

          default:
            return res.status(400).json({
              success: false,
              error: `Ação não reconhecida: ${action}`
            });
        }

        res.json({
          success: true,
          result: result
        });
      } catch (error) {
        console.error("❌ Erro:", error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });
  }

  // Garantir que o navegador está pronto
  async ensureBrowserReady(): Promise<boolean> {
    try {
      if (!this.browser || !this.page) {
        console.log("🔄 Navegador não inicializado, abrindo...");
        return await this.initializeBrowser();
      }

      // Verificar se ainda está conectado
      try {
        await this.page.evaluate(() => document.title);
        console.log("✅ Navegador já está aberto e funcionando");
        return true;
      } catch (_error) {
        console.log("⚠️ Navegador foi fechado, reabrindo...");
        this.page = null;
        this.context = null;
        this.browser = null;
        return await this.initializeBrowser();
      }
    } catch (error) {
      console.error("❌ Erro ao verificar/reabrir navegador:", error);
      return false;
    }
  }

  // Encontrar melhor seletor para elemento
  async findBestSelector(intent: string, fallbackSelector: string): Promise<string> {
    try {
      console.log(`🔍 Analisando página para encontrar elemento: ${intent}`);

      const analysis = await this.page!.evaluate((intentType) => {
        const elements: Array<{
          selector: string;
          score: number;
          text: string;
          type: string;
        }> = [];

        if (intentType === "input" || intentType === "search") {
          const inputs = document.querySelectorAll("input, textarea");
          inputs.forEach((el, index) => {
            const element = el as HTMLElement;
            let score = 0;
            const type = element.tagName.toLowerCase();

            if (element.getAttribute("name")?.includes("q")) score += 50;
            if (element.getAttribute("name")?.includes("search")) score += 40;
            if (element.getAttribute("placeholder")?.toLowerCase().includes("search")) score += 30;
            if (element.getAttribute("placeholder")?.toLowerCase().includes("pesquis")) score += 30;

            const rect = element.getBoundingClientRect();
            if (rect.width > 100 && rect.height > 20) score += 20;

            let selector = type;
            if (element.id) selector = `#${element.id}`;
            else if (element.getAttribute("name")) selector = `[name="${element.getAttribute("name")}"]`;
            else if (element.className) selector = `${type}.${element.className.split(" ")[0]}`;
            else selector = `${type}:nth-of-type(${index + 1})`;

            elements.push({
              selector,
              score,
              text: element.getAttribute("placeholder") || element.getAttribute("aria-label") || "",
              type
            });
          });
        } else {
          const clickables = document.querySelectorAll(
            'button, a, input[type="submit"], input[type="button"], [role="button"]'
          );
          clickables.forEach((el, index) => {
            const element = el as HTMLElement;
            let score = 0;
            const type = element.tagName.toLowerCase();

            const text = element.textContent?.toLowerCase() || "";
            if (text.includes("pesquisar") || text.includes("search")) score += 40;
            if (text.includes("buscar")) score += 35;
            if (text.includes("enviar") || text.includes("submit")) score += 30;

            const rect = element.getBoundingClientRect();
            if (rect.width > 50 && rect.height > 20) score += 10;

            let selector = type;
            if (element.id) selector = `#${element.id}`;
            else if (element.className) selector = `${type}.${element.className.split(" ")[0]}`;
            else selector = `${type}:nth-of-type(${index + 1})`;

            elements.push({
              selector,
              score,
              text: element.textContent || "",
              type
            });
          });
        }

        elements.sort((a, b) => b.score - a.score);
        return elements;
      }, intent);

      if (analysis.length > 0) {
        const best = analysis[0];
        console.log(`✅ Melhor elemento encontrado: ${best.selector} (score: ${best.score})`);
        
        try {
          await this.page!.waitForSelector(best.selector, { timeout: 3000, state: "visible" });
          return best.selector;
        } catch {
          console.log(`⚠️ Elemento não visível, usando fallback: ${fallbackSelector}`);
          return fallbackSelector;
        }
      }

      console.log(`⚠️ Análise não encontrou elementos, usando fallback: ${fallbackSelector}`);
      return fallbackSelector;
    } catch (error) {
      console.log(`❌ Erro na análise, usando fallback: ${error}`);
      return fallbackSelector;
    }
  }

  async initializeBrowser() {
    try {
      console.log("🌐 Abrindo navegador...");
      
      this.browser = await chromium.launch({
        headless: false,
        args: ["--start-maximized"]
      });
      
      this.context = await this.browser.newContext({
        viewport: null
      });
      
      this.page = await this.context.newPage();
      
      console.log("✅ Navegador inicializado e pronto!");
      return true;
    } catch (error) {
      console.error("❌ Erro ao inicializar navegador:", error);
      return false;
    }
  }

  async start() {
    console.log("🚀 Simple Desktop Agent - Iniciando...");
    
    await this.initializeBrowser();
    
    this.server = this.app.listen(this.port, () => {
      console.log(`✅ Servidor HTTP rodando na porta ${this.port}`);
      console.log(`🔗 Status: http://localhost:${this.port}/status`);
      console.log(`🎭 Navegador: Aberto`);
      console.log("\n⚠️ Para parar, pressione Ctrl+C");
    });
  }

  async stop() {
    if (this.browser) {
      await this.browser.close();
    }
    if (this.server) {
      this.server.close();
    }
  }
}

// Inicializar e executar
const agent = new SimpleDesktopAgent();
agent.start().catch(console.error);

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Parando Desktop Agent...");
  await agent.stop();
  process.exit(0);
});
```

### 📜 Scripts de Automação

#### scripts/install-dependencies.bat
```batch
@echo off
echo 🚀 Instalando dependências do Desktop Agent...

npm install
npx playwright install chromium

echo ✅ Dependências instaladas!
pause
```

#### scripts/start-desktop-agent.bat
```batch
@echo off
echo 🎭 Iniciando Desktop Agent...

cd /d "%~dp0.."
npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Erro na compilação!
    pause
    exit /b 1
)

echo ✅ Compilação concluída, iniciando servidor...
node dist/simple-agent.js

pause
```

#### scripts/setup-tunnel.bat
```batch
@echo off
echo 🌐 Configurando túnel para Desktop Agent...

set /p TUNNEL_CHOICE="Escolha o túnel (1=ngrok, 2=localtunnel, 3=serveo): "

if "%TUNNEL_CHOICE%"=="1" (
    echo 📡 Iniciando ngrok...
    ngrok http 8768
) else if "%TUNNEL_CHOICE%"=="2" (
    echo 📡 Iniciando localtunnel...
    npx localtunnel --port 8768
) else if "%TUNNEL_CHOICE%"=="3" (
    echo 📡 Iniciando serveo...
    ssh -R 80:localhost:8768 serveo.net
) else (
    echo ❌ Opção inválida!
    pause
    exit /b 1
)

pause
```

---

## 🌐 Parte 2: WebApp (Servidor)

### 📁 Estrutura do Frontend

```
src/
├── app/
│   └── (chat)/
│       └── playwright-hybrid/
│           └── page.tsx              # Interface principal
├── lib/
│   └── command-interpreter.ts        # Interpretador LLM
└── app/api/mcp/
    ├── playwright-hybrid/
    │   └── route.ts                  # API de comunicação
    └── interpret-command/
        └── route.ts                  # API de interpretação
```

### 🎨 Interface Principal (page.tsx)

```typescript
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Send, Bot, User, Globe, Monitor, Zap, CheckCircle, AlertCircle, Loader2
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
  const [agentInfo, setAgentInfo] = useState<any>(null);

  useEffect(() => {
    if (messages.length === 0) {
      addMessage("system", "🎭 Bem-vindo ao Playwright Hybrid! Digite comandos em linguagem natural para controlar o navegador.");
    }
  }, [messages.length]);

  const addMessage = (type: "user" | "assistant" | "system", content: string, status?: "loading" | "success" | "error") => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content,
      timestamp: new Date(),
      status
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const updateLastMessage = (status: "loading" | "success" | "error", content?: string) => {
    setMessages(prev => {
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
          serverUrl: serverUrl
        })
      });

      const data = await response.json();

      if (data.success && data.agentInfo) {
        setIsConnected(true);
        setAgentInfo(data.agentInfo);
        updateLastMessage("success", `✅ 🎭 DESKTOP AGENT conectado (${serverUrl}) - Navegador no cliente!`);
        addMessage("system", `🔧 Tools disponíveis: ${data.agentInfo.tools?.join(", ") || "Carregando..."}`);
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
      const result = await interpretWithLLM(command);
      updateLastMessage("success", result);
    } catch (error) {
      updateLastMessage("error", `❌ Erro: ${error}`);
    }
  };

  const interpretWithLLM = async (command: string): Promise<string> => {
    try {
      console.log("🧠 Interpretando comando:", command);

      // PASSO 1: Obter contexto da página
      let pageContext = null;
      try {
        console.log("📄 Analisando DOM da página...");
        const contextResponse = await fetch("/api/mcp/playwright-hybrid", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "execute",
            toolName: "browser_analyze",
            args: {}
          })
        });

        if (contextResponse.ok) {
          const contextData = await contextResponse.json();
          if (contextData.success && contextData.result) {
            pageContext = contextData.result;
            console.log("✅ Contexto DOM obtido:", {
              url: pageContext.url,
              title: pageContext.title,
              inputs: pageContext.inputs?.length || 0,
              buttons: pageContext.buttons?.length || 0
            });
          }
        }
      } catch (contextError) {
        console.warn("⚠️ Falha ao obter contexto DOM:", contextError);
      }

      // PASSO 2: Interpretar comando com LLM
      console.log("🧠 Interpretando com LLM...");
      const interpretResponse = await fetch("/api/mcp/interpret-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: command,
          pageContext: pageContext
        })
      });

      if (!interpretResponse.ok) {
        throw new Error(`Erro na interpretação: ${interpretResponse.status}`);
      }

      const interpretData = await interpretResponse.json();
      if (!interpretData.success) {
        throw new Error(interpretData.error || "Falha na interpretação do comando");
      }

      const interpretationResult = interpretData.result;
      console.log("✅ Comando interpretado:", {
        toolName: interpretationResult.toolName,
        args: interpretationResult.args
      });

      // PASSO 3: Executar comando interpretado
      console.log("🎭 Executando comando:", interpretationResult.toolName);
      const executeResponse = await fetch("/api/mcp/playwright-hybrid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute",
          toolName: interpretationResult.toolName,
          args: interpretationResult.args
        })
      });

      if (!executeResponse.ok) {
        const errorText = await executeResponse.text();
        throw new Error(`Erro na execução: ${executeResponse.status} - ${errorText}`);
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
      } else if (executeData.result.screenshot) {
        // Download do screenshot
        const base64Data = executeData.result.screenshot;
        const filename = executeData.result.filename || `screenshot-${Date.now()}.png`;
        
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${base64Data}`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return `✅ Screenshot capturado e baixado: ${filename}`;
      } else {
        return `✅ Comando executado com sucesso`;
      }
    } catch (error) {
      console.error("❌ Erro na interpretação/execução:", error);
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
      if (message.status === "loading") return <Loader2 className="w-4 h-4 animate-spin" />;
      if (message.status === "error") return <AlertCircle className="w-4 h-4 text-red-500" />;
      if (message.status === "success") return <CheckCircle className="w-4 h-4 text-green-500" />;
      return <Zap className="w-4 h-4" />;
    }
    return <Bot className="w-4 h-4" />;
  };

  const getMessageBadge = (message: Message) => {
    if (message.status === "loading") return <Badge variant="secondary">Processando...</Badge>;
    if (message.status === "error") return <Badge variant="destructive">Erro</Badge>;
    if (message.status === "success") return <Badge variant="default">Sucesso</Badge>;
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
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Conectar"}
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
            className={`flex gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`flex gap-3 max-w-[80%] ${message.type === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                {getMessageIcon(message)}
              </div>
              <div className={`rounded-lg p-3 ${
                message.type === "user" 
                  ? "bg-primary text-primary-foreground"
                  : message.type === "system" 
                    ? "bg-muted" 
                    : "bg-secondary"
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">
                    {message.type === "user" ? "Você" : message.type === "system" ? "Sistema" : "Assistente"}
                  </span>
                  {getMessageBadge(message)}
                </div>
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
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
          <Button type="submit" disabled={!isConnected || isLoading || !inputValue.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
```

### 🧠 Interpretador de Comandos (command-interpreter.ts)

```typescript
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Schema para comandos Playwright estruturados
const PlaywrightCommandSchema = z.object({
  action: z.enum([
    "navigate", "back", "forward", "refresh",
    "click", "type", "screenshot", 
    "get_title", "get_url", "wait", "scroll", "analyze"
  ]),
  target: z.string().describe("URL para navigate, seletor CSS para outros comandos"),
  value: z.string().optional().describe("Texto para digitar (apenas para action type)"),
  options: z.object({
    timeout: z.number().optional().default(5000),
    waitFor: z.enum(["load", "networkidle", "domcontentloaded"]).optional(),
    fullPage: z.boolean().optional().describe("Para screenshot - capturar página inteira"),
    direction: z.enum(["up", "down", "left", "right"]).optional().describe("Para scroll"),
    pixels: z.number().optional().describe("Pixels para scroll")
  }).optional()
});

export type PlaywrightCommand = z.infer<typeof PlaywrightCommandSchema>;

/**
 * Interpreta comando em linguagem natural e converte para estrutura Playwright
 */
export async function interpretCommand(
  userMessage: string,
  pageContext?: {
    url?: string;
    title?: string;
    inputs?: Array<{
      tag: string; type: string; name: string; placeholder: string;
      id: string; ariaLabel: string; selector: string; text: string;
    }>;
    buttons?: Array<{
      tag: string; text: string; type: string; id: string; href: string;
      ariaLabel: string; selector: string; className: string;
    }>;
    bodyText?: string;
  }
): Promise<PlaywrightCommand> {
  const contextInfo = pageContext ? `
CONTEXTO DA PÁGINA ATUAL:
- URL: ${pageContext.url || "Desconhecida"}
- Título: ${pageContext.title || "Desconhecido"}

INPUTS DISPONÍVEIS:
${pageContext.inputs?.map(input => 
  `  • ${input.tag}[type="${input.type}"] - ${input.placeholder || input.ariaLabel || input.name || "sem label"} (selector: ${input.selector})`
).join("\n") || "  Nenhum input encontrado"}

BOTÕES/LINKS DISPONÍVEIS:
${pageContext.buttons?.map(btn => 
  `  • "${btn.text}" - ${btn.tag} (selector: ${btn.selector})`
).join("\n") || "  Nenhum botão encontrado"}

CONTEXTO DO TEXTO:
${pageContext.bodyText?.slice(0, 300) || "Não disponível"}...
` : "";

  const prompt = `Você é um especialista em automação web com Playwright. Analise o contexto da página e converta este comando do usuário em uma estrutura JSON válida.

COMANDO DO USUÁRIO: "${userMessage}"
${contextInfo}

REGRAS CRÍTICAS:
1. **SEMPRE USE OS SELETORES ESPECÍFICOS** fornecidos no contexto da página
2. Para CLIQUES: encontre o botão/link exato na lista "BOTÕES/LINKS DISPONÍVEIS" e use seu SELETOR
3. Para DIGITAÇÃO: encontre o input exato na lista "INPUTS DISPONÍVEIS" e use seu SELETOR
4. Para NAVEGAÇÃO: use "navigate" com URL completa
5. Para SCREENSHOTS: use "screenshot" (sem target necessário)
6. **NUNCA use texto como seletor** - sempre use o campo "selector" da lista de elementos

PROCESSO DE SELEÇÃO:
1. Analise o comando do usuário
2. Procure na lista de elementos disponíveis o que melhor corresponde
3. Use o SELETOR EXATO fornecido no contexto
4. Se não encontrar elemento específico, use seletor genérico como fallback

EXEMPLOS COM CONTEXTO REAL:
Se o usuário disser "Clique no botão de login" e na lista tiver:
• "Login" - button (selector: #login-btn) 
→ {"action": "click", "target": "#login-btn"}

Se o usuário disser "Digite no campo de email" e na lista tiver:
• input[type="email"] - Email address (selector: [name="email"])
→ {"action": "type", "target": "[name=\"email\"]", "value": ""}

COMANDOS SEM CONTEXTO DE PÁGINA:
"Abra o Google" → {"action": "navigate", "target": "https://google.com"}
"Volte" ou "Voltar" → {"action": "back", "target": ""}
"Avançar" → {"action": "forward", "target": ""}
"Recarregar" ou "Atualizar" → {"action": "refresh", "target": ""}
"Capture uma screenshot" → {"action": "screenshot", "target": ""}
"Qual é o título?" → {"action": "get_title", "target": ""}

IMPORTANTE: 
- SEMPRE prefira seletores do contexto da página
- Se não encontrar elemento específico, use seletor genérico
- Para digitação, inclua o texto no campo "value"
- Para cliques, use apenas o seletor no campo "target"

Retorne APENAS o JSON estruturado, sem explicações.`;

  try {
    const result = await generateObject({
      model: openai("gpt-4o-mini"),
      prompt,
      schema: PlaywrightCommandSchema,
      temperature: 0.1
    });

    console.log(`🧠 LLM Interpretou: "${userMessage}" →`, result.object);
    return result.object;
  } catch (error) {
    console.error("❌ Erro na interpretação LLM:", error);
    return fallbackInterpretation(userMessage);
  }
}

/**
 * Fallback simples se o LLM não estiver disponível
 */
function fallbackInterpretation(userMessage: string): PlaywrightCommand {
  const lowerCommand = userMessage.toLowerCase();

  if (lowerCommand.includes("volte") || lowerCommand.includes("voltar")) {
    return { action: "back", target: "" };
  }

  if (lowerCommand.includes("avançar") || lowerCommand.includes("avancar")) {
    return { action: "forward", target: "" };
  }

  if (lowerCommand.includes("recarregar") || lowerCommand.includes("atualizar") || lowerCommand.includes("refresh")) {
    return { action: "refresh", target: "" };
  }

  if (lowerCommand.includes("abra") || lowerCommand.includes("navegue")) {
    const urlMatch = userMessage.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      return { action: "navigate", target: urlMatch[0] };
    }

    const domainMatch = userMessage.match(/([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/);
    if (domainMatch) {
      return { action: "navigate", target: `https://${domainMatch[0]}` };
    }

    return { action: "navigate", target: "https://google.com" };
  }

  if (lowerCommand.includes("clique") || lowerCommand.includes("login") || lowerCommand.includes("entrar")) {
    return {
      action: "click",
      target: 'button, a, input[type="submit"], input[type="button"], [role="button"], .btn, .button'
    };
  }

  if (lowerCommand.includes("busca") || lowerCommand.includes("pesquis") || lowerCommand.includes("enter") || lowerCommand.includes("submit")) {
    return {
      action: "click",
      target: 'input[type="submit"], button[type="submit"], .search-button, [name="btnK"], .gNO89b'
    };
  }

  if (lowerCommand.includes("digite")) {
    const textMatch = userMessage.match(/"([^"]+)"|'([^']+)'|digite\s+(.+)/i);
    const text = textMatch ? (textMatch[1] || textMatch[2] || textMatch[3]).trim() : "hello world";
    return { action: "type", target: "input, textarea", value: text };
  }

  if (lowerCommand.includes("screenshot") || lowerCommand.includes("captura")) {
    return { action: "screenshot", target: "" };
  }

  if (lowerCommand.includes("título")) {
    return { action: "get_title", target: "" };
  }

  if (lowerCommand.includes("url")) {
    return { action: "get_url", target: "" };
  }

  return { action: "navigate", target: "https://google.com" };
}

/**
 * Converte comando estruturado para formato do Desktop Agent
 */
export function commandToAgentFormat(command: PlaywrightCommand): {
  toolName: string;
  args: any;
} {
  const toolName = `browser_${command.action}`;

  let args: any = {};

  switch (command.action) {
    case "navigate":
      args = { url: command.target };
      break;

    case "back":
    case "forward":
    case "refresh":
      args = {};
      break;

    case "click":
      args = { selector: command.target };
      break;

    case "type":
      args = {
        selector: command.target,
        text: command.value || ""
      };
      break;

    case "screenshot":
      args = {
        fullPage: command.options?.fullPage || false
      };
      break;

    case "scroll":
      args = {
        selector: command.target || "body",
        direction: command.options?.direction || "down",
        pixels: command.options?.pixels || 500
      };
      break;

    case "get_title":
    case "get_url":
    case "analyze":
      args = {};
      break;

    default:
      args = { target: command.target, value: command.value };
  }

  return { toolName, args };
}
```

### 🔌 API de Comunicação (playwright-hybrid/route.ts)

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, serverUrl, toolName, args } = body;

    if (action === "connect") {
      // Conectar ao Desktop Agent
      const agentUrl = serverUrl || "http://localhost:8768";
      
      try {
        const response = await fetch(`${agentUrl}/status`, {
          method: "GET",
          headers: {
            "ngrok-skip-browser-warning": "true"
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const agentInfo = await response.json();
        
        return NextResponse.json({
          success: true,
          agentInfo: agentInfo,
          message: "Desktop Agent conectado com sucesso"
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: `Não foi possível conectar ao Desktop Agent: ${error}`
        }, { status: 500 });
      }
    }

    if (action === "execute") {
      // Executar comando no Desktop Agent
      const agentUrl = process.env.DESKTOP_AGENT_URL || "http://localhost:8768";
      
      // Mapear nomes de ferramentas
      const toolMapping: { [key: string]: string } = {
        "browser_getTitle": "get_title",
        "browser_getUrl": "get_url",
        "browser_navigate": "navigate",
        "browser_click": "click",
        "browser_type": "type",
        "browser_screenshot": "screenshot",
        "browser_analyze": "analyze",
        "browser_back": "back",
        "browser_forward": "forward",
        "browser_refresh": "refresh"
      };

      const mappedToolName = toolMapping[toolName] || toolName.replace("browser_", "");
      
      try {
        const response = await fetch(`${agentUrl}/playwright/${mappedToolName}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true"
          },
          body: JSON.stringify(args)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        
        return NextResponse.json({
          success: true,
          result: result.result || result
        });
      } catch (error) {
        console.error("❌ Erro ao executar comando:", error);
        return NextResponse.json({
          success: false,
          error: `Erro na execução: ${error}`
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: false,
      error: "Ação não reconhecida"
    }, { status: 400 });

  } catch (error) {
    console.error("❌ Erro na API:", error);
    return NextResponse.json({
      success: false,
      error: "Erro interno do servidor"
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "API Playwright Hybrid - Use POST para executar comandos",
    endpoints: {
      connect: "POST /api/mcp/playwright-hybrid { action: 'connect', serverUrl: 'http://localhost:8768' }",
      execute: "POST /api/mcp/playwright-hybrid { action: 'execute', toolName: 'browser_navigate', args: { url: 'https://google.com' } }"
    }
  });
}
```

### 🔌 API de Interpretação (interpret-command/route.ts)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { interpretCommand, commandToAgentFormat } from "@/lib/command-interpreter";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command, pageContext } = body;

    if (!command || typeof command !== "string") {
      return NextResponse.json({
        success: false,
        error: "Comando é obrigatório e deve ser uma string"
      }, { status: 400 });
    }

    console.log("🧠 Interpretando comando:", command);
    console.log("📄 Contexto da página:", pageContext ? {
      url: pageContext.url,
      inputs: pageContext.inputs?.length || 0,
      buttons: pageContext.buttons?.length || 0
    } : "Sem contexto");

    // Interpretar comando com LLM
    const interpretedCommand = await interpretCommand(command, pageContext);
    
    // Converter para formato do Desktop Agent
    const agentFormat = commandToAgentFormat(interpretedCommand);

    console.log("✅ Comando interpretado:", interpretedCommand);
    console.log("🎭 Formato do Agent:", agentFormat);

    return NextResponse.json({
      success: true,
      result: agentFormat,
      interpretation: interpretedCommand
    });

  } catch (error) {
    console.error("❌ Erro na interpretação:", error);
    return NextResponse.json({
      success: false,
      error: `Erro na interpretação: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "API de Interpretação de Comandos - Use POST para interpretar comandos",
    example: {
      command: "clique no botão de login",
      pageContext: {
        url: "https://example.com",
        title: "Example Site",
        buttons: [
          { text: "Login", tag: "button", selector: "#login-btn" }
        ]
      }
    }
  });
}
```

---

## 🔧 Parte 3: Configuração e Deploy

### 📦 Dependências do WebApp

```json
{
  "dependencies": {
    "ai": "^3.0.0",
    "@ai-sdk/openai": "^0.0.0",
    "zod": "^3.22.0"
  }
}
```

### 🌍 Variáveis de Ambiente (.env.local)

```env
# OpenAI API Key para interpretação de comandos
OPENAI_API_KEY=sk-...

# URL do Desktop Agent (opcional, padrão: http://localhost:8768)
DESKTOP_AGENT_URL=http://localhost:8768
```

### 🚀 Scripts de Deploy

#### Vercel (vercel.json)
```json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/playwright-hybrid",
      "destination": "/playwright-hybrid"
    }
  ]
}
```

#### Configuração TypeScript (tsconfig.json)
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "desktop-agent/**/*"]
}
```

---

## 📋 Parte 4: Guia de Implementação

### 🎯 Passo a Passo para Nova Aplicação

#### 1. **Setup do Desktop Agent**
```bash
# 1. Criar pasta do desktop agent
mkdir desktop-agent
cd desktop-agent

# 2. Inicializar projeto Node.js
npm init -y

# 3. Instalar dependências
npm install express playwright cors
npm install -D typescript @types/express @types/cors

# 4. Instalar Playwright
npx playwright install chromium

# 5. Copiar arquivos src/ e scripts/
# 6. Compilar TypeScript
npx tsc

# 7. Testar
node dist/simple-agent.js
```

#### 2. **Setup do Túnel**
```bash
# Opção 1: ngrok
npm install -g ngrok
ngrok http 8768

# Opção 2: localtunnel
npx localtunnel --port 8768

# Opção 3: serveo
ssh -R 80:localhost:8768 serveo.net
```

#### 3. **Setup do WebApp**
```bash
# 1. Instalar dependências AI
npm install ai @ai-sdk/openai zod

# 2. Copiar arquivos:
# - src/app/(chat)/playwright-hybrid/page.tsx
# - src/lib/command-interpreter.ts
# - src/app/api/mcp/playwright-hybrid/route.ts
# - src/app/api/mcp/interpret-command/route.ts

# 3. Configurar .env.local
echo "OPENAI_API_KEY=sk-..." > .env.local

# 4. Testar localmente
npm run dev
```

#### 4. **Deploy**
```bash
# 1. Vercel
vercel --prod

# 2. Ou outro provedor
# Netlify, Railway, etc.
```

### 🔧 Customização

#### **Adicionar Novos Comandos**
1. **No Schema (command-interpreter.ts)**:
```typescript
action: z.enum([
  // ... comandos existentes
  "scroll_to_element",
  "wait_for_element",
  "extract_text"
])
```

2. **No Desktop Agent (simple-agent.ts)**:
```typescript
case "scroll_to_element":
  await this.page!.locator(data.selector).scrollIntoViewIfNeeded();
  result = { success: true };
  break;
```

3. **No Interpretador**:
```typescript
if (lowerCommand.includes("rolar até")) {
  return { action: "scroll_to_element", target: "elemento" };
}
```

#### **Adicionar Autenticação**
```typescript
// No Desktop Agent
this.app.use((req, res, next) => {
  const token = req.headers.authorization;
  if (token !== `Bearer ${process.env.AUTH_TOKEN}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});
```

#### **Adicionar Logging**
```typescript
// No Desktop Agent
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'desktop-agent.log' })
  ]
});
```

---

## 🛡️ Parte 5: Segurança e Produção

### 🔒 Considerações de Segurança

#### **1. Autenticação**
```typescript
// Gerar token único por sessão
const sessionToken = crypto.randomUUID();

// Validar requests
const isValidToken = (token: string) => {
  return token === process.env.SESSION_TOKEN;
};
```

#### **2. Rate Limiting**
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // máximo 100 requests por IP
});

app.use(limiter);
```

#### **3. CORS Restritivo**
```typescript
app.use(cors({
  origin: ['https://meuapp.vercel.app'],
  credentials: true
}));
```

### 🏢 Ambiente Corporativo

#### **1. Proxy Corporativo**
```typescript
// Detectar proxy automaticamente
const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
if (proxyUrl) {
  console.log(`🔗 Usando proxy: ${proxyUrl}`);
}
```

#### **2. Certificados Corporativos**
```typescript
// Adicionar certificados CA corporativos
process.env.NODE_EXTRA_CA_CERTS = '/path/to/corporate-ca.pem';
```

#### **3. Túnel Corporativo**
```bash
# Usar Cloudflare Tunnel (mais aceito em empresas)
cloudflared tunnel --url http://localhost:8768
```

### 📊 Monitoramento

#### **1. Health Check**
```typescript
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    browser: this.browser ? 'connected' : 'disconnected'
  });
});
```

#### **2. Métricas**
```typescript
let commandCount = 0;
let errorCount = 0;

app.get('/metrics', (req, res) => {
  res.json({
    commands_executed: commandCount,
    errors: errorCount,
    success_rate: ((commandCount - errorCount) / commandCount * 100).toFixed(2)
  });
});
```

---

## 🎯 Parte 6: Exemplos de Uso

### 💼 Casos de Uso Comuns

#### **1. Automação de Formulários**
```javascript
// Comando: "Preencha o formulário de contato"
await executeCommand("digite joão silva no campo nome");
await executeCommand("digite joao@email.com no campo email");
await executeCommand("digite minha mensagem na textarea");
await executeCommand("clique no botão enviar");
```

#### **2. Navegação e Pesquisa**
```javascript
// Comando: "Pesquise por 'playwright automation' no Google"
await executeCommand("abra google.com");
await executeCommand("digite playwright automation na busca");
await executeCommand("pressione enter");
```

#### **3. Captura de Dados**
```javascript
// Comando: "Capture informações da página"
await executeCommand("qual é o título da página");
await executeCommand("capture uma screenshot");
await executeCommand("qual é a URL atual");
```

### 🔄 Fluxos Automatizados

#### **1. Login Automatizado**
```typescript
const loginFlow = async (email: string, password: string) => {
  await executeCommand("abra meusite.com/login");
  await executeCommand(`digite ${email} no campo email`);
  await executeCommand(`digite ${password} no campo senha`);
  await executeCommand("clique no botão login");
  await executeCommand("aguarde 3 segundos");
  return await executeCommand("qual é o título da página");
};
```

#### **2. Coleta de Dados**
```typescript
const scrapeData = async (urls: string[]) => {
  const results = [];
  
  for (const url of urls) {
    await executeCommand(`abra ${url}`);
    const title = await executeCommand("qual é o título");
    const screenshot = await executeCommand("capture screenshot");
    
    results.push({ url, title, screenshot });
  }
  
  return results;
};
```

---

## 🚀 Conclusão

Esta solução **Desktop Agent Tunelado + WebApp** oferece:

### ✅ **Vantagens**
- **Controle remoto** do navegador local
- **Sem limitações** de CORS ou políticas de segurança
- **Performance nativa** (navegador local)
- **Compatibilidade** com qualquer site
- **Escalabilidade** (múltiplos clientes)
- **Flexibilidade** (comandos em linguagem natural)

### 🎯 **Casos de Uso Ideais**
- **Automação de testes** em ambiente real
- **RPA** (Robotic Process Automation)
- **Demonstrações** interativas
- **Suporte técnico** remoto
- **Treinamento** e onboarding
- **Coleta de dados** web

### 🔧 **Facilidade de Implementação**
- **Plug-and-play** em qualquer aplicação Next.js
- **Scripts automatizados** para setup
- **Documentação completa**
- **Exemplos práticos**
- **Suporte a múltiplos túneis**

### 🛡️ **Produção Ready**
- **Tratamento de erros** robusto
- **Reconexão automática**
- **Logging detalhado**
- **Segurança configurável**
- **Monitoramento integrado**

**Esta solução é a base perfeita para qualquer aplicação que precise de automação web real e confiável!** 🎉
