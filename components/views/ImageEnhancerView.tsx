import React, { useState, useCallback } from 'react';
import { composeImage } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import ImageUpload from '../common/ImageUpload';
import Spinner from '../common/Spinner';
import { type MultimodalContent } from '../../services/geminiService';
import { DownloadIcon, WandIcon, VideoIcon } from '../Icons';
import TwoColumnLayout from '../common/TwoColumnLayout';
import { getImageEnhancementPrompt } from '../../services/promptManager';
import { type Language } from '../../types';
import { getTranslations } from '../../services/translations';


interface ImageData extends MultimodalContent {
  file: File;
}

type EnhancementType = 'upscale' | 'colors';

const triggerDownload = (data: string, fileNameBase: string) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${data}`;
    link.download = `${fileNameBase}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

interface VideoGenPreset {
  prompt: string;
  image: { base64: string; mimeType: string; };
}

interface ImageEditPreset {
  base64: string;
  mimeType: string;
}

interface ImageEnhancerViewProps {
  onReEdit: (preset: ImageEditPreset) => void;
  onCreateVideo: (preset: VideoGenPreset) => void;
  language: Language;
}


const ImageEnhancerView: React.FC<ImageEnhancerViewProps> = ({ onReEdit, onCreateVideo, language }) => {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enhancementType, setEnhancementType] = useState<EnhancementType>('upscale');

  const T = getTranslations(language).imageEnhancerView;

  const handleImageUpload = useCallback((base64: string, mimeType: string, file: File) => {
    setImageData({ base64, mimeType, file });
    setResultImage(null);
    setError(null);
  }, []);

  const handleEnhance = useCallback(async () => {
    if (!imageData) {
      setError("Please upload an image to enhance.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResultImage(null);
    
    const prompt = getImageEnhancementPrompt(enhancementType);
    const historyPrompt = enhancementType === 'upscale' ? "Image Upscaled" : "Image Colors Enhanced";

    try {
      const result = await composeImage(prompt, [imageData]);
      if (result.imageBase64) {
        setResultImage(result.imageBase64);
        await addHistoryItem({
            type: 'Image',
            prompt: historyPrompt,
            result: result.imageBase64,
        });
        triggerDownload(result.imageBase64, `monoklix-ai-${enhancementType}`);
      } else {
        setError("The AI could not enhance the image. Please try a different image.");
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      console.error("Enhancement failed:", e);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [imageData, enhancementType]);

  const leftPanel = (
    <>
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{T.title}</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">{T.subtitle}</p>
      </div>
      
      <div className="flex-1 flex flex-col justify-center">
          <ImageUpload id="enhancer-upload" onImageUpload={handleImageUpload} title={T.uploadTitle}/>
      </div>
      
      <div className="space-y-4 pt-4 mt-auto">
          <div className="flex justify-center gap-4">
              <button onClick={() => setEnhancementType('upscale')} className={`px-6 py-2 rounded-full font-semibold transition-colors text-sm ${enhancementType === 'upscale' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>{T.upscaleButton}</button>
              <button onClick={() => setEnhancementType('colors')} className={`px-6 py-2 rounded-full font-semibold transition-colors text-sm ${enhancementType === 'colors' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>{T.colorsButton}</button>
          </div>

          <button
            onClick={handleEnhance}
            disabled={isLoading || !imageData}
            className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Spinner /> : T.enhanceButton}
          </button>
          {error && <p className="text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
      </div>
    </>
  );

  const rightPanel = (
    <>
      {isLoading ? (
        <div className="text-center">
            <Spinner />
            <p className="mt-4 text-neutral-500 dark:text-neutral-400">{T.loading}</p>
        </div>
      ) : resultImage && imageData ? (
        <div className="w-full space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                    <h4 className="font-semibold text-center mb-2 text-gray-500 dark:text-gray-400">{T.original}</h4>
                    <img src={URL.createObjectURL(imageData!.file)} alt="Original" className="rounded-lg w-full" />
                </div>
                <div>
                    <h4 className="font-semibold text-center mb-2 text-gray-500 dark:text-gray-400">{T.enhanced}</h4>
                    <div className="relative group">
                        <img src={`data:image/png;base64,${resultImage}`} alt="Enhanced" className="rounded-lg w-full" />
                        <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                           <button onClick={() => onReEdit({ base64: resultImage, mimeType: 'image/png' })} title="Re-edit this image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"><WandIcon className="w-4 h-4" /></button>
                           <button onClick={() => onCreateVideo({ prompt: 'Video of this enhanced image', image: { base64: resultImage, mimeType: 'image/png' } })} title="Create Video from this image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"><VideoIcon className="w-4 h-4" /></button>
                           <button onClick={() => triggerDownload(resultImage, 'monoklix-enhanced')} title="Download Image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"><DownloadIcon className="w-4 h-4" /></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      ) : (
        <div className="text-center text-neutral-500 dark:text-neutral-600">
          <WandIcon className="w-16 h-16 mx-auto" />
          <p className="mt-2">{T.outputPlaceholder}</p>
        </div>
      )}
    </>
  );
  
  return <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} />;
};

export default ImageEnhancerView;
