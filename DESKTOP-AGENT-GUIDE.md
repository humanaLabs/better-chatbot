# 🎭 Desktop Agent - Guia Completo

## 📍 **Onde está o executável?**

O executável será criado em `desktop-agent/dist-electron/` após a compilação.

### **Estrutura após build:**
```
desktop-agent/
├── dist-electron/                    ← 🎯 EXECUTÁVEIS AQUI
│   ├── win-unpacked/                 ← Windows (pasta)
│   │   └── Better Chatbot Desktop Agent.exe  ← 🔥 EXECUTÁVEL WINDOWS
│   ├── Better Chatbot Desktop Agent Setup 1.0.0.exe  ← Instalador Windows
│   ├── mac/                          ← macOS
│   │   └── Better Chatbot Desktop Agent.app
│   ├── Better Chatbot Desktop Agent-1.0.0.dmg  ← Instalador macOS
│   ├── linux-unpacked/               ← Linux
│   │   └── better-chatbot-desktop-agent
│   └── Better Chatbot Desktop Agent-1.0.0.AppImage  ← Instalador Linux
```

---

## 🚀 **Como gerar o executável:**

### **Opção 1: Comando único (Recomendado)**
```bash
npm run desktop-agent:setup-and-build
```
*Faz tudo automaticamente: instala, compila e gera o executável*

### **Opção 2: Passo a passo**
```bash
# 1. Configurar
npm run setup-desktop-agent

# 2. Entrar na pasta
cd desktop-agent

# 3. Gerar executável
npm run dist
```

### **Opção 3: Scripts automáticos**

**Windows:**
```bash
cd desktop-agent
./build-executable.bat
```

**Linux/macOS:**
```bash
cd desktop-agent
chmod +x build-executable.sh
./build-executable.sh
```

---

## 🎯 **Onde encontrar após build:**

### **Windows:**
- **Executável:** `desktop-agent/dist-electron/win-unpacked/Better Chatbot Desktop Agent.exe`
- **Instalador:** `desktop-agent/dist-electron/Better Chatbot Desktop Agent Setup 1.0.0.exe`

### **macOS:**
- **App:** `desktop-agent/dist-electron/mac/Better Chatbot Desktop Agent.app`
- **DMG:** `desktop-agent/dist-electron/Better Chatbot Desktop Agent-1.0.0.dmg`

### **Linux:**
- **Executável:** `desktop-agent/dist-electron/linux-unpacked/better-chatbot-desktop-agent`
- **AppImage:** `desktop-agent/dist-electron/Better Chatbot Desktop Agent-1.0.0.AppImage`

---

## 🔧 **Como usar o executável:**

### **1. Executar:**
- **Windows:** Duplo clique no `.exe`
- **macOS:** Duplo clique no `.app`
- **Linux:** Execute o binário ou `.AppImage`

### **2. Verificar funcionamento:**
- Aparecerá um ícone na **bandeja do sistema** (system tray)
- Clique com botão direito no ícone para ver o menu
- Clique em **"Status"** para abrir a interface de monitoramento

### **3. Testar conexão:**
```bash
curl http://localhost:8766/status
```
*Deve retornar JSON com status "online"*

### **4. Usar no Better Chatbot:**
1. Acesse `http://localhost:3000/playwright-hybrid`
2. Clique em **"Conectar ao MCP"**
3. Verá: *"🎭 Conectado ao Desktop Agent local - Navegador real no cliente!"*
4. Execute comandos - o navegador abrirá no seu computador!

---

## 🛠️ **Troubleshooting:**

### **Erro: "Playwright não inicializado"**
```bash
cd desktop-agent
npx playwright install chromium
```

### **Erro: "Porta 8766 já em uso"**
- Feche outras instâncias do Desktop Agent
- Ou mude a porta no código (`src/main.ts`)

### **Executável não aparece:**
- Verifique se o build terminou sem erros
- Procure na pasta `dist-electron/`
- No Windows, pode estar em `win-unpacked/`

### **Ícone não aparece na bandeja:**
- Aguarde alguns segundos após executar
- Verifique se o processo está rodando no Task Manager
- Tente executar via terminal para ver logs

---

## 📊 **Status e Monitoramento:**

### **URLs importantes:**
- **Status API:** `http://localhost:8766/status`
- **WebSocket:** `ws://localhost:8765`
- **MCP Tools:** `http://localhost:8766/mcp/tools`

### **Interface visual:**
- Clique no ícone da bandeja → **"Status"**
- Mostra status dos serviços em tempo real
- Permite testar conexões e comandos

---

## 🎉 **Resultado final:**

Após seguir este guia, você terá:
- ✅ **Executável standalone** que roda em qualquer computador
- ✅ **Navegador real** controlado localmente
- ✅ **API compatível** com o Better Chatbot
- ✅ **Interface visual** para monitoramento
- ✅ **Zero configuração** para o usuário final

O usuário só precisa:
1. **Executar o arquivo** → Ícone aparece na bandeja
2. **Usar o Better Chatbot** → Detecta automaticamente
3. **Ver o navegador** → Abre no computador local! 🚀
