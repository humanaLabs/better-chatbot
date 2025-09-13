import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Schema para comandos Playwright estruturados
const PlaywrightCommandSchema = z.object({
  action: z.enum([
    "navigate",
    "back",
    "forward",
    "refresh",
    "click",
    "type",
    "screenshot",
    "get_title",
    "get_url",
    "wait",
    "scroll",
    "analyze",
  ]),
  target: z
    .string()
    .describe("URL para navigate, seletor CSS para outros comandos"),
  value: z
    .string()
    .optional()
    .describe("Texto para digitar (apenas para action type)"),
  options: z
    .object({
      timeout: z.number().optional().default(5000),
      waitFor: z.enum(["load", "networkidle", "domcontentloaded"]).optional(),
      fullPage: z
        .boolean()
        .optional()
        .describe("Para screenshot - capturar página inteira"),
      direction: z
        .enum(["up", "down", "left", "right"])
        .optional()
        .describe("Para scroll"),
      pixels: z.number().optional().describe("Pixels para scroll"),
    })
    .optional(),
});

export type PlaywrightCommand = z.infer<typeof PlaywrightCommandSchema>;

/**
 * Interpreta comando em linguagem natural e converte para estrutura Playwright
 */
export async function interpretCommand(
  userMessage: string,
  pageContext?: {
    url?: string;
    title?: string;
    inputs?: Array<{
      tag: string;
      type: string;
      name: string;
      placeholder: string;
      id: string;
      ariaLabel: string;
      selector: string;
      text: string;
    }>;
    buttons?: Array<{
      tag: string;
      text: string;
      type: string;
      id: string;
      href: string;
      ariaLabel: string;
      selector: string;
      className: string;
    }>;
    bodyText?: string;
  },
): Promise<PlaywrightCommand> {
  const contextInfo = pageContext
    ? `
CONTEXTO DA PÁGINA ATUAL:
- URL: ${pageContext.url || "Desconhecida"}
- Título: ${pageContext.title || "Desconhecido"}

INPUTS DISPONÍVEIS:
${
  pageContext.inputs
    ?.map(
      (input) =>
        `  • ${input.tag}[type="${input.type}"] - ${input.placeholder || input.ariaLabel || input.name || "sem label"} (selector: ${input.selector})`,
    )
    .join("\n") || "  Nenhum input encontrado"
}

BOTÕES/LINKS DISPONÍVEIS:
${
  pageContext.buttons
    ?.map((btn) => `  • "${btn.text}" - ${btn.tag} (selector: ${btn.selector})`)
    .join("\n") || "  Nenhum botão encontrado"
}

CONTEXTO DO TEXTO:
${pageContext.bodyText?.slice(0, 300) || "Não disponível"}...
`
    : "";

  const prompt = `Você é um especialista em automação web com Playwright. Analise o contexto da página e converta este comando do usuário em uma estrutura JSON válida.

COMANDO DO USUÁRIO: "${userMessage}"
${contextInfo}

REGRAS CRÍTICAS:
1. **SEMPRE USE OS SELETORES ESPECÍFICOS** fornecidos no contexto da página
2. Para CLIQUES: encontre o botão/link exato na lista "BOTÕES/LINKS DISPONÍVEIS" e use seu SELETOR
3. Para DIGITAÇÃO: encontre o input exato na lista "INPUTS DISPONÍVEIS" e use seu SELETOR
4. Para NAVEGAÇÃO: use "navigate" com URL completa
5. Para SCREENSHOTS: use "screenshot" (sem target necessário)
6. **NUNCA use texto como seletor** - sempre use o campo "selector" da lista de elementos

PROCESSO DE SELEÇÃO:
1. Analise o comando do usuário
2. Procure na lista de elementos disponíveis o que melhor corresponde
3. Use o SELETOR EXATO fornecido no contexto
4. Se não encontrar elemento específico, use seletor genérico como fallback

EXEMPLOS COM CONTEXTO REAL:

Se o usuário disser "Clique no botão de login" e na lista tiver:
• "Login" - button (selector: #login-btn) 
→ {"action": "click", "target": "#login-btn"}

Se o usuário disser "clique em login" e na lista tiver:
• "Login" - button (selector: .login-button)
→ {"action": "click", "target": ".login-button"}

Se o usuário disser "Digite no campo de email" e na lista tiver:
• input[type="email"] - Email address (selector: [name="email"])
→ {"action": "type", "target": "[name=\"email\"]", "value": ""}

Se o usuário disser "buscar" ou "pesquisar" ou "enter" e na lista tiver:
• "" - input (selector: [name="btnK"])
→ {"action": "click", "target": "[name=\"btnK\"]"}

Se o usuário disser "clique em entrar" e NÃO encontrar "entrar" na lista, mas tiver:
• "Sign in" - a (selector: [aria-label="Sign in"])
→ {"action": "click", "target": "[aria-label=\"Sign in\"]"}

IMPORTANTE PARA CLIQUES:
- Procure por texto EXATO ou similar nos botões disponíveis
- "login" deve corresponder a botões com texto "Login", "Sign In", "Entrar"
- **SEMPRE USE O SELETOR ESPECÍFICO** fornecido no contexto (ex: [aria-label="Sign in"])
- **NUNCA use o texto do botão como seletor** (ex: NÃO use "sign in", use "[aria-label=\"Sign in\"]")
- Se não encontrar correspondência exata, use seletor genérico como fallback

EXEMPLO CRÍTICO:
Se o usuário disser "clique em sign in" e na lista tiver:
• "Sign in" - a (selector: [aria-label="Sign in"])
→ {"action": "click", "target": "[aria-label=\"Sign in\"]"}
→ NÃO: {"action": "click", "target": "sign in"}

COMANDOS SEM CONTEXTO DE PÁGINA:
"Abra o Google" → {"action": "navigate", "target": "https://google.com"}
"Volte" ou "Voltar" → {"action": "back", "target": ""}
"Avançar" → {"action": "forward", "target": ""}
"Recarregar" ou "Atualizar" → {"action": "refresh", "target": ""}
"Capture uma screenshot" → {"action": "screenshot", "target": ""}
"Qual é o título?" → {"action": "get_title", "target": ""}

IMPORTANTE: 
- SEMPRE prefira seletores do contexto da página
- Se não encontrar elemento específico, use seletor genérico
- Para digitação, inclua o texto no campo "value"
- Para cliques, use apenas o seletor no campo "target"

Retorne APENAS o JSON estruturado, sem explicações.`;

  try {
    const result = await generateObject({
      model: openai("gpt-4o-mini"), // Usando gpt-4o-mini padrão
      prompt,
      schema: PlaywrightCommandSchema,
      temperature: 0.1, // Baixa temperatura para consistência
    });

    console.log(`🧠 LLM Interpretou: "${userMessage}" →`, result.object);
    console.log(
      `🎯 Contexto usado:`,
      pageContext
        ? {
            url: pageContext.url,
            inputs: pageContext.inputs?.length || 0,
            buttons: pageContext.buttons?.length || 0,
            buttonTexts: pageContext.buttons?.map((b) => b.text).slice(0, 5),
          }
        : "Sem contexto",
    );
    return result.object;
  } catch (error) {
    console.error("❌ Erro na interpretação LLM:", error);

    // Fallback para comandos básicos se LLM falhar
    return fallbackInterpretation(userMessage);
  }
}

