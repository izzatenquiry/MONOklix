import React, { useState } from 'react';
import VideoGenerationView from './VideoGenerationView';
import VideoCombinerView from './VideoCombinerView';
import VoiceStudioView from './VoiceStudioView';
import ProductReviewView from './ProductReviewView';

type TabId = 'generation' | 'storyboard' | 'combiner' | 'voice';

interface Tab {
    id: TabId;
    label: string;
}

const tabs: Tab[] = [
    { id: 'generation', label: 'Video Generation' },
    { id: 'storyboard', label: 'Video Storyboard' },
    { id: 'combiner', label: 'Video Combiner' },
    { id: 'voice', label: 'Voice Studio' }
];

interface VideoGenPreset {
  prompt: string;
  image: { base64: string; mimeType: string; };
}

interface ImageEditPreset {
  base64: string;
  mimeType: string;
}

interface AiVideoSuiteViewProps {
  preset: VideoGenPreset | null;
  clearPreset: () => void;
  onReEdit: (preset: ImageEditPreset) => void;
  onCreateVideo: (preset: VideoGenPreset) => void;
}

const AiVideoSuiteView: React.FC<AiVideoSuiteViewProps> = ({ preset, clearPreset, onReEdit, onCreateVideo }) => {
    const [activeTab, setActiveTab] = useState<TabId>('generation');

    const renderActiveTabContent = () => {
        switch (activeTab) {
            case 'generation':
                return <VideoGenerationView preset={preset} clearPreset={clearPreset} />;
            case 'storyboard':
                return <ProductReviewView onReEdit={onReEdit} onCreateVideo={onCreateVideo} />;
            case 'combiner':
                return <VideoCombinerView />;
            case 'voice':
                return <VoiceStudioView />;
            default:
                return <VideoGenerationView preset={preset} clearPreset={clearPreset} />;
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

export default AiVideoSuiteView;