import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("targetUrl") || searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json(
      { error: "URL parameter is required (use 'targetUrl' or 'url')" },
      { status: 400 },
    );
  }

  try {
    // Validar URL
    try {
      new URL(targetUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 },
      );
    }

    // Buscar a página com timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status} ${response.statusText}` },
        { status: response.status },
      );
    }

    let html = await response.text();

    // Injetar script de controle Playwright
    const playwrightScript = `
      <script>
        console.log('Playwright Controller ativo via iframe');
        
        // Adicionar indicador visual de que o WebView está pronto
        const indicator = document.createElement('div');
        indicator.innerHTML = '🌐 WebView Playwright Ativo';
        indicator.style.cssText = \`
          position: fixed;
          top: 10px;
          right: 10px;
          background: #4CAF50;
          color: white;
          padding: 8px 12px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
          z-index: 10000;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        \`;
        document.body.appendChild(indicator);
        
        // Remover indicador após 3 segundos
        setTimeout(() => {
          if (indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
          }
        }, 3000);
        
        // Notificar parent que WebView está pronto
        window.parent.postMessage({
          type: 'WEBVIEW_READY',
          message: 'WebView Playwright está pronto para receber comandos'
        }, '*');
        
        // Carregar html2canvas se não estiver disponível
        if (!window.html2canvas) {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
          document.head.appendChild(script);
        }

        // API de controle Playwright
        window.playwrightIframe = {
          click: (selector) => {
            const element = document.querySelector(selector);
            if (element) {
              // Destacar elemento
              element.style.outline = '3px solid red';
              element.style.backgroundColor = 'yellow';
              
              setTimeout(() => {
                element.click();
                element.style.outline = '';
                element.style.backgroundColor = '';
              }, 1000);
              
              return { success: true, message: 'Clicou em: ' + selector };
            }
            return { success: false, message: 'Elemento não encontrado: ' + selector };
          },
          
          type: (selector, text) => {
            const element = document.querySelector(selector);
            if (element) {
              element.focus();
              element.value = text;
              element.dispatchEvent(new Event('input', { bubbles: true }));
              element.dispatchEvent(new Event('change', { bubbles: true }));
              return { success: true, message: 'Digitou "' + text + '" em: ' + selector };
            }
            return { success: false, message: 'Elemento não encontrado: ' + selector };
          },
          
          getTitle: () => {
            return { success: true, title: document.title };
          },
          
          getUrl: () => {
            return { success: true, url: window.location.href };
          },
          
          screenshot: () => {
            if (window.html2canvas) {
              html2canvas(document.body).then(canvas => {
                const dataUrl = canvas.toDataURL();
                
                // Criar link para download
                const link = document.createElement('a');
                link.download = 'screenshot-iframe-' + Date.now() + '.png';
                link.href = dataUrl;
                link.click();
                
                // Notificar parent
                window.parent.postMessage({
                  type: 'screenshot',
                  dataUrl: dataUrl
                }, '*');
              });
              return { success: true, message: 'Screenshot capturado' };
            }
            return { success: false, message: 'html2canvas não disponível' };
          }
        };

        // Comunicação com parent frame - compatível com WebView
        window.addEventListener('message', (event) => {
          console.log('Iframe recebeu mensagem:', event.data);
          
          if (event.data.type === 'WEBVIEW_EXECUTE') {
            const { script, id } = event.data;
            
            try {
              console.log('Executando script:', script);
              
              // Criar função para executar o script de forma mais segura
              const executeScript = new Function('return ' + script);
              const result = executeScript();
              
              console.log('Resultado do script:', result);
              
              // Se o resultado é uma Promise, aguardar
              if (result && typeof result.then === 'function') {
                result.then(finalResult => {
                  window.parent.postMessage({
                    type: 'WEBVIEW_RESULT',
                    id: id,
                    result: finalResult
                  }, '*');
                }).catch(error => {
                  window.parent.postMessage({
                    type: 'WEBVIEW_RESULT',
                    id: id,
                    result: { success: false, message: 'Erro Promise: ' + error.message }
                  }, '*');
                });
              } else {
                window.parent.postMessage({
                  type: 'WEBVIEW_RESULT',
                  id: id,
                  result: result
                }, '*');
              }
            } catch (error) {
              console.error('Erro ao executar script:', error);
              
              window.parent.postMessage({
                type: 'WEBVIEW_RESULT',
                id: id,
                result: { success: false, message: 'Erro: ' + error.message }
              }, '*');
            }
          }
          
          // Sistema direto de comandos (mais simples e confiável)
          if (event.data.type === 'WEBVIEW_COMMAND') {
            const { command, selector, text, id } = event.data;
            
            try {
              let result;
              
              switch (command) {
                case 'click':
                  const clickElement = document.querySelector(selector);
                  if (clickElement) {
                    clickElement.click();
                    result = { success: true, message: 'Clicou em: ' + selector };
                  } else {
                    result = { success: false, message: 'Elemento não encontrado: ' + selector };
                  }
                  break;
                  
                case 'type':
                  const typeElement = document.querySelector(selector);
                  if (typeElement) {
                    typeElement.focus();
                    typeElement.value = text;
                    typeElement.dispatchEvent(new Event('input', { bubbles: true }));
                    typeElement.dispatchEvent(new Event('change', { bubbles: true }));
                    result = { success: true, message: 'Digitou "' + text + '" em: ' + selector };
                  } else {
                    result = { success: false, message: 'Elemento não encontrado: ' + selector };
                  }
                  break;
                  
                case 'getTitle':
                  result = { success: true, title: document.title };
                  break;
                  
                case 'getUrl':
                  result = { success: true, url: window.location.href };
                  break;
                  
                case 'test':
                  result = { success: true, message: 'Comunicação funcionando!', title: document.title, url: window.location.href };
                  break;
                  
                default:
                  result = { success: false, message: 'Comando não reconhecido: ' + command };
              }
              
              window.parent.postMessage({
                type: 'WEBVIEW_RESULT',
                id: id,
                result: result
              }, '*');
            } catch (error) {
              window.parent.postMessage({
                type: 'WEBVIEW_RESULT',
                id: id,
                result: { success: false, message: 'Erro no comando: ' + error.message }
              }, '*');
            }
          }
        });

        // Interceptar cliques para demonstração
        document.addEventListener('click', (e) => {
          console.log('Clique interceptado:', e.target);
          e.target.style.outline = '2px solid blue';
          setTimeout(() => {
            e.target.style.outline = '';
          }, 2000);
        });

        // Interceptar formulários
        document.addEventListener('submit', (e) => {
          console.log('Formulário interceptado:', e.target);
          e.preventDefault(); // Evitar navegação
          alert('Formulário interceptado pelo Playwright!');
        });
      </script>
    `;

    // Injetar o script antes do </head> ou no início do <body>
    if (html.includes("</head>")) {
      html = html.replace("</head>", playwrightScript + "</head>");
    } else if (html.includes("<body>")) {
      html = html.replace("<body>", "<body>" + playwrightScript);
    } else {
      html = playwrightScript + html;
    }

    // Corrigir URLs relativas para absolutas
    const baseUrl = new URL(targetUrl).origin;
    html = html.replace(/href="\/([^"]*?)"/g, `href="${baseUrl}/$1"`);
    html = html.replace(/src="\/([^"]*?)"/g, `src="${baseUrl}/$1"`);
    html = html.replace(/action="\/([^"]*?)"/g, `action="${baseUrl}/$1"`);

    // Adicionar base tag para URLs relativas
    const baseTag = `<base href="${baseUrl}/">`;
    if (html.includes("<head>")) {
      html = html.replace("<head>", "<head>" + baseTag);
    } else {
      html = baseTag + html;
    }

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Frame-Options": "SAMEORIGIN",
        "Content-Security-Policy": "frame-ancestors 'self'",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);

    // Detectar se é um site conhecido por bloquear iframes
    const blockedSites = [
      "youtube.com",
      "facebook.com",
      "twitter.com",
      "instagram.com",
      "tiktok.com",
    ];
    const isKnownBlockedSite = blockedSites.some((site) =>
      targetUrl.includes(site),
    );

    // Retornar uma página de erro mais amigável
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Erro no WebView</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            background: #f5f5f5; 
            color: #333;
          }
          .error-container { 
            background: white; 
            padding: 20px; 
            border-radius: 8px; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            max-width: 600px;
            margin: 0 auto;
          }
          .error-title { 
            color: #e74c3c; 
            margin-bottom: 10px; 
          }
          .warning-title {
            color: #f39c12;
            margin-bottom: 10px;
          }
          .error-details {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
            font-family: monospace;
            font-size: 12px;
          }
          .explanation {
            background: #e8f4fd;
            padding: 15px;
            border-radius: 4px;
            margin: 15px 0;
            border-left: 4px solid #3498db;
          }
          .suggestions {
            margin-top: 20px;
          }
          .suggestion-button {
            display: inline-block;
            padding: 8px 16px;
            margin: 4px;
            background: #3498db;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            cursor: pointer;
          }
          .server-button {
            background: #27ae60;
          }
        </style>
      </head>
      <body>
        <div class="error-container">
          ${
            isKnownBlockedSite
              ? `
            <h2 class="warning-title">🚫 Site bloqueado para WebView</h2>
            <p><strong>URL:</strong> ${targetUrl}</p>
            
            <div class="explanation">
              <h4>🔒 Por que não funciona no WebView:</h4>
              <ul>
                <li><strong>X-Frame-Options:</strong> Site bloqueia carregamento em iframes</li>
                <li><strong>Segurança:</strong> Previne clickjacking e ataques</li>
                <li><strong>Política:</strong> YouTube, redes sociais geralmente bloqueiam</li>
              </ul>
            </div>
            
            <div class="explanation">
              <h4>✅ Mas o Playwright WEBSERVER funciona:</h4>
              <ul>
                <li><strong>Servidor:</strong> Playwright executa no servidor (funciona)</li>
                <li><strong>WebView:</strong> Apenas para visualização (pode falhar)</li>
                <li><strong>Resultado:</strong> Automação real + screenshot do servidor</li>
              </ul>
            </div>
          `
              : `
            <h2 class="error-title">❌ Erro ao carregar página</h2>
            <p><strong>URL:</strong> ${targetUrl}</p>
            <div class="error-details">
              ${error instanceof Error ? error.message : "Erro desconhecido"}
            </div>
          `
          }
          
          <div class="suggestions">
            <h3>💡 Soluções:</h3>
            ${
              isKnownBlockedSite
                ? `
              <p><strong>🎯 Para sites bloqueados:</strong></p>
              <a href="#" class="suggestion-button server-button" onclick="parent.postMessage({type: 'USE_SERVER_ONLY', url: '${targetUrl}'}, '*')">🚀 Usar Apenas Servidor</a>
              <p><em>Execute automação no servidor e veja screenshots reais</em></p>
              <hr style="margin: 15px 0;">
            `
                : ""
            }
            <p><strong>🔄 URLs alternativas que funcionam:</strong></p>
            <a href="#" class="suggestion-button" onclick="parent.postMessage({type: 'CHANGE_URL', url: 'https://httpbin.org/forms/post'}, '*')">HTTPBin Form</a>
            <a href="#" class="suggestion-button" onclick="parent.postMessage({type: 'CHANGE_URL', url: 'https://example.com'}, '*')">Example.com</a>
            <a href="#" class="suggestion-button" onclick="parent.postMessage({type: 'CHANGE_URL', url: 'https://duckduckgo.com'}, '*')">DuckDuckGo</a>
            <a href="#" class="suggestion-button" onclick="parent.postMessage({type: 'CHANGE_URL', url: 'data:text/html,<html><head><title>Teste Local</title></head><body><h1>Página de Teste</h1><input name=\\'q\\' placeholder=\\'Campo de teste\\' /></body></html>'}, '*')">Teste Local</a>
          </div>
        </div>
        
        <script>
          // Notificar parent sobre o tipo de erro
          window.parent.postMessage({
            type: 'WEBVIEW_ERROR',
            error: '${error instanceof Error ? error.message : "Erro desconhecido"}',
            url: '${targetUrl}',
            isFrameBlocked: ${isKnownBlockedSite},
            suggestion: ${isKnownBlockedSite ? "'Use apenas o servidor para automação'" : "'Tente uma URL alternativa'"}
          }, '*');
        </script>
      </body>
      </html>
    `;

    return new NextResponse(errorHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
      status: 200, // Retornar 200 para que o iframe carregue a página de erro
    });
  }
}
