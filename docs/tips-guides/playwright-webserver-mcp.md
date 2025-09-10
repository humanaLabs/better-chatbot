# Playwright MCP via WebServer

Este guia explica como configurar o Playwright MCP para funcionar via webserver ao invés de stdio, permitindo que o browser seja executado no lado do cliente.

## Visão Geral

O transport customizado `PlaywrightWebServerTransport` permite conectar ao Playwright MCP através de um webserver HTTP ao invés da comunicação stdio padrão. Isso é útil quando:

- Você quer que o browser seja executado no lado do cliente
- Há problemas com stdio transport em ambientes específicos
- Você precisa de mais controle sobre a comunicação

## Configuração

### 1. Configurar o Servidor Playwright MCP

Primeiro, você precisa executar o Playwright MCP como um webserver. Isso pode ser feito de várias formas:

#### Opção A: Servidor Local
```bash
# Instalar o Playwright MCP
npm install @playwright/mcp

# Executar como webserver (exemplo)
npx @playwright/mcp --server --port 3001
```

#### Opção B: Servidor Docker
```dockerfile
FROM node:18
RUN npm install -g @playwright/mcp
EXPOSE 3001
CMD ["npx", "@playwright/mcp", "--server", "--port", "3001"]
```

### 2. Configurar o Cliente MCP

No arquivo de configuração MCP (por exemplo, `.cursor/mcp.json`), configure o servidor Playwright com as variáveis de ambiente necessárias:

```json
{
  "servers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"],
      "env": {
        "PLAYWRIGHT_WEBSERVER_URL": "http://localhost:3001",
        "PLAYWRIGHT_HEADERS": "{\"Authorization\": \"Bearer your-token\"}"
      }
    }
  }
}
```

### 3. Variáveis de Ambiente

- `PLAYWRIGHT_WEBSERVER_URL`: URL do servidor Playwright MCP webserver
- `PLAYWRIGHT_HEADERS` (opcional): Headers HTTP adicionais em formato JSON

## Como Funciona

1. **Detecção Automática**: O sistema detecta automaticamente quando um servidor MCP é do Playwright baseado nos argumentos
2. **Transport Customizado**: Usa `PlaywrightWebServerTransport` ao invés do stdio padrão
3. **Proxy API**: As requisições passam pelo endpoint `/api/mcp/playwright-proxy`
4. **Server-Sent Events**: Mensagens do servidor são recebidas via SSE

## Fluxo de Comunicação

```
Cliente MCP → PlaywrightWebServerTransport → /api/mcp/playwright-proxy → Playwright MCP WebServer
                                                      ↓
Cliente MCP ← Server-Sent Events ← /api/mcp/playwright-proxy ← Playwright MCP WebServer
```

## Exemplo de Uso

```typescript
import { experimental_createMCPClient as createMCPClient } from 'ai';

// O cliente será automaticamente configurado para usar PlaywrightWebServerTransport
// se PLAYWRIGHT_WEBSERVER_URL estiver definido
const mcpClient = await createMCPClient({
  transport: {
    type: 'stdio', // Será automaticamente convertido para webserver
    command: 'npx',
    args: ['@playwright/mcp@latest'],
    env: {
      PLAYWRIGHT_WEBSERVER_URL: 'http://localhost:3001'
    }
  }
});

const tools = await mcpClient.tools();

// Usar as ferramentas do Playwright
const result = await generateText({
  model: openai('gpt-4'),
  tools,
  prompt: 'Abra o Google e tire uma screenshot',
});
```

## Vantagens

- **Browser no Cliente**: O browser é executado no lado do cliente, não no servidor
- **Melhor Performance**: Evita overhead de comunicação stdio
- **Flexibilidade**: Permite configurações HTTP customizadas
- **Debugging**: Mais fácil de debuggar com ferramentas HTTP

## Limitações

- Requer um servidor Playwright MCP separado
- Mais complexo de configurar que stdio
- Dependente de conectividade de rede

## Troubleshooting

### Erro: "Failed to initialize Playwright MCP connection"
- Verifique se o servidor Playwright MCP está rodando
- Confirme se a URL está correta
- Verifique conectividade de rede

### Erro: "Session not found"
- Pode indicar que a sessão expirou
- Tente reconectar o cliente MCP

### Browser não abre
- Verifique se o Playwright está instalado no servidor
- Confirme se as permissões estão corretas
- Verifique logs do servidor Playwright MCP
