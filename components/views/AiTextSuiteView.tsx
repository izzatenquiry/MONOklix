import React, { useState } from 'react';
import ChatView from './ChatView';
import ContentIdeasView from './ContentIdeasView';
import MarketingCopyView from './MarketingCopyView';
import ProductAdView from './ProductAdView';
import ProductReviewView from './ProductReviewView';

type TabId = 'chat' | 'content-ideas' | 'marketing-copy' | 'storyline' | 'storyboard';

interface Tab {
    id: TabId;
    label: string;
}

const tabs: Tab[] = [
    { id: 'chat', label: 'Chat' },
    { id: 'content-ideas', label: 'Content Ideas' },
    { id: 'marketing-copy', label: 'Marketing Copy' },
    { id: 'storyline', label: 'Video Storyline' },
    { id: 'storyboard', label: 'Video Storyboard' }
];

const AiTextSuiteView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabId>('chat');

    const renderActiveTabContent = () => {
        switch (activeTab) {
            case 'chat':
                return <ChatView />;
            case 'content-ideas':
                return <ContentIdeasView />;
            case 'marketing-copy':
                return <MarketingCopyView />;
            case 'storyline':
                return <ProductAdView />;
            case 'storyboard':
                return <ProductReviewView />;
            default:
                return <ChatView />;
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex-shrink-0 mb-6 flex justify-center">
                <div className="p-1 bg-neutral-200 dark:bg-neutral-800 rounded-full flex items-center gap-1 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-2.5 text-base font-semibold rounded-full transition-colors duration-300 whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'bg-white dark:bg-neutral-900 text-primary-600 dark:text-primary-400 shadow-md'
                                    : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                {renderActiveTabContent()}
            </div>
        </div>
    );
};

export default AiTextSuiteView;