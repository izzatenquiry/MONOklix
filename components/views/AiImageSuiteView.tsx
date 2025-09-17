import React, { useState } from 'react';
import ImageEnhancerView from './ImageEnhancerView';
import ImageGenerationView from './ImageGenerationView';
import BackgroundRemoverView from './BackgroundRemoverView';
import ProductPhotoView from './ProductPhotoView';
import TiktokAffiliateView from './TiktokAffiliateView';

type TabId = 'generation' | 'enhancer' | 'remover' | 'product' | 'model';

interface Tab {
    id: TabId;
    label: string;
}

const tabs: Tab[] = [
    { id: 'generation', label: 'Image Generation' },
    { id: 'enhancer', label: 'Enhancer' },
    { id: 'remover', label: 'BG Remover' },
    { id: 'product', label: 'Product Photos' },
    { id: 'model', label: 'Model Photos' }
];

interface VideoGenPreset {
  prompt: string;
  image: { base64: string; mimeType: string; };
}

interface AiImageSuiteViewProps {
  onCreateVideo: (preset: VideoGenPreset) => void;
}


const AiImageSuiteView: React.FC<AiImageSuiteViewProps> = ({ onCreateVideo }) => {
    const [activeTab, setActiveTab] = useState<TabId>('generation');

    const renderActiveTabContent = () => {
        switch (activeTab) {
            case 'generation':
                return <ImageGenerationView onCreateVideo={onCreateVideo} />;
            case 'enhancer':
                return <ImageEnhancerView />;
            case 'remover':
                return <BackgroundRemoverView />;
            case 'product':
                return <ProductPhotoView />;
            case 'model':
                return <TiktokAffiliateView />;
            default:
                return <ImageGenerationView onCreateVideo={onCreateVideo} />;
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

export default AiImageSuiteView;