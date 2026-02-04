import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, PlusCircle, Loader2, Bot } from 'lucide-react';
import { ChatSession, ChatMessage, Sender } from '../types';
import { sendMessageToEsmeralda } from '../services/medGemmaService';
import MessageBubble from './MessageBubble';
import { v4 as uuidv4 } from 'uuid'; // Assumption: user handles uuid generation or we use a simple random string

// Simple ID generator if uuid is not available
const generateId = () => Math.random().toString(36).substring(2, 15);

interface ChatInterfaceProps {
  session: ChatSession;
  onUpdateSession: (updatedSession: ChatSession) => void;
  onNewChat: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ session, onUpdateSession, onNewChat }) => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session.messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Extract base64 data and mime type
        const [header, data] = base64String.split(',');
        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
        
        setSelectedImage({
          base64: data,
          mimeType: mimeType
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async () => {
    if ((!inputText.trim() && !selectedImage) || isLoading) return;

    const newMessage: ChatMessage = {
      id: generateId(),
      sender: Sender.USER,
      text: inputText,
      imageData: selectedImage?.base64,
      mimeType: selectedImage?.mimeType,
      timestamp: Date.now(),
    };

    // Optimistically update UI
    const updatedMessages = [...session.messages, newMessage];
    
    // Critical Logic for "Esmeralda": 
    // If this is the FIRST message of the session, we treat it as the "Initial Case Context".
    // We save this string separately in the session object to persist it across small context windows.
    let updatedSession = { ...session, messages: updatedMessages };
    
    if (session.messages.length === 0) {
        updatedSession.initialCaseContext = inputText + (selectedImage ? " [Imagem Anexada]" : "");
        // Also update title based on first few words
        updatedSession.title = inputText.slice(0, 30) + (inputText.length > 30 ? '...' : '');
    }

    onUpdateSession(updatedSession);
    setInputText('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      // Send to MedGemma (via HF)
      // We pass the messages history EXCLUDING the one we just added locally 
      const aiResponseText = await sendMessageToEsmeralda(
        newMessage.text,
        session.messages, // Pass history BEFORE the current message
        updatedSession.initialCaseContext, // Pass the persistent context
        selectedImage ? { base64: selectedImage.base64, mimeType: selectedImage.mimeType } : undefined
      );

      const botMessage: ChatMessage = {
        id: generateId(),
        sender: Sender.BOT,
        text: aiResponseText,
        timestamp: Date.now(),
      };

      onUpdateSession({
        ...updatedSession,
        messages: [...updatedMessages, botMessage],
      });
    } catch (error) {
      console.error(error);
      // Handle error visually if needed
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-emerald-800 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            Esmeralda (MedGemma)
          </h1>
          <p className="text-xs text-slate-500">Tutor Socrático | Powered by Google MedGemma 1.5</p>
        </div>
        <button 
          onClick={onNewChat}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-medium transition-colors"
        >
          <PlusCircle size={18} />
          <span className="hidden sm:inline">Novo Caso</span>
        </button>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth">
        {session.messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 text-emerald-600">
               <Loader2 size={40} className="animate-spin-slow" /> 
            </div>
            <h2 className="text-2xl font-semibold text-slate-700 mb-2">Inicie a Passagem do Caso</h2>
            <p className="max-w-md text-slate-500">
              Descreva a queixa principal, HMA e sinais vitais. A Esmeralda (MedGemma) irá guiar seu raciocínio.
            </p>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-left max-w-2xl">
              <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                <strong>Exemplo:</strong> "Paciente 45 anos, dor torácica há 2h, sudorese. PA 140/90."
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                <strong>Exemplo:</strong> "Criança com febre e tosse há 3 dias. Saturação 98%."
              </div>
            </div>
          </div>
        ) : (
          session.messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start mb-6 w-full">
            <div className="flex flex-row gap-3 items-center">
               <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white">
                  <Bot size={18} />
               </div>
               <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                 <Loader2 className="animate-spin text-emerald-600" size={18} />
                 <span className="text-sm text-slate-500">MedGemma está analisando o caso...</span>
               </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-200 p-4 sticky bottom-0 z-20">
        <div className="max-w-4xl mx-auto">
          
          {/* Image Preview */}
          {selectedImage && (
            <div className="flex items-center gap-2 mb-2 p-2 bg-slate-50 rounded-lg border border-slate-200 w-fit">
              <span className="text-xs font-medium text-slate-600">Imagem anexada</span>
              <button onClick={removeImage} className="text-slate-400 hover:text-red-500">
                <X size={14} />
              </button>
            </div>
          )}

          <div className="flex gap-2 items-end">
            {/* File Button */}
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
              title="Adicionar exame/imagem"
            >
              <Paperclip size={20} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleImageUpload}
            />

            {/* Text Input */}
            <div className="flex-1 relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Descreva o caso, sinais ou responda à Esmeralda..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-none max-h-32 min-h-[50px] custom-scrollbar"
                rows={1}
                style={{ height: 'auto', minHeight: '52px' }}
              />
            </div>

            {/* Send Button */}
            <button
              onClick={handleSendMessage}
              disabled={isLoading || (!inputText.trim() && !selectedImage)}
              className={`p-3 rounded-full flex items-center justify-center transition-all duration-200 ${
                isLoading || (!inputText.trim() && !selectedImage)
                  ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg'
              }`}
            >
              <Send size={20} />
            </button>
          </div>
          <p className="text-[10px] text-center text-slate-400 mt-2">
            A Esmeralda (MedGemma) pode cometer erros. Sempre verifique informações clínicas importantes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;