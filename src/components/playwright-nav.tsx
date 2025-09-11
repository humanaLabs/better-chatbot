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
          Múltiplas soluções Playwright - da mais simples à mais avançada
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* WEBSERVER (PERFEITO PARA VERCEL!) */}
        <Card className="border-red-200 dark:border-red-800 ring-4 ring-red-400 shadow-xl">
          <CardHeader>
            <CardTitle className="text-red-600">
              🌐 WEBSERVER (PERFEITO!)
            </CardTitle>
            <CardDescription>
              Headless no servidor + WebView no cliente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm space-y-2">
              <li>
                🌐 <strong>Servidor headless</strong>
              </li>
              <li>👁️ WebView no cliente</li>
              <li>🔄 Sincronização automática</li>
              <li>✅ Funciona no Vercel</li>
              <li>🚫 Zero instalação</li>
              <li>⚡ Performance máxima</li>
            </ul>
            <Link href="/playwright-webserver">
              <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold">
                🌐 Usar WEBSERVER (IDEAL!)
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* MCP REAL (100% FUNCIONAL!) */}
        <Card className="border-red-200 dark:border-red-800 ring-4 ring-red-400 shadow-xl">
          <CardHeader>
            <CardTitle className="text-red-600">
              🎭 MCP REAL (100% FUNCIONAL!)
            </CardTitle>
            <CardDescription>
              Playwright MCP 100% REAL - não é mock!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm space-y-2">
              <li>
                🎭 <strong>Playwright 100% REAL</strong>
              </li>
              <li>🌐 Browser real com interface</li>
              <li>📸 Screenshots reais</li>
              <li>🔧 Execução nativa</li>
              <li>⚡ Performance máxima</li>
              <li>🚫 NÃO é simulação!</li>
            </ul>
            <Link href="/playwright-mcp-real">
              <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold">
                🎭 Usar MCP REAL (100%!)
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Vercel Bypass (FUNCIONA NO VERCEL!) */}
        <Card className="border-red-200 dark:border-red-800 ring-4 ring-red-400 shadow-xl">
          <CardHeader>
            <CardTitle className="text-red-600">
              🚀 Vercel Bypass (FUNCIONA NO VERCEL!)
            </CardTitle>
            <CardDescription>
              Burla a detecção de stdio transport do Vercel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm space-y-2">
              <li>
                🚫 <strong>Resolve erro stdio</strong>
              </li>
              <li>🔧 HTTP transport (não stdio)</li>
              <li>✅ Funciona no Vercel</li>
              <li>🎭 Simula MCP completo</li>
              <li>⚡ Zero instalação</li>
              <li>🔒 Sessões isoladas</li>
            </ul>
            <Link href="/playwright-vercel-bypass">
              <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold">
                🚀 Usar Vercel Bypass (FUNCIONA!)
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Server Sessions (SOLUÇÃO IDEAL!) */}
        <Card className="border-emerald-200 dark:border-emerald-800 ring-4 ring-emerald-400 shadow-xl">
          <CardHeader>
            <CardTitle className="text-emerald-600">
              🎭 Server Sessions (SOLUÇÃO IDEAL!)
            </CardTitle>
            <CardDescription>
              Browser-use no servidor com sessões por usuário
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm space-y-2">
              <li>
                🎭 <strong>Instância por usuário</strong>
              </li>
              <li>🖥️ Recursos dedicados do servidor</li>
              <li>🔒 Isolamento total entre sessões</li>
              <li>📹 VNC individual por usuário</li>
              <li>🌐 WebUI completo embutido</li>
              <li>🧹 Cleanup automático</li>
            </ul>
            <Link href="/playwright-server-sessions">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                🚀 Usar Server Sessions (IDEAL!)
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Zero-Install (REALIDADE!) */}
        <Card className="border-orange-200 dark:border-orange-800 ring-4 ring-orange-400 shadow-xl">
          <CardHeader>
            <CardTitle className="text-orange-600">
              🎯 Zero-Install (REALIDADE!)
            </CardTitle>
            <CardDescription>
              Limitações reais + soluções viáveis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm space-y-2">
              <li>
                🚫 <strong>Por que é impossível</strong>
              </li>
              <li>🌐 Browser APIs nativas</li>
              <li>📡 WebRTC screen share</li>
              <li>🔖 Bookmarklet injection</li>
              <li>⚙️ Service worker proxy</li>
              <li>💡 Recomendações realistas</li>
            </ul>
            <Link href="/playwright-zero-install">
              <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold">
                🎯 Ver Limitações Reais
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Browser-use (PROFISSIONAL!) */}
        <Card className="border-red-200 dark:border-red-800 ring-4 ring-red-400 shadow-xl">
          <CardHeader>
            <CardTitle className="text-red-600">
              🔥 Browser-use (PROFISSIONAL!)
            </CardTitle>
            <CardDescription>
              14.8k stars - Solução madura e completa!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm space-y-2">
              <li>
                🎭 <strong>Projeto maduro</strong> (14.8k ⭐)
              </li>
              <li>🤖 Multi-LLM (OpenAI, Anthropic...)</li>
              <li>🖥️ Usa seu browser existente</li>
              <li>📹 Screen recording HD</li>
              <li>🔄 Sessões persistentes</li>
              <li>🐳 Docker + VNC support</li>
            </ul>
            <Link href="/playwright-browser-use">
              <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold">
                🚀 Usar Browser-use (TOP!)
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Playwright Hybrid (MELHOR!) */}
        <Card className="border-purple-200 dark:border-purple-800 ring-4 ring-purple-400 shadow-lg">
          <CardHeader>
            <CardTitle className="text-purple-600">
              🎭 Playwright Hybrid (MELHOR!)
            </CardTitle>
            <CardDescription>
              WebView + Playwright MCP Real = Perfeito!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm space-y-2">
              <li>
                🎭 <strong>Playwright REAL</strong>
              </li>
              <li>🖥️ WebView para visualização</li>
              <li>🔄 Sincronização automática</li>
              <li>🚫 Sem instalação no cliente</li>
              <li>🌐 Transport HTTP custom</li>
              <li>⚡ Melhor dos dois mundos</li>
            </ul>
            <Link href="/playwright-hybrid">
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold">
                🚀 Usar Hybrid (MELHOR!)
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Playwright WebView (NOVO!) */}
        <Card className="border-purple-200 dark:border-purple-800 ring-2 ring-purple-300">
          <CardHeader>
            <CardTitle className="text-purple-600">
              🌐 Playwright WebView (NOVO!)
            </CardTitle>
            <CardDescription>
              Browser embutido na aplicação com controle total!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm space-y-2">
              <li>
                🆕 <strong>Browser embutido</strong>
              </li>
              <li>✅ Controle total do DOM</li>
              <li>✅ Sem CORS</li>
              <li>✅ Screenshots reais</li>
              <li>✅ Integração nativa</li>
              <li>✅ Sem instalação</li>
            </ul>
            <Link href="/playwright-webview">
              <Button className="w-full bg-purple-600 hover:bg-purple-700">
                🚀 Testar WebView (NOVO!)
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Playwright Simples (Funciona!) */}
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-green-600">
              🎯 Playwright Simples (Funciona!)
            </CardTitle>
            <CardDescription>
              Análise real de páginas - sem CORS, sem problemas!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm space-y-2">
              <li>✅ Funciona 100% sempre</li>
              <li>✅ Sem CORS</li>
              <li>✅ Análise real de HTML</li>
              <li>✅ Sem instalação</li>
              <li>✅ Rápido e confiável</li>
            </ul>

            <Link href="/playwright-simple">
              <Button className="w-full bg-green-600 hover:bg-green-700">
                Usar Simples (Funciona!)
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Playwright REAL */}
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardHeader>
            <CardTitle className="text-yellow-600">
              🎭 Playwright REAL
            </CardTitle>
            <CardDescription>
              Controle REAL do browser usando APIs nativas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm space-y-2">
              <li>✅ Controle 100% real</li>
              <li>✅ Sem instalação necessária</li>
              <li>✅ Abre janelas reais</li>
              <li>⚠️ Limitado por CORS</li>
            </ul>

            <Link href="/playwright-real">
              <Button
                variant="outline"
                className="w-full border-yellow-200 text-yellow-600 hover:bg-yellow-50"
              >
                Usar Playwright REAL
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Simulador Educativo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-blue-600">
              🎪 Simulador Educativo
            </CardTitle>
            <CardDescription>
              Simula ferramentas do Playwright para demonstração
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm space-y-2">
              <li>✅ Funciona 100% offline</li>
              <li>✅ Resultados educativos</li>
              <li>✅ Sem configuração</li>
              <li>⚠️ Apenas simulação</li>
            </ul>

            <Link href="/playwright-simulator">
              <Button variant="outline" className="w-full">
                Usar Simulador
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* WebServer Transport */}
        <Card>
          <CardHeader>
            <CardTitle className="text-orange-600">
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
              <li>🎯 Playwright oficial completo</li>
            </ul>

            <Link href="/playwright-test">
              <Button variant="outline" className="w-full">
                Usar WebServer Transport
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Extensão (Sem CORS) */}
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="text-purple-600">
              🧩 Extensão (Sem CORS)
            </CardTitle>
            <CardDescription>
              Extensão do browser que elimina limitações CORS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm space-y-2">
              <li>✅ Zero limitações CORS</li>
              <li>✅ Controle universal</li>
              <li>✅ Funciona em todos os sites</li>
              <li>⚙️ Requer instalação da extensão</li>
            </ul>

            <div className="space-y-2">
              <Link href="/playwright-extension">
                <Button
                  variant="outline"
                  className="w-full border-purple-200 text-purple-600 hover:bg-purple-50"
                >
                  Criar Extensão
                </Button>
              </Link>
              <Link href="/playwright-extension-test">
                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-xs">
                  Testar Extensão
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Proxy Server */}
        <Card className="border-cyan-200 dark:border-cyan-800">
          <CardHeader>
            <CardTitle className="text-cyan-600">🌐 Proxy Server</CardTitle>
            <CardDescription>
              Servidor proxy local que contorna CORS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm space-y-2">
              <li>✅ Sem limitações CORS</li>
              <li>✅ Injeta controle automático</li>
              <li>✅ API REST para comandos</li>
              <li>⚙️ Requer servidor Node.js</li>
            </ul>

            <Link href="/playwright-proxy">
              <Button
                variant="outline"
                className="w-full border-cyan-200 text-cyan-600 hover:bg-cyan-50"
              >
                Configurar Proxy
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Iframe (Solução CORS) */}
        <Card className="border-indigo-200 dark:border-indigo-800">
          <CardHeader>
            <CardTitle className="text-indigo-600">
              🖼️ Iframe (CORS Resolvido!)
            </CardTitle>
            <CardDescription>
              Controle via iframe com proxy - CORS 100% resolvido
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm space-y-2">
              <li>✅ CORS 100% resolvido</li>
              <li>✅ Funciona em qualquer site</li>
              <li>✅ Controle visual em tempo real</li>
              <li>✅ Sem instalação necessária</li>
            </ul>

            <Link href="/playwright-iframe">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                Usar Iframe (CORS Fixed!)
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
              <strong className="text-red-600">🥇 Use o WEBSERVER se:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Quer executar no Vercel/webserver</li>
                <li>Precisa de Playwright REAL + visual</li>
                <li>Quer sincronização automática</li>
                <li>Zero instalação no cliente</li>
              </ul>
            </div>

            <div>
              <strong className="text-orange-600">🥈 Use o MCP REAL se:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Está desenvolvendo localmente</li>
                <li>Quer browser visual no servidor</li>
                <li>Não precisa rodar no Vercel</li>
                <li>Quer máximo controle</li>
              </ul>
            </div>

            <div>
              <strong className="text-orange-600">
                🥈 Use o Vercel Bypass se:
              </strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Está no Vercel e tem erro stdio</li>
                <li>Quer solução que funciona AGORA</li>
                <li>Precisa de zero instalação</li>
                <li>Aceita MCP simulado</li>
              </ul>
            </div>

            <div>
              <strong className="text-emerald-600">
                🥈 Use o Server Sessions se:
              </strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Quer a solução IDEAL e completa</li>
                <li>Precisa de isolamento por usuário</li>
                <li>Quer recursos dedicados do servidor</li>
                <li>Precisa de WebUI + VNC embutidos</li>
              </ul>
            </div>

            <div>
              <strong className="text-red-600">🥈 Use o Browser-use se:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Quer solução profissional e madura</li>
                <li>Precisa de múltiplos LLMs</li>
                <li>Quer usar seu browser existente</li>
                <li>Precisa de screen recording</li>
              </ul>
            </div>

            <div>
              <strong className="text-purple-600">🥈 Use o Hybrid se:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Quer Playwright REAL + Visualização</li>
                <li>Precisa de automação robusta</li>
                <li>Tem servidor MCP disponível</li>
                <li>Quer o melhor dos dois mundos</li>
              </ul>
            </div>

            <div>
              <strong className="text-purple-600">🥈 Use o WebView se:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Quer apenas simulação visual</li>
                <li>Não tem servidor MCP</li>
                <li>Precisa de algo imediato</li>
                <li>Quer browser embutido simples</li>
              </ul>
            </div>

            <div>
              <strong className="text-green-600">🥈 Use o Simples se:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Quer algo que funciona 100% sempre</li>
                <li>Precisa analisar conteúdo de páginas</li>
                <li>Quer sem CORS e sem complicações</li>
                <li>Prefere rapidez e confiabilidade</li>
              </ul>
            </div>

            <div>
              <strong className="text-purple-600">🥈 Use a Extensão se:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Quer controle em abas separadas</li>
                <li>Precisa de máxima flexibilidade</li>
                <li>Não se importa em instalar extensão</li>
                <li>Quer automação avançada</li>
              </ul>
            </div>

            <div>
              <strong className="text-cyan-600">🥈 Use o Proxy se:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Quer controle real sem CORS</li>
                <li>Prefere não instalar extensões</li>
                <li>Tem Node.js disponível</li>
                <li>Quer API REST para automação</li>
              </ul>
            </div>

            <div>
              <strong className="text-green-600">
                🥉 Use o Playwright REAL se:
              </strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Quer algo imediato sem instalação</li>
                <li>Sites simples ou locais (sem CORS restritivo)</li>
                <li>Precisa de screenshots reais</li>
                <li>Está fazendo testes rápidos</li>
              </ul>
            </div>

            <div>
              <strong className="text-blue-600">Use o Simulador se:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Quer apenas demonstração educativa</li>
                <li>Está aprendendo sobre Playwright</li>
                <li>Precisa de funcionalidade 100% offline</li>
                <li>Não precisa de controle real</li>
              </ul>
            </div>

            <div>
              <strong className="text-orange-600">
                Use o WebServer Transport se:
              </strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Tem servidor Playwright MCP rodando</li>
                <li>Quer usar o Playwright oficial completo</li>
                <li>Precisa de todas as funcionalidades avançadas</li>
                <li>Está em ambiente de produção</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
