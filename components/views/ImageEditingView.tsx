import React, { useState, useCallback } from 'react';
import { composeImage } from '../../services/geminiService';
import ImageUpload from '../common/ImageUpload';
import Spinner from '../common/Spinner';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { type MultimodalContent } from '../../services/geminiService';
import { DownloadIcon, ImageIcon } from '../Icons';

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

const ImageEditingView: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [result, setResult] = useState<{ text?: string, imageBase64?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = useCallback((base64: string, mimeType: string, file: File) => {
    setImageData({ base64, mimeType, file });
    setResult(null); // Clear previous result on new image upload
  }, []);

  const handleEdit = useCallback(async () => {
    if (!imageData) {
      setError("Please upload an image to edit.");
      return;
    }
    if (!prompt.trim()) {
      setError("Please enter an editing instruction.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const apiResult = await composeImage(prompt, [imageData]);
      setResult(apiResult);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      console.error("Edit failed:", e);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, imageData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
        {/* Left Panel: Controls */}
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm flex flex-col gap-5">
            <h1 className="text-3xl font-bold">Image Editing</h1>
            <p className="text-gray-500 dark:text-gray-400 -mt-3">Modify your images with simple text commands.</p>
            
            <div className="space-y-4">
                <ImageUpload id="image-edit-upload" onImageUpload={handleImageUpload} title="Upload Image to Edit"/>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., 'Make the sky look like a sunset', 'add a cat wearing a wizard hat'"
                  rows={3}
                  className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                />
                <button
                  onClick={handleEdit}
                  disabled={isLoading || !imageData}
                  className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading && <Spinner />}
                  Apply Edit
                </button>
                 {error && <p className="text-red-500 dark:text-red-400 text-center">{error}</p>}
            </div>
        </div>

      {/* Right Panel: Output */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg flex flex-col p-4 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Output</h2>
            <div className="flex-1 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800/50 rounded-md p-4">
              {isLoading ? (
                <div className="text-center">
                    <Spinner />
                    <p className="mt-4 text-neutral-500 dark:text-neutral-400">Applying magic edit...</p>
                </div>
              ) : result && imageData ? (
                <div className="w-full space-y-4">
                    {result.text && <MarkdownRenderer content={result.text} />}
                    {result.imageBase64 && (
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                          <div>
                            <h4 className="font-semibold text-center mb-2 text-gray-500 dark:text-gray-400">Original</h4>
                            <img src={URL.createObjectURL(imageData!.file)} alt="Original" className="rounded-lg w-full" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-center mb-2 text-gray-500 dark:text-gray-400">Edited</h4>
                             <div className="relative group">
                                <img src={`data:image/png;base64,${result.imageBase64}`} alt="Edited" className="rounded-lg w-full" />
                                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => downloadImage(result.imageBase64!, `1za7-edited-image-${Date.now()}.png`)}
                                      className="flex items-center gap-2 bg-black/60 text-white text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-black/80 transition-colors"
                                    >
                                        <DownloadIcon className="w-3 h-3"/> Download
                                    </button>
                                </div>
                            </div>
                          </div>
                        </div>
                    )}
                </div>
              ) : (
                <div className="text-center text-neutral-500 dark:text-neutral-600">
                  <ImageIcon className="w-16 h-16 mx-auto" />
                  <p className="mt-2">Your edited image will appear here.</p>
                </div>
              )}
            </div>
        </div>
    </div>
  );
};

export default ImageEditingView;
