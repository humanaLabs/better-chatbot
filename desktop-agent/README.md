# 🎭 Better Chatbot Desktop Agent

Agente desktop local para controle híbrido do navegador - a solução definitiva que combina o melhor dos mundos: **navegador real no cliente** + **controle via servidor web**.

## 🚀 Características

- **🖥️ Navegador Real**: Usa o Chrome/Firefox instalado do usuário
- **📱 Tray App**: Roda em background, sempre disponível
- **🔌 Dual Protocol**: WebSocket + HTTP para máxima compatibilidade
- **🎭 Playwright Engine**: Controle completo e confiável
- **🔄 Auto-start**: Inicialização automática com o sistema
- **📊 Status UI**: Interface visual para monitoramento
- **🌐 MCP Compatible**: Funciona com servidores MCP existentes

## 📋 Arquitetura

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Servidor Web  │◄──►│  Desktop Agent   │◄──►│ Navegador Real  │
│  (Next.js API)  │    │  (Electron App)  │    │ (Chrome/Firefox)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                       │                       │
        │              ┌────────┼────────┐             │
        │              │        │        │             │
        ▼              ▼        ▼        ▼             ▼
   WebSocket      HTTP API   Tray UI  Playwright   Usuário vê
   ws://8765      :8766      Status    Engine       e interage
```

## 🛠️ Instalação

### 1. Instalar Dependências
```bash
cd desktop-agent
npm install
```

### 2. Compilar TypeScript
```bash
npm run build
```

### 3. Executar em Desenvolvimento
```bash
npm run dev
```

### 4. Gerar Executável
```bash
npm run dist
```

## 🎯 Como Usar

### 1. **Iniciar o Agente Desktop**
- Execute o arquivo `.exe` gerado
- Aparecerá um ícone na bandeja do sistema
- O agente ficará rodando em background

### 2. **Conectar do Servidor Web**

#### Via WebSocket (Recomendado):
```javascript
const ws = new WebSocket('ws://localhost:8765');

ws.send(JSON.stringify({
  id: 'unique-id',
  action: 'navigate',
  data: { url: 'https://google.com' }
}));
```

#### Via HTTP API:
```javascript
const response = await fetch('http://localhost:8766/playwright/navigate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://google.com' })
});
```

#### Via MCP (Compatibilidade):
```javascript
const response = await fetch('http://localhost:8766/mcp/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tool: 'browser_navigate',
    arguments: { url: 'https://google.com' }
  })
});
```

## 🔧 API Reference

### Ações Disponíveis

| Ação | Parâmetros | Descrição |
|------|------------|-----------|
| `navigate` | `{ url: string }` | Navegar para URL |
| `click` | `{ selector: string }` | Clicar em elemento |
| `type` | `{ selector: string, text: string }` | Digitar texto |
| `screenshot` | `{}` | Capturar screenshot |
| `getTitle` | `{}` | Obter título da página |
| `getUrl` | `{}` | Obter URL atual |

### Exemplo Completo
```javascript
// Navegar
await fetch('http://localhost:8766/playwright/navigate', {
  method: 'POST',
  body: JSON.stringify({ url: 'https://google.com' })
});

// Clicar no campo de busca
await fetch('http://localhost:8766/playwright/click', {
  method: 'POST',
  body: JSON.stringify({ selector: 'input[name="q"]' })
});

// Digitar
await fetch('http://localhost:8766/playwright/type', {
  method: 'POST',
  body: JSON.stringify({ 
    selector: 'input[name="q"]', 
    text: 'playwright automation' 
  })
});

// Screenshot
const screenshot = await fetch('http://localhost:8766/playwright/screenshot', {
  method: 'POST',
  body: JSON.stringify({})
});
```

## 🎭 Integração com Better Chatbot

### Atualizar a API Hybrid
Modifique `src/app/api/mcp/playwright-hybrid/route.ts`:

```typescript
async function handleConnect(serverUrl: string) {
  try {
    // Tentar conectar ao Desktop Agent local
    const response = await fetch('http://localhost:8766/status');
    
    if (response.ok) {
      const tools = [
        "browser_navigate", "browser_click", "browser_type",
        "browser_screenshot", "browser_get_title", "browser_get_url"
      ];

      mcpConnections.set("default", {
        type: "desktop-agent",
        serverUrl: "http://localhost:8766",
        tools,
        connected: true,
      });

      return NextResponse.json({
        success: true,
        tools: tools,
        message: "Conectado ao Desktop Agent local",
      });
    }
  } catch (error) {
    // Fallback para mock...
  }
}
```

## 🔥 Vantagens da Solução

### ✅ **Para o Usuário**:
- **Navegador real** que ele já usa e confia
- **Zero configuração** - instala e funciona
- **Privacidade total** - tudo roda local
- **Performance nativa** - sem overhead de servidor

### ✅ **Para o Desenvolvedor**:
- **API simples** - WebSocket + HTTP
- **MCP compatível** - funciona com código existente
- **Debugging fácil** - navegador visível
- **Escalável** - cada cliente tem sua instância

### ✅ **Para o Sistema**:
- **Sem sobrecarga no servidor** - processamento distribuído
- **Conexão direta** - latência mínima
- **Fault tolerant** - falha de um não afeta outros
- **Cross-platform** - Windows, Mac, Linux

## 🚀 Próximos Passos

1. **Testar o agente desktop** localmente
2. **Integrar com a API hybrid** existente
3. **Criar instalador** para distribuição
4. **Adicionar auto-update** para manutenção
5. **Implementar autenticação** se necessário

Esta é a **solução híbrida definitiva** que vocês estavam procurando! 🎉
