import React, { useState } from 'react';
import VideoGenerationView from './VideoGenerationView';
import VideoCombinerView from './VideoCombinerView';
import VoiceStudioView from './VoiceStudioView';
import ProductReviewView from './ProductReviewView';
import Tabs, { type Tab } from '../common/Tabs';
import { type Language } from '../../types';
import { getTranslations } from '../../services/translations';


type TabId = 'generation' | 'storyboard' | 'combiner' | 'voice';

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
  language: Language;
}

const AiVideoSuiteView: React.FC<AiVideoSuiteViewProps> = ({ preset, clearPreset, onReEdit, onCreateVideo, language }) => {
    const [activeTab, setActiveTab] = useState<TabId>('generation');
    const T = getTranslations(language).tabs;

    const tabs: Tab<TabId>[] = [
        { id: 'generation', label: T.videoGeneration },
        { id: 'storyboard', label: T.videoStoryboard },
        { id: 'combiner', label: T.videoCombiner },
        { id: 'voice', label: T.voiceStudio }
    ];

    const renderActiveTabContent = () => {
        const commonProps = { language };
        switch (activeTab) {
            case 'generation':
                return <VideoGenerationView {...commonProps} preset={preset} clearPreset={clearPreset} />;
            case 'storyboard':
                return <ProductReviewView {...commonProps} onReEdit={onReEdit} onCreateVideo={onCreateVideo} />;
            case 'combiner':
                // FIX: Removed props from VideoCombinerView as it does not accept any.
                return <VideoCombinerView />;
            case 'voice':
                // FIX: Removed props from VoiceStudioView as it does not accept any.
                return <VoiceStudioView />;
            default:
                return <VideoGenerationView {...commonProps} preset={preset} clearPreset={clearPreset} />;
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