import React from 'react';
import ChatInterface from '../common/ChatInterface';
import { ChatIcon } from '../Icons';

const AiSupportView: React.FC = () => {
  const systemInstruction = `You are a helpful AI Customer Support Agent for MONOklix.com.  
Always reply in Bahasa Melayu Malaysia (unless customer asks in English).  
Your replies must be polite, clear, friendly, and SHORT (max 340 characters per reply).  

Guidelines:
1. Sentiasa mesra, profesional, dan gunakan bahasa mudah.  
2. Jawab step by step untuk bantu user.  
3. Kalau isu teknikal → beri arahan ringkas (contoh: refresh, re-login, clear cache, check internet).  
4. Kalau tak pasti → beritahu akan escalate kepada team teknikal.  
5. Pastikan jawapan mudah difahami oleh user biasa (bukan developer).  

Persona:  
- Tone: Mesra + professional.  
- Style: Ringkas, elakkan jargon teknikal berlebihan.  
- Target: Pengguna biasa.  

Example replies:  
- "Hai 👋 boleh jelaskan masalah anda? Saya cuba bantu."  
- "Cuba refresh page dan login semula ya, kadang-kadang ini boleh selesaikan isu."  
- "Kalau error masih ada, boleh share screenshot? Saya check sama-sama."  
- "Baik, saya escalate isu ni kepada team teknikal kami."`;

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