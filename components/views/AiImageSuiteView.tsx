import React, { useState, useEffect } from 'react';
import ImageEnhancerView from './ImageEnhancerView';
import ImageGenerationView from './ImageGenerationView';
import BackgroundRemoverView from './BackgroundRemoverView';
import ProductPhotoView from './ProductPhotoView';
import TiktokAffiliateView from './TiktokAffiliateView';
import Tabs, { type Tab } from '../common/Tabs';
import { type Language } from '../../types';
import { getTranslations } from '../../services/translations';

type TabId = 'generation' | 'enhancer' | 'remover' | 'product' | 'model';

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
  language: Language;
}

const AiImageSuiteView: React.FC<AiImageSuiteViewProps> = ({ onCreateVideo, onReEdit, imageToReEdit, clearReEdit, presetPrompt, clearPresetPrompt, language }) => {
    const [activeTab, setActiveTab] = useState<TabId>('generation');
    const T = getTranslations(language).tabs;

    const tabs: Tab<TabId>[] = [
        { id: 'generation', label: T.imageGeneration },
        { id: 'product', label: T.productPhotos },
        { id: 'model', label: T.modelPhotos },
        { id: 'enhancer', label: T.enhancer },
        { id: 'remover', label: T.bgRemover },
    ];

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
        const commonProps = { onReEdit, onCreateVideo, language };
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
