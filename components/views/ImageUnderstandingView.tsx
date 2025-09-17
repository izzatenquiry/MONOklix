import React, { useState, useCallback } from 'react';
import { generateMultimodalContent } from '../../services/geminiService';
import ImageUpload from '../common/ImageUpload';
import Spinner from '../common/Spinner';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { type MultimodalContent } from '../../services/geminiService';
import { DownloadIcon, QuestionSolutionIcon } from '../Icons';

const downloadText = (text: string, fileName: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const ImageUnderstandingView: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [imageData, setImageData] = useState<MultimodalContent | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = useCallback((base64: string, mimeType: string) => {
    setImageData({ base64, mimeType });
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!imageData) {
      setError("Please upload an image first.");
      return;
    }
    if (!prompt.trim()) {
      setError("Please enter a question or prompt.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setResponse(null);
    try {
      const result = await generateMultimodalContent(prompt, [imageData]);
      setResponse(result);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      console.error("Analysis failed:", e);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, imageData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
        {/* Left Panel: Controls */}
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm flex flex-col gap-5">
            <h1 className="text-3xl font-bold">Image Understanding</h1>
            <p className="text-gray-500 dark:text-gray-400 -mt-3">Upload an image and ask the AI anything about it.</p>
            
            <div className="space-y-4">
                <ImageUpload id="image-understand-upload" onImageUpload={handleImageUpload} />
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., What is in this image? Describe the main subject. What color is the car?"
                  rows={3}
                  className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                />
                <button
                  onClick={handleAnalyze}
                  disabled={isLoading || !imageData}
                  className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading && <Spinner />}
                  Analyze Image
                </button>
                 {error && <p className="text-red-500 dark:text-red-400 text-center">{error}</p>}
            </div>
        </div>

      {/* Right Panel: Output */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg flex flex-col p-4 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Output</h2>
                {response && !isLoading && (
                    <button 
                      onClick={() => downloadText(response, `1za7-ai-analysis-${Date.now()}.txt`)} 
                      className="flex items-center gap-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                    >
                        <DownloadIcon className="w-4 h-4"/> Download
                    </button>
                )}
            </div>
            <div className="flex-1 bg-neutral-100 dark:bg-neutral-800/50 rounded-md p-4 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full text-center">
                        <div>
                            <Spinner />
                            <p className="mt-4 text-neutral-500 dark:text-neutral-400">Analyzing image...</p>
                        </div>
                    </div>
                ) : response ? (
                    <MarkdownRenderer content={response} />
                ) : (
                    <div className="flex items-center justify-center h-full text-center text-neutral-500 dark:text-neutral-600">
                        <div>
                            <QuestionSolutionIcon className="w-16 h-16 mx-auto" />
                            <p>Your analysis will appear here.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default ImageUnderstandingView;
