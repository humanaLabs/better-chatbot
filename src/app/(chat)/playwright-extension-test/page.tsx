"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export default function PlaywrightExtensionTestPage() {
  const [testUrl, setTestUrl] = useState("https://google.com");
  const [testPrompt, setTestPrompt] = useState(
    "Clique no campo de busca e digite 'playwright test'",
  );
  const [testResult, setTestResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [executionLog, setExecutionLog] = useState<string[]>([]);

  // Verificar se a extensão está instalada
  const checkExtension = () => {
    // Abrir uma nova aba e verificar se a extensão está ativa
    const newWindow = window.open(testUrl, "_blank");

    if (newWindow) {
      setTimeout(() => {
        try {
          // Tentar acessar a API da extensão
          const hasExtension =
            (newWindow as any).playwrightController !== undefined;

          if (hasExtension) {
            setTestResult("✅ Extensão detectada e funcionando!");
            setExecutionLog((prev) => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] Extensão Playwright detectada`,
            ]);
          } else {
            setTestResult(
              "❌ Extensão não detectada. Certifique-se de que está instalada.",
            );
            setExecutionLog((prev) => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] Extensão não encontrada`,
            ]);
          }
        } catch (_error) {
          setTestResult(
            "⚠️ Não foi possível verificar a extensão (CORS). Mas ela pode estar funcionando!",
          );
          setExecutionLog((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] Verificação bloqueada por CORS`,
          ]);
        }
      }, 2000);
    }
  };

  const executeExtensionTest = async () => {
    setIsLoading(true);
    setTestResult("🚀 Abrindo nova aba para teste...");

    // Abrir nova aba com a URL de teste
    const newWindow = window.open(testUrl, "_blank");

    if (!newWindow) {
      setTestResult("❌ Não foi possível abrir nova aba (popup bloqueado)");
      setIsLoading(false);
      return;
    }

    setExecutionLog((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Nova aba aberta: ${testUrl}`,
    ]);

    // Aguardar a página carregar
    setTimeout(() => {
      setTestResult(`✅ Aba aberta com sucesso!

🎯 **Como testar a extensão:**

1. **Vá para a nova aba** que foi aberta
2. **Abra o Console** (F12 → Console)
3. **Digite os comandos** abaixo no console:

**Comandos disponíveis:**
\`\`\`javascript
// Clicar no campo de busca do Google
window.playwrightController.click('input[name="q"]')

// Digitar texto
window.playwrightController.type('input[name="q"]', 'playwright test')

// Obter título da página
window.playwrightController.getTitle()

// Obter URL atual
window.playwrightController.getUrl()

// Tirar screenshot (se html2canvas estiver disponível)
window.playwrightController.screenshot()
\`\`\`

**Se os comandos funcionarem, a extensão está instalada corretamente!** ✅`);

      setExecutionLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Instruções enviadas`,
        `[${new Date().toLocaleTimeString()}] Teste a extensão no console da nova aba`,
      ]);

      setIsLoading(false);
    }, 2000);
  };

  const parsePromptToCommands = (prompt: string) => {
    const commands: string[] = [];
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes("clique") || lowerPrompt.includes("click")) {
      if (lowerPrompt.includes("busca") || lowerPrompt.includes("search")) {
        commands.push(`window.playwrightController.click('input[name="q"]')`);
      } else if (
        lowerPrompt.includes("botão") ||
        lowerPrompt.includes("button")
      ) {
        commands.push(`window.playwrightController.click('button')`);
      } else {
        commands.push(`window.playwrightController.click('a, button, input')`);
      }
    }

    if (
      lowerPrompt.includes("digite") ||
      lowerPrompt.includes("escreva") ||
      lowerPrompt.includes("type")
    ) {
      const textMatch = prompt.match(/"([^"]+)"/);
      const text = textMatch ? textMatch[1] : "teste";
      commands.push(
        `window.playwrightController.type('input[name="q"]', '${text}')`,
      );
    }

    if (lowerPrompt.includes("título") || lowerPrompt.includes("title")) {
      commands.push(`window.playwrightController.getTitle()`);
    }

    if (lowerPrompt.includes("screenshot") || lowerPrompt.includes("captura")) {
      commands.push(`window.playwrightController.screenshot()`);
    }

    return commands;
  };

  const generateCommands = () => {
    const commands = parsePromptToCommands(testPrompt);

    if (commands.length > 0) {
      setTestResult(`🎯 **Comandos gerados para seu prompt:**

Cole estes comandos no **Console da nova aba** (F12):

\`\`\`javascript
${commands.join("\n\n")}
\`\`\`

**Como usar:**
1. Abra uma nova aba com ${testUrl}
2. Abra o Console (F12)
3. Cole e execute os comandos acima
4. Veja a extensão funcionando! ✅`);

      setExecutionLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Comandos gerados: ${commands.length} comandos`,
      ]);
    } else {
      setTestResult(
        "❌ Não foi possível gerar comandos para este prompt. Tente algo como: 'Clique no campo de busca e digite teste'",
      );
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">🧩 Teste da Extensão Playwright</h1>
        <p className="text-muted-foreground mt-2">
          Teste se a extensão Playwright está instalada e funcionando
        </p>
      </div>

      {/* Status da Extensão */}
      <Card className="border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="text-purple-600">📋 Pré-requisitos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <span>1.</span>
            <span>Extensão Playwright instalada no Chrome</span>
          </div>
          <div className="flex items-center gap-2">
            <span>2.</span>
            <span>Popups permitidos para este site</span>
          </div>
          <div className="flex items-center gap-2">
            <span>3.</span>
            <span>Console do desenvolvedor acessível (F12)</span>
          </div>
        </CardContent>
      </Card>

      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle>🎮 Controles de Teste</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="test-url">URL para Testar</Label>
            <Input
              id="test-url"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              placeholder="https://google.com"
            />
          </div>

          <div>
            <Label htmlFor="test-prompt">Comando para Testar</Label>
            <Textarea
              id="test-prompt"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Ex: Clique no campo de busca e digite 'playwright test'"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={executeExtensionTest}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? "Abrindo..." : "🚀 Abrir Aba de Teste"}
            </Button>

            <Button
              onClick={generateCommands}
              variant="outline"
              className="border-purple-200 text-purple-600 hover:bg-purple-50"
            >
              🎯 Gerar Comandos
            </Button>

            <Button onClick={checkExtension} variant="outline">
              🔍 Verificar Extensão
            </Button>
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
              rows={15}
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

      {/* Instruções Detalhadas */}
      <Card className="border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-green-600">
            ✅ Como Instalar a Extensão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <strong>1. Gerar arquivos:</strong>
            <p>
              Vá para <code>/playwright-extension</code> e baixe os arquivos
            </p>
          </div>
          <div>
            <strong>2. Instalar no Chrome:</strong>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>
                Abra <code>chrome://extensions/</code>
              </li>
              <li>Ative &quot;Modo do desenvolvedor&quot;</li>
              <li>Clique &quot;Carregar sem compactação&quot;</li>
              <li>Selecione a pasta com os arquivos</li>
            </ul>
          </div>
          <div>
            <strong>3. Testar:</strong>
            <p>Use esta página para gerar comandos e testar no console</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
