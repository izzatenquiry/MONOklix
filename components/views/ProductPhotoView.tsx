import React, { useState, useCallback } from 'react';
import ImageUpload from '../common/ImageUpload';
import { composeImage, type MultimodalContent } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { CameraIcon, DownloadIcon, SunIcon, SparklesIcon, LeafIcon } from '../Icons';
import { type User } from '../../types';
import { sendToTelegram } from '../../services/telegramService';

const downloadImage = (base64Image: string, fileName: string) => {
  const link = document.createElement('a');
  link.href = `data:image/png;base64,${base64Image}`;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const vibeOptions = ["Studio Backdrop", "Tabletop / Surface", "Premium Texture", "Light & Shadow", "Color & Palette", "Nature & Organic", "Urban & Industrial", "Soft Daylight Studio", "Pastel Clean", "High-Key White", "Low-Key Moody", "Color Block", "Gradient Backdrop", "Paper Curl Backdrop", "Beige Seamless", "Shadow Play / Hard Light", "Marble Tabletop", "Pastel Soft"];
const lightingOptions = ["Random", "Soft Daylight", "Golden Hour", "Hard Light", "Window Backlight", "Warm Lamp Glow", "Mixed Light", "Studio Light", "Dramatic", "Natural Light", "Neon"];
const cameraOptions = ["Random", "Detail / Macro", "Close-Up", "Medium Close-Up", "Medium / Half-Body", "Three-Quarter", "Full Body", "Flatlay"];

const SelectControl: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}> = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-lg font-semibold mb-2">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 text-neutral-800 dark:text-neutral-300 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
    >
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const ProductPhotoView: React.FC = () => {
  const [productImage, setProductImage] = useState<MultimodalContent | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [vibe, setVibe] = useState('Studio Backdrop');
  const [lighting, setLighting] = useState('Random');
  const [camera, setCamera] = useState('Random');

  const handleGenerate = async () => {
    if (!productImage) {
      setError("Please upload a product image first.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setResultImage(null);

    const prompt = `
      Create a professional product photo for the uploaded image. Do not include any people or models.
      Focus only on the product.
      Place the product in the following setting:
      - Vibe / Background: ${vibe}
      - Lighting: ${lighting === 'Random' ? 'interesting, cinematic lighting' : lighting}
      - Camera Angle & Lens: ${camera === 'Random' ? 'a dynamic angle' : camera}
      The result should be a photorealistic, clean, and aesthetic image suitable for social media or an e-commerce listing.
    `;

    try {
      const result = await composeImage(prompt, [productImage]);
      if (result.imageBase64) {
        setResultImage(result.imageBase64);
        await addHistoryItem({
            type: 'Image',
            prompt: `Product Photo: Vibe - ${vibe}`,
            result: result.imageBase64,
        });
        sendToTelegram(result.imageBase64, 'image', `Product Photo: Vibe - ${vibe}`);
      } else {
        setError("The AI could not generate an image. Please try different settings.");
      }
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
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm flex flex-col gap-5 overflow-y-auto pr-4 custom-scrollbar">
        <h1 className="text-3xl font-bold">Product Photos</h1>
        <p className="text-neutral-500 dark:text-neutral-400 -mt-3">Create UGC content for products without models.</p>

        <div>
          <h2 className="text-lg font-semibold mb-2">1. Upload Product</h2>
          <ImageUpload id="product-photo-upload" onImageUpload={(base64, mimeType) => setProductImage({ base64, mimeType })} title="Click to upload" />
        </div>
        
        <SelectControl
          label="2. Select Content Vibe"
          value={vibe}
          onChange={setVibe}
          options={vibeOptions}
        />
        
        <SelectControl
          label="3. Lighting"
          value={lighting}
          onChange={setLighting}
          options={lightingOptions}
        />
        
        <SelectControl
          label="4. Camera & Lens"
          value={camera}
          onChange={setCamera}
          options={cameraOptions}
        />
        
        <div className="pt-4 mt-auto">
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-primary-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isLoading ? <Spinner /> : 'Generate Photo'}
            </button>
            {error && <p className="text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-lg flex flex-col p-4 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Output</h2>
        <div className="flex-1 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800/50 rounded-md relative group">
          {isLoading && (
            <div className="text-center">
              <Spinner />
              <p className="mt-4 text-neutral-500 dark:text-neutral-400">Generating image...</p>
            </div>
          )}
          {resultImage && !isLoading && (
            <div className="w-full h-full flex items-center justify-center">
                <img src={`data:image/png;base64,${resultImage}`} alt="Generated product" className="rounded-md max-h-full max-w-full object-contain" />
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => downloadImage(resultImage, `1za7-product-photo-${Date.now()}.png`)}
                      className="flex items-center gap-2 bg-black/60 text-white text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-black/80 transition-colors"
                    >
                        <DownloadIcon className="w-3 h-3"/> Download
                    </button>
                </div>
            </div>
          )}
          {!resultImage && !isLoading && (
            <div className="text-center text-neutral-500 dark:text-neutral-600">
              <CameraIcon className="w-16 h-16 mx-auto" />
              <p>Your content output will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductPhotoView;