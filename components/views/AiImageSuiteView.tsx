import React, { useState, useEffect } from 'react';
import ImageEnhancerView from './ImageEnhancerView';
import ImageGenerationView from './ImageGenerationView';
import BackgroundRemoverView from './BackgroundRemoverView';
import ProductPhotoView from './ProductPhotoView';
import TiktokAffiliateView from './TiktokAffiliateView';
import Tabs, { type Tab } from '../common/Tabs';

type TabId = 'generation' | 'enhancer' | 'remover' | 'product' | 'model';

const tabs: Tab<TabId>[] = [
    { id: 'generation', label: 'Image Generation' },
    { id: 'product', label: 'Product Photos' },
    { id: 'model', label: 'Model Photos' },
    { id: 'enhancer', label: 'Enhancer' },
    { id: 'remover', label: 'BG Remover' },
];

interface VideoGenPreset {
  prompt: string;
  image: { base64: string; mimeType: string; };
}

interface ImageEditPreset {
  base64: string;
  mimeType: string;
}

interface AiImageSuiteViewProps {
  onCreateVideo: (preset: VideoGenPreset) => void;
  onReEdit: (preset: ImageEditPreset) => void;
  imageToReEdit: ImageEditPreset | null;
  clearReEdit: () => void;
  presetPrompt: string | null;
  clearPresetPrompt: () => void;
}


const AiImageSuiteView: React.FC<AiImageSuiteViewProps> = ({ onCreateVideo, onReEdit, imageToReEdit, clearReEdit, presetPrompt, clearPresetPrompt }) => {
    const [activeTab, setActiveTab] = useState<TabId>('generation');

    useEffect(() => {
        if (imageToReEdit) {
            setActiveTab('generation');
        }
    }, [imageToReEdit]);

    useEffect(() => {
        if (presetPrompt) {
            setActiveTab('generation');
        }
    }, [presetPrompt]);

    const renderActiveTabContent = () => {
        const commonProps = { onReEdit, onCreateVideo };
        switch (activeTab) {
            case 'generation':
                return <ImageGenerationView 
                          {...commonProps} 
                          imageToReEdit={imageToReEdit} 
                          clearReEdit={clearReEdit}
                          presetPrompt={presetPrompt}
                          clearPresetPrompt={clearPresetPrompt} 
                        />;
            case 'enhancer':
                return <ImageEnhancerView {...commonProps} />;
            case 'remover':
                return <BackgroundRemoverView {...commonProps} />;
            case 'product':
                return <ProductPhotoView {...commonProps} />;
            case 'model':
                return <TiktokAffiliateView {...commonProps} />;
            default:
                return <ImageGenerationView 
                          {...commonProps} 
                          imageToReEdit={imageToReEdit} 
                          clearReEdit={clearReEdit}
                          presetPrompt={presetPrompt}
                          clearPresetPrompt={clearPresetPrompt} 
                        />;
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

export default AiImageSuiteView;