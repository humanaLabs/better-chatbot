import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function PlaywrightNav() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Testes do Playwright MCP</h1>
        <p className="text-muted-foreground mt-2">
          Escolha entre duas opções para testar o Playwright MCP
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Simulador (Sem Instalação) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">
              🚀 Simulador (Recomendado)
            </CardTitle>
            <CardDescription>
              Funciona 100% no browser, sem precisar instalar nada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm space-y-2">
              <li>✅ Sem instalação necessária</li>
              <li>✅ Funciona imediatamente</li>
              <li>✅ Usa APIs do browser</li>
              <li>✅ Screenshots via Screen Capture</li>
              <li>✅ Navegação em novas abas</li>
            </ul>

            <Link href="/playwright-simulator">
              <Button className="w-full">Usar Simulador</Button>
            </Link>
          </CardContent>
        </Card>

        {/* WebServer Transport */}
        <Card>
          <CardHeader>
            <CardTitle className="text-blue-600">
              🔧 WebServer Transport
            </CardTitle>
            <CardDescription>
              Conecta a um servidor Playwright MCP externo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm space-y-2">
              <li>⚙️ Requer servidor Playwright MCP</li>
              <li>🌐 Conexão via HTTP</li>
              <li>🔄 Bypass das verificações stdio</li>
              <li>📡 Comunicação em tempo real</li>
              <li>🎯 Playwright completo</li>
            </ul>

            <Link href="/playwright-test">
              <Button variant="outline" className="w-full">
                Usar WebServer Transport
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Qual escolher?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <strong className="text-green-600">Use o Simulador se:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Você quer testar imediatamente sem configuração</li>
                <li>Não quer instalar nada localmente</li>
                <li>Quer ver como as ferramentas funcionam</li>
                <li>Está apenas experimentando</li>
              </ul>
            </div>

            <div>
              <strong className="text-blue-600">
                Use o WebServer Transport se:
              </strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Você tem um servidor Playwright MCP rodando</li>
                <li>Quer usar o Playwright completo</li>
                <li>Precisa de automação web avançada</li>
                <li>Está testando a integração real</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
