import React from 'react';
import ChatInterface from '../common/ChatInterface';
import { ChatIcon } from '../Icons';
import { getSupportPrompt } from '../../services/promptManager';

const AiSupportView: React.FC = () => {
  const systemInstruction = getSupportPrompt();

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col">
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-2xl font-bold sm:text-3xl flex items-center gap-3">
          <ChatIcon className="w-8 h-8 text-primary-500"/>
          AI Support
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">Ada soalan atau perlukan bantuan? Tanya di sini. / Have a question or need help? Ask here.</p>
      </div>
       {/* This wrapper ensures the ChatInterface correctly fills the remaining vertical space */}
      <div className="flex-1 flex flex-col min-h-0">
        <ChatInterface
          systemInstruction={systemInstruction}
          placeholder="Ada apa-apa yang boleh saya bantu? / How can I help you today?"
        />
      </div>
    </div>
  );
};

export default AiSupportView;
