import React, { useState, useCallback } from 'react';
import ImageUpload from '../common/ImageUpload';
import { generateMultimodalContent } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { StoreIcon, DownloadIcon } from '../Icons';
import { type MultimodalContent } from '../../services/geminiService';
import { sendToTelegram } from '../../services/telegramService';

const vibeOptions = ["Energetic & Fun", "Cinematic & Epic", "Modern & Clean", "Natural & Organic", "Tech & Futuristic"];
const lightingOptions = ["Studio Light", "Dramatic", "Natural Light", "Neon", "Golden Hour", "Soft Daylight"];
const contentTypeOptions = ["Hard Selling", "Soft Selling", "Storytelling", "Problem/Solution", "ASMR / Sensory", "Unboxing", "Educational", "Testimonial"];

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

const SelectControl: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}> = ({ label, value, onChange, options }) => (
  <div>
    <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-2">{label}</h3>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 text-neutral-800 dark:text-neutral-300 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
    >
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);


const ProductAdView: React.FC = () => {
  const [productImage, setProductImage] = useState<MultimodalContent | null>(null);
  const [productDesc, setProductDesc] = useState('');
  const [selections, setSelections] = useState({
    vibe: vibeOptions[0],
    lighting: lightingOptions[0],
    contentType: contentTypeOptions[0],
  });
  const [storyboard, setStoryboard] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = useCallback((base64: string, mimeType: string) => {
    setProductImage({ base64, mimeType });
  }, []);
  
  const handleSelection = (category: keyof typeof selections, value: string) => {
    setSelections(prev => ({ ...prev, [category]: value }));
  };

  const handleGenerate = async () => {
    if (!productImage || !productDesc) {
      setError("Please upload a product image and provide a description.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setStoryboard(null);

    const prompt = `
      You are an expert advertising copywriter and storyboard artist for social media video ads.
      Create a compelling 1-scene storyboard for a video ad based on the provided product image and details.
      The output should be a clear and concise storyboard.

      **Product Description:**
      ${productDesc}

      **Creative Direction:**
      - Vibe: ${selections.vibe}
      - Lighting: ${selections.lighting}
      - Content Type: ${selections.contentType}

      Based on all this information, describe one effective scene. What does the viewer see? What is the voiceover or on-screen text?
      Keep it short, engaging, and optimised for platforms like TikTok or Instagram Reels.
    `;

    try {
      const result = await generateMultimodalContent(prompt, [productImage]);
      setStoryboard(result);
      await addHistoryItem({
        type: 'Storyboard',
        prompt: `Product Ad: ${productDesc.substring(0, 50)}...`,
        result: result,
      });
      sendToTelegram(`*Video Storyline for "${productDesc.substring(0, 50)}..."*:\n\n${result}`, 'text');
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      console.error("Generation failed:", e);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      {/* Left Panel: Controls */}
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm flex flex-col gap-6 overflow-y-auto pr-4 custom-scrollbar">
        <div>
          <h1 className="text-3xl font-bold">Generate Video Storyline</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Automatically create a storyboard for your product ad.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-2">1. Upload Product</h2>
          <ImageUpload id="product-ad-upload" onImageUpload={handleImageUpload} />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">2. Product Description</h2>
          <textarea
            value={productDesc}
            onChange={(e) => setProductDesc(e.target.value)}
            placeholder="e.g., Long-sleeve flannel shirt, premium cotton, perfect for casual wear."
            rows={4}
            className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 text-neutral-800 dark:text-neutral-300 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
          />
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold">3. Creative Direction</h2>
          <SelectControl
            label="Vibe"
            value={selections.vibe}
            onChange={(value) => handleSelection('vibe', value)}
            options={vibeOptions}
          />
          <SelectControl
            label="Lighting"
            value={selections.lighting}
            onChange={(value) => handleSelection('lighting', value)}
            options={lightingOptions}
          />
          <SelectControl
            label="Content Type"
            value={selections.contentType}
            onChange={(value) => handleSelection('contentType', value)}
            options={contentTypeOptions}
          />
        </div>

        <div className="pt-4 mt-auto">
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-primary-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isLoading ? <Spinner /> : 'Generate Ad Concept'}
            </button>
            {error && <p className="text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
        </div>
      </div>

      {/* Right Panel: Results */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg flex flex-col p-4 shadow-sm">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Output</h2>
            {storyboard && !isLoading && (
                <button 
                  onClick={() => downloadText(storyboard, `1za7-storyboard-${Date.now()}.txt`)} 
                  className="flex items-center gap-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                >
                    <DownloadIcon className="w-4 h-4"/> Download
                </button>
            )}
        </div>
        <div className="flex-1 bg-neutral-100 dark:bg-neutral-800/50 rounded-md p-4 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <Spinner />
                <p className="mt-4 text-neutral-500 dark:text-neutral-400">Generating storyboard...</p>
              </div>
            </div>
          )}
          {storyboard && (
            <div className="prose dark:prose-invert max-w-none text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
              {storyboard}
            </div>
          )}
          {!isLoading && !storyboard && (
            <div className="flex items-center justify-center h-full text-center text-neutral-500 dark:text-neutral-600">
              <div>
                <StoreIcon className="w-16 h-16 mx-auto" />
                <p>Your Ad Output will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductAdView;