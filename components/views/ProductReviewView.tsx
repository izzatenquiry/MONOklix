import React, { useState, useCallback } from 'react';
import ImageUpload from '../common/ImageUpload';
import { generateMultimodalContent, type MultimodalContent } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { StarIcon, DownloadIcon } from '../Icons';
import { type User } from '../../types';

const backgroundVibes = [
    "Aesthetic Cafe", "Urban Style (Dining)", "Tropical Beach", "Luxury Apartment", "Flower Garden", "Old Building", "Classic Library", 
    "Minimalist Studio", "Rooftop Bar", "Autumn Garden", "Tokyo Street", "Scandinavian Interior", "Magical Forest", "Cyberpunk City", 
    "Bohemian Desert", "Modern Art Gallery", "Sunset Rooftop", "Snowy Mountain Cabin", "Industrial Loft", "Futuristic Lab", 
    "Pastel Dream Sky", "Palace Interior", "Country Kitchen", "Coral Reef", "Paris Street", "Asian Night Market", "Cruise Deck", 
    "Vintage Train Station", "Outdoor Basketball Court", "Professional Kitchen", "Luxury Hotel Lobby", "Rock Concert Stage", 
    "Zen Garden", "Mediterranean Villa Terrace", "Space / Sci-Fi Setting", "Modern Workspace", "Hot Spring Bath", 
    "Fantasy Throne Room", "Skyscraper Peak", "Sports Car Garage", "Botanical Greenhouse", "Ice Rink", "Classic Dance Studio", 
    "Beach Party Night", "Ancient Library", "Mountain Observation Deck", "Modern Dance Studio", "Speakeasy Bar", 
    "Rainforest Trail", "Rice Terrace Field"
];

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

const ProductReviewView: React.FC = () => {
  const [productImage, setProductImage] = useState<MultimodalContent | null>(null);
  const [faceImage, setFaceImage] = useState<MultimodalContent | null>(null);
  const [productDesc, setProductDesc] = useState('');
  const [selectedVibe, setSelectedVibe] = useState<string>(backgroundVibes[0]);
  const [storyboard, setStoryboard] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProductImageUpload = useCallback((base64: string, mimeType: string) => {
    setProductImage({ base64, mimeType });
  }, []);

  const handleFaceImageUpload = useCallback((base64: string, mimeType: string) => {
    setFaceImage({ base64, mimeType });
  }, []);

  const handleGenerate = async () => {
    if (!productImage || !faceImage || !productDesc || !selectedVibe) {
      setError("Please upload both images, provide a description, and select a vibe.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setStoryboard(null);

    const prompt = `
      You are an expert AI assistant specialising in creating storyboards for product review videos for social media.
      Based on the user's product image, face image, product description, and chosen background vibe, generate a short and engaging storyboard for a review video.

      **Product Description:**
      ${productDesc}

      **Background Vibe:**
      ${selectedVibe}

      Combine these elements to create a scene description, including camera shots, on-screen text/captions, and a voiceover script where the person (from the face image) is reviewing the product.
    `;

    try {
      const imagesPayload: MultimodalContent[] = [productImage, faceImage];
      const result = await generateMultimodalContent(prompt, imagesPayload);
      setStoryboard(result);
      await addHistoryItem({
        type: 'Storyboard',
        prompt: `Product Review: ${productDesc.substring(0, 50)}...`,
        result: result,
      });
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
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm flex flex-col gap-5 overflow-y-auto pr-4">
        <h1 className="text-3xl font-bold">Product Review Storyboard</h1>
        <p className="text-neutral-500 dark:text-neutral-400 -mt-3">Automatically create storyboards, visuals, and videos for product reviews.</p>

        <div>
          <h2 className="text-lg font-semibold mb-2">1. Upload Assets</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ImageUpload id="product-review-product-upload" onImageUpload={handleProductImageUpload} title="Product Photo" />
            <ImageUpload id="product-review-face-upload" onImageUpload={handleFaceImageUpload} title="Face Photo" />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">2. Product Description</h2>
          <textarea
            value={productDesc}
            onChange={(e) => setProductDesc(e.target.value)}
            placeholder="e.g., Face wash with green tea extract..."
            rows={4}
            className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">3. Background Vibe</h2>
          <select
            value={selectedVibe}
            onChange={(e) => setSelectedVibe(e.target.value)}
            className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
          >
            {backgroundVibes.map(vibe => (
              <option key={vibe} value={vibe}>
                {vibe}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full mt-2 flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {isLoading ? <Spinner /> : 'Generate Content'}
        </button>
        {error && <p className="text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
      </div>

      {/* Right Panel: Results */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg flex flex-col p-4 shadow-sm">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Output</h2>
            {storyboard && !isLoading && (
                 <button 
                  onClick={() => downloadText(storyboard, `1za7-review-storyboard-${Date.now()}.txt`)} 
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
                <StarIcon className="w-16 h-16 mx-auto" />
                <p>Your Content Output will appear here.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductReviewView;