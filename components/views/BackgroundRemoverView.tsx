import React, { useState, useCallback } from 'react';
import { composeImage } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import ImageUpload from '../common/ImageUpload';
import Spinner from '../common/Spinner';
import { type MultimodalContent } from '../../services/geminiService';
import { DownloadIcon, ScissorsIcon } from '../Icons';
import { sendToTelegram } from '../../services/telegramService';

interface ImageData extends MultimodalContent {
  file: File;
}

const downloadImage = (base64Image: string, fileName: string) => {
  const link = document.createElement('a');
  link.href = `data:image/png;base64,${base64Image}`;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const BackgroundRemoverView: React.FC = () => {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = useCallback((base64: string, mimeType: string, file: File) => {
    setImageData({ base64, mimeType, file });
    setResultImage(null);
    setError(null);
  }, []);

  const handleRemove = useCallback(async () => {
    if (!imageData) {
      setError("Please upload an image first.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResultImage(null);
    
    try {
      const prompt = "Remove the background from this image, leaving only the main subject. The background should be transparent.";
      const result = await composeImage(prompt, [imageData]);
      if (result.imageBase64) {
        setResultImage(result.imageBase64);
        await addHistoryItem({
            type: 'Image',
            prompt: 'Background Removed',
            result: result.imageBase64,
        });
        sendToTelegram(result.imageBase64, 'image', 'Background Removed');
      } else {
        setError("The AI could not remove the background. Please try a different image.");
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      console.error("Removal failed:", e);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [imageData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      {/* Left Panel: Controls */}
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm flex flex-col gap-5">
        <h1 className="text-3xl font-bold">AI Background Remover</h1>
        <p className="text-gray-500 dark:text-gray-400 -mt-3">Instantly remove the background from any image with a single click.</p>
        
        <div className="flex-1 flex flex-col justify-center">
            <ImageUpload id="bg-remover-upload" onImageUpload={handleImageUpload} title="Upload Image"/>
        </div>
        
        <div className="pt-4">
            <button
              onClick={handleRemove}
              disabled={isLoading || !imageData}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Spinner /> : 'Remove Background'}
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
                <p className="mt-4 text-neutral-500 dark:text-neutral-400">Removing background...</p>
            </div>
          ) : resultImage && imageData ? (
            <div className="w-full space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div>
                        <h4 className="font-semibold text-center mb-2 text-gray-500 dark:text-gray-400">Original</h4>
                        <img src={URL.createObjectURL(imageData!.file)} alt="Original" className="rounded-lg w-full" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-center mb-2 text-gray-500 dark:text-gray-400">Result</h4>
                        <div className="relative group bg-gray-200 dark:bg-gray-700 rounded-lg" style={{backgroundImage: 'repeating-conic-gradient(#e5e7eb 0 25%, transparent 0 50%)', backgroundSize: '16px 16px'}}>
                            <img src={`data:image/png;base64,${resultImage}`} alt="Background removed" className="rounded-lg w-full" />
                            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => downloadImage(resultImage, `1za7-bg-removed-${Date.now()}.png`)}
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
              <ScissorsIcon className="w-16 h-16 mx-auto" />
              <p className="mt-2">Your output will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BackgroundRemoverView;