export enum Sender {
  USER = 'user',
  BOT = 'model',
}

export interface ChatMessage {
  id: string;
  sender: Sender;
  text: string;
  imageData?: string; // Base64 string
  mimeType?: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  // Specific to Esmeralda: We store the initial case description separately 
  // to ensure it's always included in the context window, even if history is truncated.
  initialCaseContext?: string; 
  createdAt: number;
}

export interface GeminiConfig {
  temperature: number;
  topK: number;
  topP: number;
}