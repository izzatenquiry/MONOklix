import React from 'react';
import ChatInterface from '../common/ChatInterface';
import TwoColumnLayout from '../common/TwoColumnLayout';
import { ChatIcon } from '../Icons';

const ChatView: React.FC = () => {

    const leftPanel = (
        <>
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">Chat</h1>
              <p className="text-neutral-500 dark:text-neutral-400 mt-1">Start a conversation with the AI. Ask anything you want!</p>
            </div>
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-neutral-300 dark:text-neutral-700">
                    <ChatIcon className="w-24 h-24 mx-auto" />
                    <p className="mt-2 text-sm">Conversation will appear here</p>
                </div>
            </div>
        </>
    );

    const rightPanel = (
        <div className="w-full h-full flex flex-col p-0">
             <ChatInterface
                systemInstruction="You are a helpful and friendly AI assistant named 1za7. Chat and provide informative responses."
                placeholder="Type your message here..."
            />
        </div>
    );

    return <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} />;
};

export default ChatView;