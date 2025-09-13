# 🎭 Desktop Agent - Guia do Cliente

## 🚀 Instalação Automática (RECOMENDADO)

### Passo 1: Download
1. Baixe todos os arquivos da pasta `desktop-agent`
2. Coloque em uma pasta no seu computador (ex: `C:\DesktopAgent\`)

### Passo 2: Execução Automática
1. **Clique duplo** em `SETUP-CLIENTE-AUTOMATICO.bat`
2. **Aguarde** 2-3 minutos (instalação automática)
3. **Copie a URL** que aparece no final

### Passo 3: Usar na Aplicação Web
1. Acesse a aplicação web
2. Vá para `/playwright-hybrid`
3. **Cole a URL** no campo de conexão (se necessário)
4. Clique **"Conectar"**
5. **Digite comandos** como "Abra o Google" no chat
6. ✅ **Pronto!** Controle seu navegador conversando!

---

## 🛠️ Instalação Manual (Avançado)

### Pré-requisitos
- **Node.js** (versão 16+): https://nodejs.org
- **Windows 10/11**
- **Conexão com internet**

### Comandos
```bash
# 1. Instalar dependências
npm install

# 2. Compilar
npx tsc

# 3. Iniciar Desktop Agent
node dist/simple-agent.js

# 4. Criar tunnel (nova janela)
cloudflared tunnel --url http://localhost:8768
```

---

## 🔧 Resolução de Problemas

### ❌ "Node.js não encontrado"
**Solução**: Instale o Node.js de https://nodejs.org

### ❌ "Desktop Agent não conecta"
**Soluções**:
1. Verifique se a porta 8768 está livre
2. Execute como Administrador
3. Desative antivírus temporariamente

### ❌ "Tunnel não funciona"
**Soluções**:
1. Verifique conexão com internet
2. Tente executar novamente o script
3. Use ngrok como alternativa: `ngrok http 8768`

### ❌ "Navegador não abre"
**Soluções**:
1. Instale Chrome ou Firefox
2. Execute: `npx playwright install chromium`

---

## 📊 Verificação de Status

### Testar Local
```bash
curl http://localhost:8768/status
```

### Testar Tunnel
```bash
curl -H "ngrok-skip-browser-warning: true" https://SUA-URL.trycloudflare.com/status
```

---

## 🆘 Suporte

### Arquivos de Log
- `tunnel-output.txt` - Logs do tunnel
- `tunnel-url.txt` - URL atual do tunnel

### Comandos Úteis
```bash
# Ver processos rodando
tasklist | findstr node

# Parar tudo
taskkill /F /IM node.exe
taskkill /F /IM cloudflared.exe

# Reiniciar
SETUP-CLIENTE-AUTOMATICO.bat
```

### Contato
- 📧 Email: suporte@empresa.com
- 💬 Chat: aplicacao.com/suporte
- 📞 Telefone: (11) 9999-9999

---

## ⚡ Uso Rápido

1. **Execute**: `SETUP-CLIENTE-AUTOMATICO.bat`
2. **Copie**: A URL que aparece
3. **Cole**: Na aplicação web
4. **Use**: Controle remoto do navegador!

**Simples assim!** 🎉
