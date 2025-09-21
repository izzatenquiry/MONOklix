import React, { useState } from 'react';
import VideoGenerationView from './VideoGenerationView';
import VideoCombinerView from './VideoCombinerView';
import VoiceStudioView from './VoiceStudioView';
import ProductReviewView from './ProductReviewView';
import Tabs, { type Tab } from '../common/Tabs';

type TabId = 'generation' | 'storyboard' | 'combiner' | 'voice';

const tabs: Tab<TabId>[] = [
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
                <Tabs 
                    tabs={tabs}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />
            </div>
            <div className="flex-1 overflow-y-auto">
                {renderActiveTabContent()}
            </div>
        </div>
    );
};

export default AiVideoSuiteView;