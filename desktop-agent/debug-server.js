// Debug server simples para identificar o problema
const express = require("express");

console.log("🚀 Iniciando debug server...");

const app = express();
const port = 8768;

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.get("/status", (_req, res) => {
  console.log("✅ Status endpoint chamado!");
  res.json({
    status: "online",
    agent: "desktop-standalone", // ✅ Simular Desktop Agent real
    timestamp: new Date().toISOString(),
    port: port,
    playwright: "initialized",
  });
});

// Adicionar rota para comandos Playwright (simulados)
app.post("/playwright/:action", (req, res) => {
  const { action } = req.params;
  console.log(`🎭 Comando Playwright simulado: ${action}`);

  res.json({
    success: true,
    result: {
      message: `Comando ${action} executado (simulado)`,
      timestamp: new Date().toISOString(),
    },
  });
});

console.log("🔧 Configurando servidor...");

const server = app.listen(port, () => {
  console.log(`✅ Debug server rodando na porta ${port}`);
  console.log(`🔗 Teste: http://localhost:${port}/status`);

  // Teste automático
  setTimeout(() => {
    console.log("🧪 Fazendo auto-teste...");
    const http = require("http");

    const req = http.get(`http://localhost:${port}/status`, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        console.log("✅ Auto-teste passou!", data);
      });
    });

    req.on("error", (err) => {
      console.error("❌ Auto-teste falhou:", err);
    });
  }, 1000);
});

server.on("error", (error) => {
  console.error("❌ Erro no servidor:", error);
});

console.log("⏳ Aguardando inicialização...");
