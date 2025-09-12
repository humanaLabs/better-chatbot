@echo off
echo ========================================
echo 🧪 TESTE DE REDE - DESKTOP AGENT
echo ========================================
echo.

echo 🔍 1. Verificando se a porta 8768 está em uso...
netstat -an | findstr :8768
if %errorlevel% equ 0 (
    echo ✅ Porta 8768 está sendo usada
) else (
    echo ❌ Porta 8768 não está em uso
)

echo.
echo 🔍 2. Verificando processos Node.js...
tasklist | findstr node.exe
if %errorlevel% equ 0 (
    echo ✅ Processos Node.js encontrados
) else (
    echo ❌ Nenhum processo Node.js rodando
)

echo.
echo 🔍 3. Testando conectividade local...
echo Testando localhost:8768...
curl -v --connect-timeout 5 http://localhost:8768/status 2>&1
echo.

echo Testando 127.0.0.1:8768...
curl -v --connect-timeout 5 http://127.0.0.1:8768/status 2>&1
echo.

echo 🔍 4. Verificando firewall do Windows...
echo Executando: netsh advfirewall show currentprofile
netsh advfirewall show currentprofile | findstr "State"

echo.
echo ========================================
echo 💡 DIAGNÓSTICO COMPLETO
echo ========================================
echo.
pause
