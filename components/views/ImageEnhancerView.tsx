import React, { useState, useCallback } from 'react';
import { composeImage } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import ImageUpload from '../common/ImageUpload';
import Spinner from '../common/Spinner';
import { type MultimodalContent } from '../../services/geminiService';
import { DownloadIcon, WandIcon } from '../Icons';

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
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold">AI Image Enhancer</h2>
        <p className="text-gray-500 dark:text-gray-400">Improve the quality of your images with AI-powered enhancements.</p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl shadow-lg space-y-4">
        <ImageUpload id="enhancer-upload" onImageUpload={handleImageUpload} title="Upload Image to Enhance"/>
        
        <div className="flex justify-center gap-4 pt-2">
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
      </div>
      
      {error && <p className="text-red-500 dark:text-red-400 text-center">{error}</p>}

      {isLoading && (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <Spinner />
          <p className="mt-4 text-gray-500 dark:text-gray-400">Applying AI magic... this may take a moment.</p>
        </div>
      )}

      {resultImage && !isLoading && (
        <div className="mt-6 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl space-y-4">
          <h3 className="text-2xl font-semibold text-center mb-4">Result</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
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
      )}

       {!resultImage && !isLoading && !error && !imageData && (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <WandIcon className="w-16 h-16 mx-auto" />
          <p className="mt-2">Upload an image to get started</p>
        </div>
      )}
    </div>
  );
};

export default ImageEnhancerView;