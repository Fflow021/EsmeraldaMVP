import { ChatMessage } from "../types";

/**
 * URL do seu backend via ngrok. 
 * Lembre-se que se você reiniciar o ngrok, essa URL pode mudar.
 */
// Usa endpoint relativo; o `vite` já contém proxy para o ngrok em `vite.config.ts`
const BACKEND_URL = "/chat";

/**
 * Envia a interação para o backend personalizado.
 * Estrutura do JSON enviada: { user_id, texto, imagem_url }
 */
export const sendMessageToEsmeralda = async (
  currentMessage: string,
  history: ChatMessage[],
  initialCaseContext?: string,
  image?: { base64: string; mimeType: string }
): Promise<string> => {
  
  try {
    // 1. Prepara o Payload conforme o contrato solicitado
    const payload = {
      user_id: "medico_01", 
      texto: currentMessage,
      // Se houver imagem, envia como DataURI (String Base64), senão null
      imagem_url: image ? `data:${image.mimeType};base64,${image.base64}` : null
    };

    // 2. Chamada HTTP POST
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true"
      },
      body: JSON.stringify(payload),
    });

    // 3. Verifica se a resposta foi bem sucedida
    if (!response.ok) {
      throw new Error(`Erro no servidor: ${response.status}`);
    }

    const data = await response.json();

    /**
     * IMPORTANTE: Aqui assumimos que seu backend responde um JSON 
     * no formato: { "resposta": "texto aqui" }
     */
    return data.resposta || data.response || data.text || "O servidor não retornou um campo de texto válido.";

  } catch (error) {
    console.error("Erro ao conectar com o backend:", error);
    return "Houve um erro ao consultar o servidor médico. Verifique se o ngrok e o backend estão rodando.";
  }
};