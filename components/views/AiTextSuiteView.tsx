import React, { useState } from 'react';
import ChatView from './ChatView';
import ContentIdeasView from './ContentIdeasView';
import MarketingCopyView from './MarketingCopyView';
import ProductAdView from './ProductAdView';

type TabId = 'content-ideas' | 'marketing-copy' | 'storyline';

interface Tab {
    id: TabId;
    label: string;
}

const tabs: Tab[] = [
    { id: 'content-ideas', label: 'Content Ideas' },
    { id: 'marketing-copy', label: 'Marketing Copy' },
    { id: 'storyline', label: 'Storyline' },
];

const AiTextSuiteView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabId>('content-ideas');

    const renderActiveTabContent = () => {
        switch (activeTab) {
            case 'content-ideas':
                return <ContentIdeasView />;
            case 'marketing-copy':
                return <MarketingCopyView />;
            case 'storyline':
                return <ProductAdView />;
            default:
                return <ContentIdeasView />;
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
                            className={`px-4 py-2 text-sm sm:px-6 sm:py-2.5 sm:text-base font-semibold rounded-full transition-colors duration-300 whitespace-nowrap ${
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