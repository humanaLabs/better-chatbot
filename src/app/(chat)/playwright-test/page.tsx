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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlaywrightTestTransport } from "@/lib/ai/mcp/playwright-test-transport";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export default function PlaywrightTestPage() {
  const [webServerUrl, setWebServerUrl] = useState("http://localhost:3001");
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("");
  const [availableTools, setAvailableTools] = useState<string[]>([]);
  const [testPrompt, setTestPrompt] = useState(
    "Abra o Google e tire uma screenshot",
  );
  const [testResult, setTestResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  let mcpClient: Client | null = null;
  let transport: PlaywrightTestTransport | null = null;

  const connectToPlaywright = async () => {
    try {
      setIsLoading(true);
      setConnectionStatus("Conectando ao Playwright MCP...");

      // Criar transport customizado para teste
      transport = new PlaywrightTestTransport(webServerUrl);

      // Criar cliente MCP
      mcpClient = new Client({
        name: "playwright-test-client",
        version: "1.0.0",
      });

      // Conectar
      await mcpClient.connect(transport);

      // Listar ferramentas disponíveis
      const toolsResult = await mcpClient.listTools();
      const toolNames = toolsResult.tools.map((tool) => tool.name);

      setAvailableTools(toolNames);
      setIsConnected(true);
      setConnectionStatus(
        `Conectado! ${toolNames.length} ferramentas disponíveis.`,
      );
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

  const disconnectFromPlaywright = async () => {
    try {
      if (transport) {
        await transport.close();
        transport = null;
      }
      mcpClient = null;
      setIsConnected(false);
      setConnectionStatus("Desconectado");
      setAvailableTools([]);
    } catch (error) {
      console.error("Erro ao desconectar:", error);
    }
  };

  const testPlaywrightTool = async () => {
    if (!mcpClient || !isConnected) {
      setTestResult("Erro: Cliente não conectado");
      return;
    }

    try {
      setIsLoading(true);
      setTestResult("Executando teste...");

      // Criar ferramentas MCP para usar com AI SDK
      const tools: Record<string, any> = {};

      const toolsResult = await mcpClient.listTools();
      for (const tool of toolsResult.tools) {
        tools[tool.name] = {
          description: tool.description,
          parameters: tool.inputSchema,
          execute: async (args: any) => {
            const result = await mcpClient!.callTool({
              name: tool.name,
              arguments: args,
            });
            return result.content;
          },
        };
      }

      // Usar AI SDK com as ferramentas do Playwright
      const result = await generateText({
        model: openai("gpt-4"),
        tools,
        prompt: testPrompt,
      });

      setTestResult(
        `Resultado:\n${result.text}\n\nSteps executados: ${result.steps?.length || 0}`,
      );
    } catch (error) {
      console.error("Erro no teste:", error);
      setTestResult(
        `Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Teste do Playwright WebServer Transport
        </h1>
        <p className="text-muted-foreground mt-2">
          Esta página testa diretamente nossa implementação customizada do
          Playwright MCP via webserver, bypassando as verificações do servidor
          principal.
        </p>
      </div>

      {/* Configuração de Conexão */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração de Conexão</CardTitle>
          <CardDescription>
            Configure a URL do servidor Playwright MCP webserver
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="webserver-url">URL do WebServer</Label>
            <Input
              id="webserver-url"
              value={webServerUrl}
              onChange={(e) => setWebServerUrl(e.target.value)}
              placeholder="http://localhost:3001"
              disabled={isConnected}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={connectToPlaywright}
              disabled={isLoading || isConnected}
            >
              {isLoading ? "Conectando..." : "Conectar"}
            </Button>
            <Button
              variant="outline"
              onClick={disconnectFromPlaywright}
              disabled={!isConnected}
            >
              Desconectar
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
            <CardTitle>Ferramentas Disponíveis</CardTitle>
            <CardDescription>
              Ferramentas do Playwright MCP detectadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {availableTools.map((tool) => (
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
              Teste uma ferramenta do Playwright usando AI SDK
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
              onClick={testPlaywrightTool}
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
                  rows={10}
                  className="mt-2 font-mono text-sm"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instruções */}
      <Card>
        <CardHeader>
          <CardTitle>Instruções</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>1.</strong> Certifique-se de que o Playwright MCP está
            rodando como webserver na URL especificada
          </p>
          <p>
            <strong>2.</strong> Clique em &quot;Conectar&quot; para estabelecer
            conexão via nosso transport customizado
          </p>
          <p>
            <strong>3.</strong> Verifique as ferramentas disponíveis listadas
          </p>
          <p>
            <strong>4.</strong> Digite um prompt de teste e execute para ver o
            Playwright em ação
          </p>
          <p>
            <strong>Exemplo de comando para rodar Playwright MCP:</strong>
          </p>
          <code className="block bg-muted p-2 rounded mt-2">
            npx @playwright/mcp --server --port 3001
          </code>
        </CardContent>
      </Card>
    </div>
  );
}
