import React, { useState, useCallback } from 'react';
import { composeImage } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import ImageUpload from '../common/ImageUpload';
import Spinner from '../common/Spinner';
import { type MultimodalContent } from '../../services/geminiService';
import { DownloadIcon, WandIcon } from '../Icons';
import { sendToTelegram } from '../../services/telegramService';

interface ImageData extends MultimodalContent {
  file: File;
}

type EnhancementType = 'upscale' | 'colors';

const downloadImage = (base64Image: string, fileName: string) => {
  const link = document.createElement('a');
  link.href = `data:image/png;base64,${base64Image}`;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const ImageEnhancerView: React.FC = () => {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enhancementType, setEnhancementType] = useState<EnhancementType>('upscale');

  const handleImageUpload = useCallback((base64: string, mimeType: string, file: File) => {
    setImageData({ base64, mimeType, file });
    setResultImage(null);
    setError(null);
  }, []);

  const handleEnhance = useCallback(async () => {
    if (!imageData) {
      setError("Please upload an image first.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResultImage(null);
    
    let prompt = '';
    let historyPrompt = '';
    if (enhancementType === 'upscale') {
        prompt = "Upscale this image, making it sharper, clearer, and higher resolution. Preserve all original details.";
        historyPrompt = "Image Upscaled";
    } else {
        prompt = "Enhance the colors and lighting of this image to make it more vibrant and visually appealing. Adjust contrast and brightness for a professional look.";
        historyPrompt = "Image Colors Enhanced";
    }

    try {
      const result = await composeImage(prompt, [imageData]);
      if (result.imageBase64) {
        setResultImage(result.imageBase64);
        await addHistoryItem({
            type: 'Image',
            prompt: historyPrompt,
            result: result.imageBase64,
        });
        sendToTelegram(result.imageBase64, 'image', historyPrompt);
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      {/* Left Panel: Controls */}
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm flex flex-col gap-5">
        <h1 className="text-3xl font-bold">AI Image Enhancer</h1>
        <p className="text-gray-500 dark:text-gray-400 -mt-3">Improve image quality with AI-powered enhancements.</p>
        
        <div className="flex-1 flex flex-col justify-center">
            <ImageUpload id="enhancer-upload" onImageUpload={handleImageUpload} title="Upload Image"/>
        </div>
        
        <div className="space-y-4 pt-4">
            <div className="flex justify-center gap-4">
                <button onClick={() => setEnhancementType('upscale')} className={`px-6 py-2 rounded-full font-semibold transition-colors text-sm ${enhancementType === 'upscale' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>Upscale Quality</button>
                <button onClick={() => setEnhancementType('colors')} className={`px-6 py-2 rounded-full font-semibold transition-colors text-sm ${enhancementType === 'colors' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>Enhance Colors</button>
            </div>

            <button
              onClick={handleEnhance}
              disabled={isLoading || !imageData}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Spinner /> : 'Enhance Image'}
            </button>
            {error && <p className="text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
        </div>
      </div>

      {/* Right Panel: Output */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg flex flex-col p-4 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Output</h2>
        <div className="flex-1 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800/50 rounded-md p-4">
          {isLoading ? (
            <div className="text-center">
                <Spinner />
                <p className="mt-4 text-neutral-500 dark:text-neutral-400">Applying AI magic...</p>
            </div>
          ) : resultImage && imageData ? (
            <div className="w-full space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div>
                        <h4 className="font-semibold text-center mb-2 text-gray-500 dark:text-gray-400">Original</h4>
                        <img src={URL.createObjectURL(imageData!.file)} alt="Original" className="rounded-lg w-full" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-center mb-2 text-gray-500 dark:text-gray-400">Enhanced</h4>
                        <div className="relative group">
                            <img src={`data:image/png;base64,${resultImage}`} alt="Enhanced" className="rounded-lg w-full" />
                            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => downloadImage(resultImage, `1za7-enhanced-${Date.now()}.png`)}
                                    className="flex items-center gap-2 bg-black/60 text-white text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-black/80 transition-colors"
                                >
                                    <DownloadIcon className="w-3 h-3"/> Download
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          ) : (
            <div className="text-center text-neutral-500 dark:text-neutral-600">
              <WandIcon className="w-16 h-16 mx-auto" />
              <p className="mt-2">Your enhanced image will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageEnhancerView;