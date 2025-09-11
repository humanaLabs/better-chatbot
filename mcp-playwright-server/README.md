# 🎭 Servidor MCP Playwright Real

Servidor HTTP que expõe Playwright como MCP tools via API REST.

## 🚀 Instalação e Uso

### 1. Instalar dependências:
```bash
cd mcp-playwright-server
npm install
```

### 2. Instalar browsers Playwright:
```bash
npx playwright install chromium
```

### 3. Rodar servidor:
```bash
npm start
```

### 4. Testar se está funcionando:
```bash
curl http://localhost:3001/mcp/status
```

## 📡 API Endpoints

### GET /mcp/tools
Lista ferramentas disponíveis
```json
{
  "success": true,
  "tools": ["browser_navigate", "browser_click", "browser_type", ...],
  "message": "Servidor MCP Playwright Real ativo"
}
```

### POST /mcp/execute
Executa uma ferramenta
```json
{
  "tool": "browser_navigate",
  "arguments": {
    "url": "https://google.com"
  }
}
```

### GET /mcp/status
Status do servidor
```json
{
  "success": true,
  "status": "running",
  "browser_active": true,
  "page_active": true,
  "tools": 8,
  "uptime": 123.45
}
```

## 🎯 Ferramentas Disponíveis

- **browser_navigate** - Navegar para URL
- **browser_click** - Clicar em elemento
- **browser_type** - Digitar texto
- **browser_screenshot** - Capturar tela
- **browser_get_title** - Obter título
- **browser_get_url** - Obter URL atual
- **browser_wait** - Aguardar tempo
- **browser_close** - Fechar browser

## 🔧 Configuração

- **Porta**: 3001 (padrão)
- **Browser**: Chromium (visível)
- **Screenshots**: Salvos em `./screenshots/`
- **CORS**: Habilitado para todas origens

## 🎭 Integração com Hybrid

1. Rode este servidor: `npm start`
2. Vá para `/playwright-hybrid` 
3. Configure URL: `http://localhost:3001`
4. Clique "🔌 Conectar ao MCP"
5. Agora você tem Playwright REAL! 🚀
