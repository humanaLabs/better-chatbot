# 🔄 Template de Replicação - Playwright Hybrid com Visão Computacional

## 🆕 **SISTEMA DE VISÃO INTEGRADO**
- **👁️ GPT-4V**: Análise visual de screenshots
- **🧠 LLM Integration**: Vercel AI SDK v5
- **📍 Coordenadas**: Posição exata dos elementos  
- **🎨 Contexto Visual**: Cores, tamanhos, layout

## 📋 Checklist para Implementar em Nova Aplicação

### 🎯 Passo 1: Estrutura de Pastas
```
nova-aplicacao/
├── desktop-agent/                    # ✅ Criar esta pasta
│   ├── src/
│   │   └── simple-agent.ts          # ✅ Copiar arquivo
│   ├── package.json                 # ✅ Copiar arquivo
│   ├── tsconfig.json               # ✅ Copiar arquivo
│   ├── SETUP-CLIENTE-AUTOMATICO.bat # ✅ Copiar arquivo
│   └── README-CLIENTE.md           # ✅ Copiar arquivo
└── src/
    ├── app/
    │   ├── (chat)/
    │   │   └── playwright-hybrid/
    │   │       └── page.tsx         # ✅ Criar página
    │   └── api/
    │       └── mcp/
    │           └── playwright-hybrid/
    │               └── route.ts     # ✅ Criar API
    └── components/
```

### 🎯 Passo 2: Arquivos do Desktop Agent

#### `desktop-agent/package.json`
```json
{
  "name": "desktop-agent-[NOME-APP]",
  "version": "1.0.0",
  "description": "Desktop Agent para [NOME-APP]",
  "main": "dist/simple-agent.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/simple-agent.js",
    "dev": "tsc -w"
  },
  "dependencies": {
    "playwright": "^1.40.0",
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "@types/express": "^4.17.0",
    "@types/cors": "^2.8.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

#### `desktop-agent/tsconfig.json`
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

#### `desktop-agent/src/simple-agent.ts`
```typescript
// ✅ COPIAR ARQUIVO COMPLETO da implementação atual
// Ajustar apenas:
// - Nome da aplicação nos logs
// - Porta (se necessário)
// - Comandos específicos (se necessário)
```

### 🎯 Passo 3: API Backend

#### `src/app/api/mcp/playwright-hybrid/route.ts`
```typescript
// ✅ COPIAR ARQUIVO COMPLETO da implementação atual
// PONTOS CRÍTICOS - NÃO ALTERAR:
// - Headers "ngrok-skip-browser-warning": "true"
// - Prioridade: URL personalizada → localhost
// - Timeouts: 5000ms (tunnel), 3000ms (local)
// - Validação: agentStatus.agent.includes("desktop")
```

### 🎯 Passo 4: Frontend

#### `src/app/(chat)/playwright-hybrid/page.tsx`

**🎨 Nova Interface Estilo ChatGPT - Conversacional + Visão**

```typescript
// ✅ COPIAR ARQUIVO COMPLETO da implementação atual

// 🎯 CARACTERÍSTICAS DA NOVA INTERFACE:
// - Interface de chat conversacional (como ChatGPT)
// - Comandos em linguagem natural
// - Design minimalista e limpo
// - Status de conexão visual
// - Botões de comando rápido

// PERSONALIZAÇÕES PERMITIDAS:
// - Textos das mensagens
// - Cores e estilos do chat
// - Comandos de exemplo nos botões
// - Placeholder da URL de conexão
// - Ícones e badges

// NÃO ALTERAR:
// - Lógica de conexão com Desktop Agent
// - Headers das requisições HTTP
// - Estrutura da API de comunicação
// - Sistema de mensagens e estados

