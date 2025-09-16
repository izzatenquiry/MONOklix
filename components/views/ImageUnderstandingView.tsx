import React, { useState, useCallback } from 'react';
import { generateMultimodalContent } from '../../services/geminiService';
import ImageUpload from '../common/ImageUpload';
import Spinner from '../common/Spinner';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { type MultimodalContent } from '../../services/geminiService';
import { DownloadIcon } from '../Icons';

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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold">Image Understanding</h2>
        <p className="text-gray-500 dark:text-gray-400">Upload an image and ask the AI anything about it.</p>
      </div>
      <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl shadow-lg space-y-4">
        <ImageUpload id="image-understand-upload" onImageUpload={handleImageUpload} />
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., What is in this image? Describe the main subject. What color is the car?"
          rows={2}
          className="w-full bg-gray-200 dark:bg-gray-700/60 border border-gray-300 dark:border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
        />
        <button
          onClick={handleAnalyze}
          disabled={isLoading || !imageData}
          className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading && <Spinner />}
          Analyze Image
        </button>
      </div>

      {error && <p className="text-red-500 dark:text-red-400 text-center">{error}</p>}

      {(isLoading || response) && (
        <div className="mt-6 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">AI Analysis</h3>
            {response && !isLoading && (
                <button 
                  onClick={() => downloadText(response, `1za7-ai-analysis-${Date.now()}.txt`)} 
                  className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                    <DownloadIcon className="w-4 h-4"/> Download
                </button>
            )}
          </div>
          {isLoading ? (
            <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
              <Spinner />
              <p>Analyzing... please wait.</p>
            </div>
          ) : (
            response && <MarkdownRenderer content={response} />
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUnderstandingView;