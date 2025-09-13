import { NextRequest, NextResponse } from "next/server";
import {
  interpretCommand,
  commandToAgentFormat,
} from "@/lib/command-interpreter";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command, pageContext } = body;

    if (!command || typeof command !== "string") {
      return NextResponse.json(
        { success: false, error: "Comando é obrigatório" },
        { status: 400 },
      );
    }

    console.log(`🧠 Interpretando comando: "${command}"`);

    // Usar LLM para interpretar o comando
    const interpretedCommand = await interpretCommand(command, pageContext);

    console.log(`✅ Comando interpretado:`, interpretedCommand);

    // Converter para formato do Desktop Agent
    const agentFormat = commandToAgentFormat(interpretedCommand);

    console.log(`🎭 Formato Desktop Agent:`, agentFormat);

    return NextResponse.json({
      success: true,
      result: agentFormat,
      interpretation: interpretedCommand, // Para debug
    });
  } catch (error) {
    console.error("❌ Erro na interpretação de comando:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro na interpretação",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "API de interpretação de comandos Playwright",
    usage: "POST com { command: string, pageContext?: object }",
  });
}
