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
import { Input } from "@/components/ui/input";

export default function PlaywrightProxyPage() {
  const [proxyUrl, setProxyUrl] = useState("http://localhost:8080");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [testUrl, setTestUrl] = useState("https://humana.ai");
  const [proxyResult, setProxyResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const proxyServerCode = `
// Servidor Proxy Node.js para contornar CORS
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = 8080;

// Habilitar CORS para todas as origens
app.use(cors({
  origin: '*',
  credentials: true
}));

// Middleware para injetar script de controle
const injectControlScript = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    if (typeof data === 'string' && data.includes('<head>')) {
      // Injetar script de controle Playwright
      const controlScript = \`
        <script>
          window.playwrightProxy = {
            click: (selector) => {
              const element = document.querySelector(selector);
              if (element) {
                element.click();
                return { success: true, message: 'Clicou em: ' + selector };
              }
              return { success: false, message: 'Elemento não encontrado: ' + selector };
            },
            
            type: (selector, text) => {
              const element = document.querySelector(selector);
              if (element) {
                element.focus();
                element.value = text;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
                return { success: true, message: 'Digitou "' + text + '" em: ' + selector };
              }
              return { success: false, message: 'Elemento não encontrado: ' + selector };
            },
            
            getInfo: () => {
              return {
                title: document.title,
                url: window.location.href,
                timestamp: new Date().toISOString()
              };
            }
          };
          
          // API para comunicação com o proxy
          window.addEventListener('message', (event) => {
            if (event.data.type === 'PLAYWRIGHT_COMMAND') {
              const { command, args, id } = event.data;
              
              if (window.playwrightProxy[command]) {
                const result = window.playwrightProxy[command](...args);
                
                // Enviar resultado de volta
                fetch('/api/command-result', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id, result })
                });
              }
            }
          });
        </script>
      \`;
      
      data = data.replace('<head>', '<head>' + controlScript);
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

// Usar middleware de injeção
app.use(injectControlScript);

// API para executar comandos
app.use(express.json());

let commandResults = {};

app.post('/api/command-result', (req, res) => {
  const { id, result } = req.body;
  commandResults[id] = result;
  res.json({ success: true });
});

app.get('/api/command-result/:id', (req, res) => {
  const { id } = req.params;
  const result = commandResults[id];
  
  if (result) {
    delete commandResults[id];
    res.json({ success: true, result });
  } else {
    res.json({ success: false, message: 'Resultado não encontrado' });
  }
});

// Proxy para qualquer URL
app.use('/', createProxyMiddleware({
  target: 'https://httpbin.org', // Target padrão (será sobrescrito)
  changeOrigin: true,
  router: (req) => {
    // Extrair URL do parâmetro
    const targetUrl = req.headers['x-target-url'];
    return targetUrl || 'https://httpbin.org';
  },
  onProxyReq: (proxyReq, req, res) => {
    // Remover header customizado antes de enviar
    proxyReq.removeHeader('x-target-url');
  }
}));

app.listen(PORT, () => {
  console.log(\`🚀 Proxy Playwright rodando em http://localhost:\${PORT}\`);
  console.log('📝 Para usar: adicione header "x-target-url" com a URL desejada');
});
`;

  const packageJson = `{
  "name": "playwright-proxy",
  "version": "1.0.0",
  "description": "Proxy server para contornar CORS no Playwright",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "http-proxy-middleware": "^2.0.6",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}`;

  const testProxy = async () => {
    setIsLoading(true);
    try {
      // Testar se o proxy está rodando
      const response = await fetch(`${proxyUrl}/api/test`, {
        method: "GET",
        headers: {
          "x-target-url": testUrl,
        },
      });

      if (response.ok) {
        // setIsConnected(true); // Removido pois não está sendo usado
        setProxyResult(`✅ Proxy conectado! Testando ${testUrl}...`);

        // Testar comando
        const commandId = Date.now().toString();

        // Simular envio de comando
        setTimeout(async () => {
          try {
            const resultResponse = await fetch(
              `${proxyUrl}/api/command-result/${commandId}`,
            );
            const result = await resultResponse.json();

            setProxyResult(
              (prev) =>
                prev + `\n\n📄 Resultado: ${JSON.stringify(result, null, 2)}`,
            );
          } catch (error) {
            setProxyResult(
              (prev) => prev + `\n\n❌ Erro ao obter resultado: ${error}`,
            );
          }
        }, 2000);
      } else {
        setProxyResult(`❌ Proxy não está rodando em ${proxyUrl}`);
        // setIsConnected(false); // Removido pois não está sendo usado
      }
    } catch (error) {
      setProxyResult(`❌ Erro de conexão: ${error}`);
      // setIsConnected(false); // Removido pois não está sendo usado
    } finally {
      setIsLoading(false);
    }
  };

  const downloadProxyFiles = () => {
    // Download server.js
    const serverBlob = new Blob([proxyServerCode], { type: "text/javascript" });
    const serverUrl = URL.createObjectURL(serverBlob);
    const serverLink = document.createElement("a");
    serverLink.href = serverUrl;
    serverLink.download = "server.js";
    serverLink.click();
    URL.revokeObjectURL(serverUrl);

    // Download package.json
    setTimeout(() => {
      const packageBlob = new Blob([packageJson], { type: "application/json" });
      const packageUrl = URL.createObjectURL(packageBlob);
      const packageLink = document.createElement("a");
      packageLink.href = packageUrl;
      packageLink.download = "package.json";
      packageLink.click();
      URL.revokeObjectURL(packageUrl);
    }, 100);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">🌐 Proxy Server (Sem CORS)</h1>
        <p className="text-muted-foreground mt-2">
          Use um servidor proxy local para contornar limitações CORS
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>📥 Baixar Servidor Proxy</CardTitle>
          <CardDescription>
            Baixe os arquivos para rodar um proxy local que injeta controle
            Playwright
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={downloadProxyFiles} className="w-full">
            📥 Baixar server.js e package.json
          </Button>

          <div className="p-4 bg-muted rounded text-sm">
            <strong>Como usar:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Baixe os arquivos server.js e package.json</li>
              <li>Crie uma pasta e coloque os arquivos dentro</li>
              <li>
                Execute: <code>npm install</code>
              </li>
              <li>
                Execute: <code>npm start</code>
              </li>
              <li>O proxy estará rodando em http://localhost:8080</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🧪 Testar Proxy</CardTitle>
          <CardDescription>
            Teste se o proxy está funcionando e consegue acessar sites
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="proxy-url">URL do Proxy</Label>
            <Input
              id="proxy-url"
              value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)}
              placeholder="http://localhost:8080"
            />
          </div>

          <div>
            <Label htmlFor="test-url">URL para Testar</Label>
            <Input
              id="test-url"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              placeholder="https://humana.ai"
            />
          </div>

          <Button onClick={testProxy} disabled={isLoading} className="w-full">
            {isLoading ? "Testando..." : "🧪 Testar Proxy"}
          </Button>

          {proxyResult && (
            <div>
              <Label>Resultado do Teste</Label>
              <Textarea
                value={proxyResult}
                readOnly
                rows={8}
                className="mt-2 font-mono text-sm"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-600">🔧 Como Funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>1. Proxy Local:</strong> Servidor Node.js que faz
            requisições por você
          </p>
          <p>
            <strong>2. Injeção de Script:</strong> Adiciona código Playwright em
            todas as páginas
          </p>
          <p>
            <strong>3. Sem CORS:</strong> O servidor proxy não tem limitações
            CORS
          </p>
          <p>
            <strong>4. Controle Total:</strong> Manipula qualquer site através
            do proxy
          </p>
          <p>
            <strong>5. API REST:</strong> Comandos via HTTP para controlar
            páginas
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
