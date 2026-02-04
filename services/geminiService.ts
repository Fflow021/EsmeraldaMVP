import { GoogleGenAI, Content, Part } from "@google/genai";
import { ChatMessage, Sender } from "../types";

// Using gemini-2.5-flash-image as it supports both text and image inputs efficiently
// and is suitable for general tasks including reasoning.
const MODEL_NAME = "gemini-2.5-flash-image";

const ESMERALDA_SYSTEM_PROMPT = `
Você é a Esmeralda, uma IA Tutora Socrática Senior em Medicina.
OBJETIVO: Guiar o raciocínio clínico de médicos júnior e estudantes sem dar a resposta pronta.
FILOSOFIA: "Incerteza Produtiva". Evite a "descerebralização".
IDIOMA: Português (Brasil).

FLUXO DE INTERAÇÃO:
1. Fase de Segurança: Ao receber um caso, analise IMEDIATAMENTE sinais de instabilidade hemodinâmica ou risco de vida iminente (red flags).
   - Se o paciente estiver instável: ABANDONE o método socrático e seja DIRETIVA (ex: "Paciente instável. Indique protocolo de sepse agora.").
2. Fase Socrática (Se estável):
   - NÃO dê o diagnóstico ou tratamento imediatamente.
   - Faça perguntas guiadas para verificar premissas.
   - Force o usuário a buscar dados que faltam (HMA, Exame Físico).
   - Exemplo: Se o usuário diz "Tosse", pergunte "Seca ou produtiva? Tempo de evolução?".
   - Se o usuário pedir a resposta, negue educadamente e devolva uma pergunta que ajude a construir o raciocínio.

REGRAS RÍGIDAS:
- Nunca liste diagnósticos diferenciais completos de início. Peça para o aluno listar.
- Seja breve e encorajadora, mas firme no método pedagógico.
- Se o usuário enviar uma imagem (ex: Raio-X, ECG), pergunte o que ELE vê antes de laudar.
`;

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Converts internal ChatMessage format to Gemini API Content format.
 */
const formatHistory = (messages: ChatMessage[], initialCaseContext?: string): Content[] => {
  const contents: Content[] = [];

  // Strategy for Small Context Window:
  // We explicitly prepend the Initial Case Context as a user message at the very start of the history logic
  // if it exists, to ensure the model never "forgets" the patient's baseline.
  
  if (initialCaseContext) {
    contents.push({
      role: 'user',
      parts: [{ text: `[DADOS DO CASO INICIAL - REFERÊNCIA PERMANENTE]: ${initialCaseContext}` }]
    });
  }

  // We map the rest of the conversation
  // We limit to the last 15 messages to preserve context window for output tokens
  const recentMessages = messages.slice(-15); 

  recentMessages.forEach((msg) => {
    const parts: Part[] = [];
    
    if (msg.imageData && msg.mimeType) {
      parts.push({
        inlineData: {
          data: msg.imageData,
          mimeType: msg.mimeType,
        },
      });
    }

    if (msg.text) {
      parts.push({ text: msg.text });
    }

    contents.push({
      role: msg.sender === Sender.USER ? 'user' : 'model',
      parts: parts,
    });
  });

  return contents;
};

export const sendMessageToEsmeralda = async (
  currentMessage: string,
  history: ChatMessage[],
  initialCaseContext?: string,
  image?: { base64: string; mimeType: string }
): Promise<string> => {
  
  try {
    const formattedHistory = formatHistory(history, initialCaseContext);

    // Prepare current parts
    const currentParts: Part[] = [];
    if (image) {
      currentParts.push({
        inlineData: {
          data: image.base64,
          mimeType: image.mimeType,
        },
      });
    }
    if (currentMessage) {
      currentParts.push({ text: currentMessage });
    }

    // Add current message to contents for a stateless generateContent call
    // (We manage history manually to control the context window strategy)
    const finalContents = [...formattedHistory, { role: 'user', parts: currentParts }];

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: finalContents,
      config: {
        systemInstruction: ESMERALDA_SYSTEM_PROMPT,
        temperature: 0.7, // Balanced for creativity in questions but accuracy in medical facts
        maxOutputTokens: 1000,
      },
    });

    return response.text || "Não consegui gerar uma resposta clínica no momento.";

  } catch (error) {
    console.error("Error communicating with Esmeralda:", error);
    return "Ocorreu um erro ao processar o raciocínio clínico. Por favor, tente novamente.";
  }
};