/**
 * Fallback simples se o LLM não estiver disponível
 */
function fallbackInterpretation(userMessage: string): PlaywrightCommand {
  const lowerCommand = userMessage.toLowerCase();

  if (lowerCommand.includes("volte") || lowerCommand.includes("voltar")) {
    return { action: "back", target: "" };
  }

  if (lowerCommand.includes("avançar") || lowerCommand.includes("avancar")) {
    return { action: "forward", target: "" };
  }

  if (
    lowerCommand.includes("recarregar") ||
    lowerCommand.includes("atualizar") ||
    lowerCommand.includes("refresh")
  ) {
    return { action: "refresh", target: "" };
  }

  if (lowerCommand.includes("abra") || lowerCommand.includes("navegue")) {
    // Tentar extrair URL/site
    const urlMatch = userMessage.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      return { action: "navigate", target: urlMatch[0] };
    }

    const domainMatch = userMessage.match(/([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/);
    if (domainMatch) {
      return { action: "navigate", target: `https://${domainMatch[0]}` };
    }

    return { action: "navigate", target: "https://google.com" };
  }

  if (
    lowerCommand.includes("clique") ||
    lowerCommand.includes("login") ||
    lowerCommand.includes("entrar")
  ) {
    // Seletores mais abrangentes para login/clique
    return {
      action: "click",
      target:
        'button, a, input[type="submit"], input[type="button"], [role="button"], .btn, .button',
    };
  }

  if (
    lowerCommand.includes("busca") ||
    lowerCommand.includes("pesquis") ||
    lowerCommand.includes("enter") ||
    lowerCommand.includes("submit")
  ) {
    // Para comandos de busca/submit
    return {
      action: "click",
      target:
        'input[type="submit"], button[type="submit"], .search-button, [name="btnK"], .gNO89b',
    };
  }

  if (lowerCommand.includes("digite")) {
    const textMatch = userMessage.match(/"([^"]+)"|'([^']+)'|digite\s+(.+)/i);
    const text = textMatch
      ? (textMatch[1] || textMatch[2] || textMatch[3]).trim()
      : "hello world";
    return { action: "type", target: "input, textarea", value: text };
  }

  if (lowerCommand.includes("screenshot") || lowerCommand.includes("captura")) {
    return { action: "screenshot", target: "" };
  }

  if (lowerCommand.includes("título")) {
    return { action: "get_title", target: "" };
  }

  if (lowerCommand.includes("url")) {
    return { action: "get_url", target: "" };
  }

  // Default: tentar navegar
  return { action: "navigate", target: "https://google.com" };
}

/**
 * Converte comando estruturado para formato do Desktop Agent
 */
export function commandToAgentFormat(command: PlaywrightCommand): {
  toolName: string;
  args: any;
} {
  const toolName = `browser_${command.action}`;

  let args: any = {};

  switch (command.action) {
    case "navigate":
      args = { url: command.target };
      break;

    case "back":
    case "forward":
    case "refresh":
      args = {}; // Sem argumentos necessários
      break;

    case "click":
      args = { selector: command.target };
      break;

    case "type":
      args = {
        selector: command.target,
        text: command.value || "",
      };
      break;

    case "screenshot":
      args = {
        fullPage: command.options?.fullPage || false,
      };
      break;

    case "scroll":
      args = {
        selector: command.target || "body",
        direction: command.options?.direction || "down",
        pixels: command.options?.pixels || 500,
      };
      break;

    case "get_title":
    case "get_url":
    case "analyze":
      args = {}; // Sem argumentos necessários
      break;

    default:
      args = { target: command.target, value: command.value };
  }

  return { toolName, args };
}
