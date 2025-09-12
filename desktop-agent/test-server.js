// Teste simples para verificar se o servidor HTTP funciona
const express = require("express");
const app = express();
const port = 8768;

app.use((req, res, next) => {
  console.log(`📍 Request: ${req.method} ${req.url} de ${req.ip}`);
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
    agent: "test-server",
    timestamp: new Date().toISOString(),
    port: port,
  });
});

app.get("/", (_req, res) => {
  res.send("Servidor de teste funcionando!");
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`🌐 Servidor de teste rodando na porta ${port}`);
  console.log(`🔗 Teste: http://localhost:${port}/status`);
  console.log(`🔗 Teste: http://127.0.0.1:${port}/status`);
});

server.on("error", (error) => {
  console.error("❌ Erro no servidor:", error);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Parando servidor de teste...");
  server.close(() => {
    console.log("✅ Servidor parado");
    process.exit(0);
  });
});
