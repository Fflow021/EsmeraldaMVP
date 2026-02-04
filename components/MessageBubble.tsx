import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, Sender } from '../types';
import { Bot, User, FileImage } from 'lucide-react';

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isBot = message.sender === Sender.BOT;

  return (
    <div className={`flex w-full mb-6 ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] ${isBot ? 'flex-row' : 'flex-row-reverse'} gap-3`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isBot ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
          {isBot ? <Bot size={18} /> : <User size={18} />}
        </div>

        {/* Bubble */}
        <div className={`flex flex-col p-4 rounded-2xl shadow-sm ${
          isBot 
            ? 'bg-white border border-slate-100 rounded-tl-none text-slate-800' 
            : 'bg-emerald-600 text-white rounded-tr-none'
        }`}>
          
          {/* Image Display */}
          {message.imageData && (
            <div className="mb-3 rounded-lg overflow-hidden border border-white/20">
              <img 
                src={`data:${message.mimeType};base64,${message.imageData}`} 
                alt="Upload clínico" 
                className="max-h-64 object-cover w-full"
              />
            </div>
          )}

          {/* Text Content */}
          <div className={`prose prose-sm max-w-none ${isBot ? 'prose-emerald' : 'prose-invert'}`}>
             <ReactMarkdown>{message.text}</ReactMarkdown>
          </div>
          
          {/* Timestamp */}
          <span className={`text-[10px] mt-2 block opacity-70 ${isBot ? 'text-slate-400' : 'text-emerald-100'}`}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;