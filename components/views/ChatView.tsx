import React from 'react';
import ChatInterface from '../common/ChatInterface';

const ChatView: React.FC = () => {
  return (
    <ChatInterface
      systemInstruction="You are a helpful and friendly AI assistant named 1za7. Chat and provide informative responses."
      title="Chat"
      description="Start a conversation with the AI. Ask anything you want!"
      placeholder="Type your message here..."
    />
  );
};

export default ChatView;