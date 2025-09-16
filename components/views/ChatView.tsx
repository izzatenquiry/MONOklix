import React from 'react';
import ChatInterface from '../common/ChatInterface';

const ChatView: React.FC = () => {
  return (
    <ChatInterface
      systemInstruction="Anda ialah pembantu AI bernama 1za7, yang sedia membantu dan mesra. Berbual dan berikan respons yang bermaklumat."
      title="Perbualan"
      description="Mulakan perbualan dengan AI. Tanya apa sahaja yang anda mahu!"
      placeholder="Taip mesej anda di sini..."
    />
  );
};

export default ChatView;