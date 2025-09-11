"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function PlaywrightExtensionPage() {
  const [extensionCode, setExtensionCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const generateExtension = () => {
    setIsGenerating(true);

    const manifest = {
      manifest_version: 3,
      name: "Playwright Controller",
      version: "1.0",
      description: "Controla páginas web para automação Playwright",
      permissions: ["activeTab", "scripting"],
      content_scripts: [
        {
          matches: ["<all_urls>"],
          js: ["content.js"],
          run_at: "document_end",
        },
      ],
      background: {
        service_worker: "background.js",
      },
    };

    const contentScript = `
// Content script que roda em todas as páginas
console.log('Playwright Controller ativo na página:', window.location.href);

// Aguardar DOM estar pronto
function initPlaywrightController() {
  // Expor API global para controle
  window.playwrightController = {
    click: function(selector) {
      try {
        console.log('Tentando clicar em:', selector);
        const element = document.querySelector(selector);
        if (element) {
          element.click();
          console.log('✅ Clicou com sucesso em:', selector);
          return { success: true, message: 'Clicou em: ' + selector };
        }
        console.log('❌ Elemento não encontrado:', selector);
        return { success: false, message: 'Elemento não encontrado: ' + selector };
      } catch (error) {
        console.error('Erro ao clicar:', error);
        return { success: false, message: 'Erro: ' + error.message };
      }
    },
    
    type: function(selector, text) {
      try {
        console.log('Tentando digitar em:', selector, 'texto:', text);
        const element = document.querySelector(selector);
        if (element) {
          element.focus();
          
          // Limpar campo primeiro
          element.value = '';
          
          // Simular digitação caractere por caractere
          for (let i = 0; i < text.length; i++) {
            element.value += text[i];
            element.dispatchEvent(new Event('input', { bubbles: true }));
          }
          
          element.dispatchEvent(new Event('change', { bubbles: true }));
          element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          
          console.log('✅ Digitou com sucesso:', text);
          return { success: true, message: 'Digitou "' + text + '" em: ' + selector };
        }
        console.log('❌ Elemento não encontrado:', selector);
        return { success: false, message: 'Elemento não encontrado: ' + selector };
      } catch (error) {
        console.error('Erro ao digitar:', error);
        return { success: false, message: 'Erro: ' + error.message };
      }
    },
    
    getTitle: function() {
      try {
        const title = document.title;
        console.log('✅ Título obtido:', title);
        return { success: true, title: title };
      } catch (error) {
        console.error('Erro ao obter título:', error);
        return { success: false, message: 'Erro: ' + error.message };
      }
    },
    
    getUrl: function() {
      try {
        const url = window.location.href;
        console.log('✅ URL obtida:', url);
        return { success: true, url: url };
      } catch (error) {
        console.error('Erro ao obter URL:', error);
        return { success: false, message: 'Erro: ' + error.message };
      }
    },
    
    screenshot: function() {
      try {
        // Usar html2canvas se disponível
        if (typeof html2canvas !== 'undefined') {
          return html2canvas(document.body).then(function(canvas) {
            console.log('✅ Screenshot capturado');
            return { success: true, dataUrl: canvas.toDataURL() };
          }).catch(function(error) {
            console.error('Erro no html2canvas:', error);
            return { success: false, message: 'Erro no html2canvas: ' + error.message };
          });
        }
        console.log('❌ html2canvas não disponível');
        return Promise.resolve({ success: false, message: 'html2canvas não disponível' });
      } catch (error) {
        console.error('Erro ao capturar screenshot:', error);
        return Promise.resolve({ success: false, message: 'Erro: ' + error.message });
      }
    },
    
    // Função de teste
    test: function() {
      console.log('✅ Playwright Controller funcionando!');
      return { success: true, message: 'Playwright Controller está funcionando!' };
    }
  };

  console.log('✅ Playwright Controller inicializado com sucesso!');
  console.log('Comandos disponíveis:', Object.keys(window.playwrightController));
}

// Inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPlaywrightController);
} else {
  initPlaywrightController();
}

// Comunicação com a página principal
window.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'PLAYWRIGHT_COMMAND') {
    const command = event.data.command;
    const args = event.data.args || [];
    
    console.log('Recebido comando:', command, 'com args:', args);
    
    if (window.playwrightController && window.playwrightController[command]) {
      try {
        const result = window.playwrightController[command].apply(null, args);
        
        window.parent.postMessage({
          type: 'PLAYWRIGHT_RESULT',
          result: result
        }, '*');
      } catch (error) {
        console.error('Erro ao executar comando:', error);
        window.parent.postMessage({
          type: 'PLAYWRIGHT_RESULT',
          result: { success: false, message: 'Erro: ' + error.message }
        }, '*');
      }
    } else {
      console.error('Comando não encontrado:', command);
      window.parent.postMessage({
        type: 'PLAYWRIGHT_RESULT',
        result: { success: false, message: 'Comando não encontrado: ' + command }
      }, '*');
    }
  }
});
`;

    const backgroundScript = `
// Background script para comunicação entre abas
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'EXECUTE_COMMAND') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (command, args) => {
          if (window.playwrightController && window.playwrightController[command]) {
            return window.playwrightController[command](...args);
          }
          return { success: false, message: 'Comando não encontrado' };
        },
        args: [request.command, request.args]
      }, (results) => {
        sendResponse(results[0].result);
      });
    });
    return true; // Indica resposta assíncrona
  }
});
`;

    const extensionFiles = {
      "manifest.json": JSON.stringify(manifest, null, 2),
      "content.js": contentScript,
      "background.js": backgroundScript,
    };

    setExtensionCode(JSON.stringify(extensionFiles, null, 2));
    setIsGenerating(false);
  };

  const downloadExtension = () => {
    const files = JSON.parse(extensionCode);

    // Criar um zip seria ideal, mas vamos criar arquivos separados
    Object.entries(files).forEach(([filename, content]) => {
      const blob = new Blob([content as string], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          🧩 Extensão Playwright (Sem CORS)
        </h1>
        <p className="text-muted-foreground mt-2">
          Crie uma extensão do browser que contorna completamente as limitações
          CORS
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>🚀 Gerar Extensão</CardTitle>
          <CardDescription>
            Crie uma extensão que injeta controle Playwright em todas as páginas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={generateExtension}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? "Gerando..." : "🧩 Gerar Extensão"}
          </Button>

          {extensionCode && (
            <>
              <div>
                <Label>Código da Extensão</Label>
                <Textarea
                  value={extensionCode}
                  readOnly
                  rows={15}
                  className="mt-2 font-mono text-xs"
                />
              </div>

              <Button
                onClick={downloadExtension}
                variant="outline"
                className="w-full"
              >
                📥 Baixar Arquivos da Extensão
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📋 Como Instalar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <strong>1. Baixar arquivos:</strong>
            <p>
              Clique em &quot;Baixar Arquivos&quot; para obter manifest.json,
              content.js e background.js
            </p>
          </div>

          <div>
            <strong>2. Criar pasta:</strong>
            <p>
              Crie uma pasta no seu computador e coloque os 3 arquivos dentro
            </p>
          </div>

          <div>
            <strong>3. Instalar no Chrome:</strong>
            <ul className="list-disc list-inside ml-4">
              <li>Abra chrome://extensions/</li>
              <li>Ative &quot;Modo do desenvolvedor&quot;</li>
              <li>Clique &quot;Carregar sem compactação&quot;</li>
              <li>Selecione a pasta com os arquivos</li>
            </ul>
          </div>

          <div>
            <strong>4. Usar:</strong>
            <p>
              A extensão funcionará em todas as páginas, sem limitações CORS!
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-green-600">
            ✅ Vantagens da Extensão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            ✅ <strong>Sem CORS:</strong> Acesso total a qualquer página
          </p>
          <p>
            ✅ <strong>Controle real:</strong> Manipula DOM diretamente
          </p>
          <p>
            ✅ <strong>Screenshots:</strong> Captura qualquer página
          </p>
          <p>
            ✅ <strong>Automação:</strong> Cliques e digitação reais
          </p>
          <p>
            ✅ <strong>Universal:</strong> Funciona em todos os sites
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