// 🔧 DEPENDÊNCIAS ADICIONAIS:
import { Send, Bot, User, Globe, Monitor, Zap, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// 📱 ESTRUTURA DA INTERFACE:
// 1. Header com status de conexão
// 2. Área de mensagens (chat)
// 3. Input de comando com botões rápidos
// 4. Setup de conexão minimalista
```

### **🎯 Vantagens da Nova Interface:**

- **💬 Conversacional**: Usuário digita comandos naturais como "Abra o Google"
- **🎨 Minimalista**: Sem controles complexos, apenas chat e conexão
- **🤖 Inteligente**: Interpreta linguagem natural automaticamente
- **📱 Moderna**: Design limpo inspirado no ChatGPT
- **⚡ Intuitiva**: Botões de comando rápido para ações comuns
- **📊 Visual**: Status de conexão claro com badges e ícones

### 🎯 Passo 4.1: 🆕 Sistema de Visão Computacional

#### `src/lib/visual-interpreter.ts`
```typescript
// ✅ COPIAR ARQUIVO COMPLETO da implementação atual

// 🧠 CARACTERÍSTICAS DO SISTEMA DE VISÃO:
// - GPT-4V para análise de screenshots
// - Interpretação visual + DOM combinada
// - Fallback robusto para análise DOM
// - Coordenadas precisas dos elementos

// 🔧 DEPENDÊNCIAS NECESSÁRIAS:
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

// ⚠️ CONFIGURAÇÃO OBRIGATÓRIA:
// - OPENAI_API_KEY no .env.local
// - Vercel AI SDK v5 instalado
```

#### `src/app/api/mcp/interpret-visual/route.ts`
```typescript
// ✅ COPIAR ARQUIVO COMPLETO da implementação atual

// 🎯 FUNCIONALIDADES:
// - Recebe comando + dados visuais (screenshot + DOM)
// - Chama GPT-4V para interpretação visual
// - Converte resultado para formato Desktop Agent
// - Fallback automático se GPT-4V falhar

// 📊 ENDPOINT: POST /api/mcp/interpret-visual
// 📥 INPUT: { command: string, visualData: VisualAnalysis }
// 📤 OUTPUT: { success: boolean, result: AgentFormat, reasoning: string }
```

### 🎯 Passo 5: Scripts do Cliente

#### `desktop-agent/SETUP-CLIENTE-AUTOMATICO.bat`
```batch
REM ✅ COPIAR ARQUIVO COMPLETO
REM PERSONALIZAR APENAS:
REM - Título da aplicação
REM - URLs de suporte
REM - Mensagens de texto

REM NÃO ALTERAR:
REM - Lógica de instalação
REM - Comandos técnicos
REM - Verificações de erro
```

### 🎯 Passo 6: Configurações Específicas

#### Ajustar URLs e Nomes
```typescript
// Em todos os arquivos, substituir:
"better-chatbot" → "NOME-DA-SUA-APP"
"Better Chatbot" → "Nome da Sua App"
"better-chatbot-mu.vercel.app" → "sua-app.vercel.app"
```

#### Ajustar Portas (se necessário)
```typescript
// Se a porta 8768 estiver em uso:
const PORT = 8769; // ou outra porta livre

// Atualizar em TODOS os arquivos:
// - simple-agent.ts
// - route.ts  
// - SETUP-CLIENTE-AUTOMATICO.bat
```

### 🎯 Passo 7: Testes de Validação

#### Teste Local
```bash
# 1. Compilar Desktop Agent
cd desktop-agent
npm install
npx tsc

# 2. Iniciar Desktop Agent
node dist/simple-agent.js

# 3. Testar status
curl http://localhost:8768/status

# 4. Testar na aplicação web
# URL: http://localhost:3000/playwright-hybrid
# Campo URL: deixar vazio (usa localhost)
```

#### Teste com Tunnel
```bash
# 1. Executar setup automático
SETUP-CLIENTE-AUTOMATICO.bat

# 2. Copiar URL gerada

# 3. Testar na aplicação web
# URL: https://sua-app.vercel.app/playwright-hybrid  
# Campo URL: colar URL do tunnel
```

### 🎯 Passo 8: Deploy e Distribuição

#### Build da Aplicação Web
```bash
npm run build
git add .
git commit -m "feat: Implementar Playwright Hybrid"
git push
```

#### Pacote para Cliente
```bash
cd desktop-agent
CRIAR-PACOTE-CLIENTE.bat
# Resultado: Desktop-Agent-Cliente.zip
```

---

## 🔑 Pontos Críticos - NÃO ALTERAR

### 1. Headers ngrok
```typescript
headers: {
  "Content-Type": "application/json",
  "ngrok-skip-browser-warning": "true" // ⭐ ESSENCIAL
}
```

### 2. Prioridade de Conexão
```typescript
// 1º: URL personalizada (tunnel)
if (serverUrl && serverUrl !== "http://localhost:3001") {
  // testar tunnel
}

// 2º: Localhost (fallback)  
const ports = [8768, 8766];
```

### 3. Validação do Agent
```typescript
if (agentStatus.agent?.includes("desktop") || 
    agentStatus.agent?.includes("standalone")) {
  // válido
}
```

### 4. Timeouts
```typescript
// Tunnel: 5000ms (pode ser lento)
signal: AbortSignal.timeout(5000)

// Local: 3000ms (deve ser rápido)  
signal: AbortSignal.timeout(3000)
```

---

## 📝 Customizações Permitidas

### Textos e Labels
- Títulos das páginas
- Mensagens de erro/sucesso
- Placeholders
- Instruções para o usuário

### Estilos e UI
- Cores e temas
- Layout dos componentes
- Ícones e imagens
- Animações

### Comandos Playwright
- Adicionar novos endpoints
- Modificar seletores
- Personalizar ações

### Scripts de Cliente
- Mensagens do setup
- URLs de suporte
- Nomes da aplicação

---

## ⚠️ Cuidados Especiais

### Dependências
- **Manter versões** do Playwright compatíveis
- **Não remover** cors e express
- **Verificar** se TypeScript compila
- **✅ COMPATÍVEL** com AI SDK v4, v5 ou sem AI SDK
- **Independente** de versões do Vercel AI SDK

### Portas
- **8768** é padrão, mas pode ser alterada
- **Atualizar** em TODOS os arquivos se mudar
- **Verificar** se porta está livre

### Segurança
- **Não expor** informações sensíveis
- **Validar** entradas do usuário
- **Considerar** autenticação em produção

---

## 🚀 Resultado Final

Após seguir este template, você terá:

✅ **Desktop Agent** funcionando localmente  
✅ **Tunnel público** automático  
✅ **Interface web** para controle remoto  
✅ **Scripts de instalação** para cliente  
✅ **Documentação** completa  
✅ **Pacote de distribuição** pronto  

**Tempo estimado de implementação: 2-4 horas** ⏱️
