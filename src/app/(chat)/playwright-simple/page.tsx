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

export default function PlaywrightSimplePage() {
  const [isConnected, setIsConnected] = useState(false);
  const [testUrl, setTestUrl] = useState("https://httpbin.org/html");
  const [testPrompt, setTestPrompt] = useState(
    "Navegue para httpbin e me diga o título",
  );
  const [testResult, setTestResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [executionLog, setExecutionLog] = useState<string[]>([]);

  // Ferramentas que funcionam via fetch direto para nossa API proxy
  const simpleTools = {
    navigate: async (url: string) => {
      try {
        const response = await fetch(
          `/api/proxy?url=${encodeURIComponent(url)}`,
        );
        if (response.ok) {
          const html = await response.text();
          // Extrair título da resposta HTML
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          const title = titleMatch ? titleMatch[1] : "Sem título";
          return `✅ Navegou para: ${url}\n📄 Título: "${title}"`;
        } else {
          return `❌ Erro ao navegar: ${response.status}`;
        }
      } catch (error) {
        return `❌ Erro ao navegar: ${error}`;
      }
    },

    getInfo: async (url: string) => {
      try {
        const response = await fetch(
          `/api/proxy?url=${encodeURIComponent(url)}`,
        );
        if (response.ok) {
          const html = await response.text();

          // Extrair informações da página
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          const title = titleMatch ? titleMatch[1] : "Sem título";

          // Contar elementos
          const linkCount = (html.match(/<a[^>]*>/gi) || []).length;
          const buttonCount = (html.match(/<button[^>]*>/gi) || []).length;
          const inputCount = (html.match(/<input[^>]*>/gi) || []).length;

          return `✅ Informações da página ${url}:
📄 Título: "${title}"
🔗 Links: ${linkCount}
🔘 Botões: ${buttonCount}
📝 Inputs: ${inputCount}`;
        } else {
          return `❌ Erro ao obter informações: ${response.status}`;
        }
      } catch (error) {
        return `❌ Erro ao obter informações: ${error}`;
      }
    },

    findElements: async (url: string, selector: string) => {
      try {
        const response = await fetch(
          `/api/proxy?url=${encodeURIComponent(url)}`,
        );
        if (response.ok) {
          const html = await response.text();

          // Simular busca de elementos (análise básica de HTML)
          let count = 0;
          let examples: string[] = [];

          if (selector === "a" || selector.includes("link")) {
            const linkMatches = html.match(/<a[^>]*>([^<]*)<\/a>/gi) || [];
            count = linkMatches.length;
            examples = linkMatches.slice(0, 3).map((link) => {
              const textMatch = link.match(/>([^<]*)</);
              return textMatch ? textMatch[1].trim() : "Link sem texto";
            });
          } else if (selector === "button" || selector.includes("button")) {
            const buttonMatches =
              html.match(/<button[^>]*>([^<]*)<\/button>/gi) || [];
            count = buttonMatches.length;
            examples = buttonMatches.slice(0, 3).map((btn) => {
              const textMatch = btn.match(/>([^<]*)</);
              return textMatch ? textMatch[1].trim() : "Botão sem texto";
            });
          } else if (selector.includes("input")) {
            const inputMatches = html.match(/<input[^>]*>/gi) || [];
            count = inputMatches.length;
            examples = inputMatches.slice(0, 3).map((input) => {
              const typeMatch = input.match(/type=["']([^"']*)/);
              const nameMatch = input.match(/name=["']([^"']*)/);
              return `Input ${typeMatch ? typeMatch[1] : "text"} ${nameMatch ? `(${nameMatch[1]})` : ""}`;
            });
          }

          return `✅ Encontrados ${count} elementos "${selector}" em ${url}:
${examples.length > 0 ? examples.map((ex, i) => `${i + 1}. ${ex}`).join("\n") : "Nenhum exemplo disponível"}`;
        } else {
          return `❌ Erro ao buscar elementos: ${response.status}`;
        }
      } catch (error) {
        return `❌ Erro ao buscar elementos: ${error}`;
      }
    },

    screenshot: async () => {
      // Simular screenshot - na verdade vamos mostrar informações sobre a funcionalidade
      return `📸 Screenshot simulado:
✅ Funcionalidade disponível via Screen Capture API
💡 Para screenshot real, use a versão com iframe ou extensão
🔧 Esta versão foca em análise de conteúdo HTML`;
    },
  };

  const connectToSimple = async () => {
    try {
      setIsLoading(true);
      setIsConnected(true);
      setTestResult("✅ Playwright Simples ativo!");
      setExecutionLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Playwright Simples inicializado`,
      ]);
    } catch (error) {
      setTestResult(`❌ Erro: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectFromSimple = () => {
    setIsConnected(false);
    setTestResult("");
    setExecutionLog([]);
  };

  const parsePrompt = (prompt: string) => {
    const actions: Array<{ name: string; args: any[] }> = [];
    const lowerPrompt = prompt.toLowerCase();

    // Detectar URL no prompt
    const urlMatch = prompt.match(/https?:\/\/[^\s]+/);
    const targetUrl = urlMatch ? urlMatch[0] : testUrl;

    // Detectar navegação
    if (
      lowerPrompt.includes("navegue") ||
      lowerPrompt.includes("abra") ||
      lowerPrompt.includes("vá")
    ) {
      actions.push({ name: "navigate", args: [targetUrl] });
    }

    // Detectar busca por informações
    if (
      lowerPrompt.includes("título") ||
      lowerPrompt.includes("informações") ||
      lowerPrompt.includes("info")
    ) {
      actions.push({ name: "getInfo", args: [targetUrl] });
    }

    // Detectar busca por elementos
    if (lowerPrompt.includes("link") || lowerPrompt.includes("links")) {
      actions.push({ name: "findElements", args: [targetUrl, "a"] });
    } else if (
      lowerPrompt.includes("botão") ||
      lowerPrompt.includes("button")
    ) {
      actions.push({ name: "findElements", args: [targetUrl, "button"] });
    } else if (lowerPrompt.includes("input") || lowerPrompt.includes("campo")) {
      actions.push({ name: "findElements", args: [targetUrl, "input"] });
    }

    // Detectar screenshot
    if (lowerPrompt.includes("screenshot") || lowerPrompt.includes("captura")) {
      actions.push({ name: "screenshot", args: [] });
    }

    // Se não detectou nenhuma ação específica, fazer análise geral
    if (actions.length === 0) {
      actions.push({ name: "getInfo", args: [targetUrl] });
    }

    return actions;
  };

  const executeSimpleTest = async () => {
    if (!isConnected) {
      setTestResult("❌ Playwright Simples não conectado");
      return;
    }

    try {
      setIsLoading(true);
      setTestResult("🚀 Executando ações...");

      const actions = parsePrompt(testPrompt);
      const results: string[] = [];

      setExecutionLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Iniciando: ${testPrompt}`,
      ]);

      for (const action of actions) {
        const tool = simpleTools[action.name as keyof typeof simpleTools];
        if (tool) {
          setExecutionLog((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] Executando: ${action.name}(${JSON.stringify(action.args)})`,
          ]);

          const result = await (tool as any)(...action.args);
          results.push(`${action.name}: ${result}`);

          setExecutionLog((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] Resultado: ${result.split("\n")[0]}...`,
          ]);

          // Aguardar entre ações
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      setTestResult(`✅ Execução concluída!\n\n${results.join("\n\n")}`);
      setExecutionLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Execução concluída!`,
      ]);
    } catch (error) {
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
          🎯 Playwright Simples (Funciona!)
        </h1>
        <p className="text-muted-foreground mt-2">
          Análise real de páginas web via proxy - sem CORS, sem complicações!
        </p>
      </div>

      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle>🎮 Controles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="test-url">URL para Analisar</Label>
            <Input
              id="test-url"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              placeholder="https://httpbin.org/html"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={connectToSimple}
              disabled={isLoading || isConnected}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "Conectando..." : "🚀 Ativar Playwright"}
            </Button>
            <Button
              variant="outline"
              onClick={disconnectFromSimple}
              disabled={!isConnected}
            >
              ⏹️ Desativar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Teste de Comandos */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>🎯 Análise de Páginas</CardTitle>
            <CardDescription>
              Execute comandos de análise em páginas web
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="test-prompt">Comando</Label>
              <Textarea
                id="test-prompt"
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                placeholder="Ex: Navegue para httpbin e me diga o título"
                rows={3}
              />
            </div>

            <Button
              onClick={executeSimpleTest}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? "🔄 Executando..." : "🚀 Executar Análise"}
            </Button>

            {testResult && (
              <div>
                <Label>Resultado</Label>
                <Textarea
                  value={testResult}
                  readOnly
                  rows={12}
                  className="mt-2 font-mono text-sm"
                />
              </div>
            )}

            <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded">
              <p className="font-semibold">💡 Comandos disponíveis:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>&quot;Navegue para https://example.com&quot;</li>
                <li>&quot;Me diga o título da página&quot;</li>
                <li>&quot;Encontre todos os links&quot;</li>
                <li>&quot;Quais botões existem na página?&quot;</li>
                <li>&quot;Mostre informações da página&quot;</li>
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

      {/* Instruções */}
      <Card className="border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-green-600">✅ O que Funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>✅ Análise de HTML:</strong> Extrai títulos, conta
            elementos, analisa estrutura
          </p>
          <p>
            <strong>✅ Sem CORS:</strong> Usa proxy para acessar qualquer site
          </p>
          <p>
            <strong>✅ Informações reais:</strong> Dados extraídos diretamente
            do HTML
          </p>
          <p>
            <strong>✅ Funciona sempre:</strong> Não depende de JavaScript da
            página
          </p>
          <p>
            <strong>✅ Rápido e confiável:</strong> Sem dependências complexas
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
