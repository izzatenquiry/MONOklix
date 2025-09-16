import React, { useState, useRef, useEffect, useCallback } from 'react';
import { type Chat } from '@google/genai';
import { createChatSession, streamChatResponse } from '../../services/geminiService';
import MarkdownRenderer from './MarkdownRenderer';
import { SendIcon } from '../Icons';
import Spinner from './Spinner';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface ChatInterfaceProps {
  systemInstruction: string;
  title: string;
  description: string;
  placeholder: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ systemInstruction, title, description, placeholder }) => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    setChat(createChatSession(systemInstruction));
  }, [systemInstruction]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !chat || isLoading) return;

    const userMessage: Message = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const stream = await streamChatResponse(chat, input);
      let modelResponse = '';
      setMessages((prev) => [...prev, { role: 'model', text: '...' }]);
      
      for await (const chunk of stream) {
        modelResponse += chunk.text;
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text = modelResponse;
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = { role: 'model', text: 'Maaf, berlaku sedikit kesilapan. Sila cuba lagi.' };
      setMessages((prev) => [...prev.slice(0, -1), errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, chat, isLoading]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold">{title}</h2>
        <p className="text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <div className="flex-1 overflow-y-auto pr-2 space-y-6">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex-shrink-0"></div>
            )}
            <div className={`max-w-xl p-4 rounded-2xl ${
              msg.role === 'user'
                ? 'bg-primary-600 text-white rounded-br-none'
                : 'bg-gray-200 dark:bg-gray-700/60 text-gray-800 dark:text-gray-200 rounded-bl-none'
            }`}>
              <MarkdownRenderer content={msg.text} />
            </div>
             {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0"></div>
            )}
          </div>
        ))}
        {isLoading && messages[messages.length-1].role === 'user' && (
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex-shrink-0"></div>
            <div className="max-w-xl p-4 rounded-2xl bg-gray-200 dark:bg-gray-700/60 text-gray-800 dark:text-gray-200 rounded-bl-none">
              <Spinner />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="mt-6">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            rows={1}
            className="w-full bg-gray-200 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-600 rounded-xl p-4 pr-16 resize-none focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all duration-200"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-primary-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 transition-transform duration-200"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;