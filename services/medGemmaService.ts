import { HfInference } from "@huggingface/inference";
import { ChatMessage, Sender } from "../types";

// Models
const TEXT_MODEL = "google/medgemma-1.5-4b-it";
// MedGemma is text-only. We use BLIP for image captioning to "see" the image.
const VISION_MODEL = "Salesforce/blip-image-captioning-large";

// Initialize HF Inference
// Assuming process.env.API_KEY now holds the Hugging Face Token
const hf = new HfInference(process.env.API_KEY);

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
- Se receber uma descrição de imagem, trate como se estivesse vendo o exame, mas pergunte ao aluno o que ele vê primeiro.
`;

/**
 * Converts Base64 to Blob for HF API
 */
const base64ToBlob = async (base64: string, mimeType: string): Promise<Blob> => {
  const res = await fetch(`data:${mimeType};base64,${base64}`);
  return await res.blob();
};

/**
 * Generates a description for an image using a Vision model
 */
const describeImage = async (base64: string, mimeType: string): Promise<string> => {
  try {
    const blob = await base64ToBlob(base64, mimeType);
    const result = await hf.imageToText({
      model: VISION_MODEL,
      data: blob,
    });
    return result.generated_text || "Imagem médica anexada (não foi possível descrever detalhadamente).";
  } catch (error) {
    console.error("Erro ao descrever imagem:", error);
    return "Erro ao processar a imagem anexada.";
  }
};

/**
 * Formats messages for the LLM.
 * Note: MedGemma/Gemma usually handles user/model roles. 
 * We manually prepend the system prompt to the first user message or context 
 * because 'system' role is not always strictly supported in all Gemma chat templates via API.
 */
const formatMessages = (messages: ChatMessage[], initialCaseContext?: string) => {
  const apiMessages = [];
  
  // 1. Context Instruction (System Prompt + Initial Case)
  let contextContent = ESMERALDA_SYSTEM_PROMPT;
  
  if (initialCaseContext) {
    contextContent += `\n\n[DADOS DO CASO INICIAL - REFERÊNCIA]: ${initialCaseContext}`;
  }

  // Add a hidden start message with the system prompt context
  apiMessages.push({
    role: "user",
    content: contextContent
  });
  
  apiMessages.push({
    role: "assistant",
    content: "Entendido. Estou pronta para atuar como Esmeralda, a Tutora Socrática. Aguardo o caso ou a próxima interação."
  });

  // 2. Chat History (Last 10 messages to save context)
  const recentMessages = messages.slice(-10);
  
  recentMessages.forEach(msg => {
    apiMessages.push({
      role: msg.sender === Sender.USER ? "user" : "assistant",
      content: msg.text
    });
  });

  return apiMessages;
};

export const sendMessageToEsmeralda = async (
  currentMessage: string,
  history: ChatMessage[],
  initialCaseContext?: string,
  image?: { base64: string; mimeType: string }
): Promise<string> => {
  
  try {
    let finalUserMessage = currentMessage;

    // 1. Process Image if exists (Vision-to-Text)
    if (image) {
      const imageDescription = await describeImage(image.base64, image.mimeType);
      finalUserMessage = `${currentMessage}\n\n[SISTEMA: O usuário anexou uma imagem. Descrição automática da imagem: "${imageDescription}". Considere isso na análise clínica.]`;
    }

    // 2. Prepare History
    // We add the current formatted message temporarily to the list for formatting logic 
    // but in reality we construct the API payload directly.
    const messagesForContext = [...history];
    const apiMessages = formatMessages(messagesForContext, initialCaseContext);

    // Add current interaction
    apiMessages.push({
      role: "user",
      content: finalUserMessage
    });

    // 3. Call MedGemma
    const response = await hf.chatCompletion({
      model: TEXT_MODEL,
      messages: apiMessages,
      max_tokens: 1000,
      temperature: 0.6, // Slightly lower for more precise medical adherence
    });

    return response.choices[0].message.content || "Não consegui formular uma resposta clínica agora.";

  } catch (error) {
    console.error("Erro na comunicação com MedGemma/HF:", error);
    return "Houve um erro ao consultar a biblioteca médica (HF API). Verifique sua chave de acesso ou tente novamente.";
  }
};