import React, { useState, useCallback } from 'react';
import ImageUpload from '../common/ImageUpload';
import { composeImage, type MultimodalContent } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { CameraIcon, DownloadIcon, SunIcon, SparklesIcon, LeafIcon, WandIcon, VideoIcon } from '../Icons';
import { type User } from '../../types';
import { sendToTelegram } from '../../services/telegramService';
import TwoColumnLayout from '../common/TwoColumnLayout';

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

interface ProductPhotoViewProps {
  onReEdit: (preset: ImageEditPreset) => void;
  onCreateVideo: (preset: VideoGenPreset) => void;
}

const vibeOptions = ["Random", "Studio Backdrop", "Tabletop / Surface", "Premium Texture", "Light & Shadow", "Color & Palette", "Nature & Organic", "Urban & Industrial", "Soft Daylight Studio", "Pastel Clean", "High-Key White", "Low-Key Moody", "Color Block", "Gradient Backdrop", "Paper Curl Backdrop", "Beige Seamless", "Shadow Play / Hard Light", "Marble Tabletop", "Pastel Soft"];
const lightingOptions = ["Random", "Soft Daylight", "Golden Hour", "Hard Light", "Window Backlight", "Warm Lamp Glow", "Mixed Light", "Studio Light", "Dramatic", "Natural Light", "Neon"];
const cameraOptions = ["Random", "Detail / Macro", "Close-Up", "Medium Close-Up", "Medium / Half-Body", "Three-Quarter", "Full Body", "Flatlay"];

const SelectControl: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: (string | number)[];
  id: string;
}> = ({ value, onChange, options, id }) => (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 text-neutral-800 dark:text-neutral-300 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
    >
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
);

const ProductPhotoView: React.FC<ProductPhotoViewProps> = ({ onReEdit, onCreateVideo }) => {
  const [productImage, setProductImage] = useState<MultimodalContent | null>(null);
  const [resultImages, setResultImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const [vibe, setVibe] = useState('Random');
  const [lighting, setLighting] = useState('Random');
  const [camera, setCamera] = useState('Random');
  const [creativityLevel, setCreativityLevel] = useState(5);
  const [customPrompt, setCustomPrompt] = useState('');
  const [numberOfImages, setNumberOfImages] = useState(1);


  const buildPrompt = useCallback(() => {
    if (customPrompt.trim()) {
        return customPrompt.trim();
    }
    return `
      Create a professional product photo for the uploaded image. Do not include any people or models.
      Focus only on the product.
      Place the product in the following setting:
      - Vibe / Background: ${vibe}
      - Lighting: ${lighting === 'Random' ? 'interesting, cinematic lighting' : lighting}
      - Camera Angle & Lens: ${camera === 'Random' ? 'a dynamic angle' : camera}
      - AI Creativity Level: ${creativityLevel} out of 10. A level of 0 means being very literal and making minimal changes. A level of 10 means complete creative freedom to reinterpret the scene in an artistic way.
      The result should be a photorealistic, clean, and aesthetic image suitable for social media or an e-commerce listing.
    `;
  }, [vibe, lighting, camera, creativityLevel, customPrompt]);

  const handleGenerate = async () => {
    if (!productImage) {
      setError("Please upload a product image first.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setResultImages([]);

    const prompt = buildPrompt();

    try {
      const generatedImages: string[] = [];
      for (let i = 0; i < numberOfImages; i++) {
        const result = await composeImage(prompt, [productImage]);
        if (result.imageBase64) {
          generatedImages.push(result.imageBase64);
          setResultImages([...generatedImages]);
          setSelectedImageIndex(i);
        } else {
          throw new Error(`The AI failed to generate image #${i + 1}. Please try different settings.`);
        }
      }

      if (generatedImages.length > 0) {
        await addHistoryItem({
          type: 'Image',
          prompt: `Product Photo: ${prompt.substring(0, 50)}...`,
          result: generatedImages[0],
        });
        generatedImages.forEach((imgBase64, index) => {
          sendToTelegram(imgBase64, 'image', `Product Photo Generation: ${prompt}`);
          triggerDownload(imgBase64, `monoklix-product-photo-${index + 1}`);
        });
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      console.error("Generation failed:", e);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const leftPanel = (
    <>
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Product Photos</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">Create UGC content for products without models.</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">1. Upload Product</h2>
        <ImageUpload id="product-photo-upload" onImageUpload={(base64, mimeType) => setProductImage({ base64, mimeType })} title="Click to upload" />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Custom Prompt (Optional)</h2>
        <textarea
          id="custom-prompt"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Or write your own prompt here..."
          rows={3}
          className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 text-sm text-neutral-800 dark:text-neutral-300 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400">If filled, this prompt will override the dropdown selections below.</p>
      </div>
      
      <div>
        <h2 className="text-lg font-semibold mb-2">2. Select Content Vibe</h2>
        <SelectControl id="vibe-select" value={vibe} onChange={setVibe} options={vibeOptions} />
      </div>
      
      <div>
        <h2 className="text-lg font-semibold mb-2">3. Lighting</h2>
        <SelectControl id="lighting-select" value={lighting} onChange={setLighting} options={lightingOptions} />
      </div>
      
      <div>
        <h2 className="text-lg font-semibold mb-2">4. Camera & Lens</h2>
        <SelectControl id="camera-select" value={camera} onChange={setCamera} options={cameraOptions} />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">5. AI Creativity Level ({creativityLevel})</h2>
        <input
          id="creativity-slider"
          type="range"
          min="0"
          max="10"
          step="1"
          value={creativityLevel}
          onChange={(e) => setCreativityLevel(Number(e.target.value))}
          className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">6. Number of Images</h2>
        <SelectControl id="num-images-select" value={String(numberOfImages)} onChange={(val) => setNumberOfImages(Number(val))} options={[1, 2, 3, 4, 5]} />
      </div>
      
      <div className="pt-4 mt-auto">
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full mt-2 flex items-center justify-center gap-2 bg-primary-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isLoading ? <Spinner /> : 'Generate Photo(s)'}
          </button>
          {error && <p className="text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
      </div>
    </>
  );

  const rightPanel = (
    <>
        {isLoading && (
          <div className="text-center">
            <Spinner />
            <p className="mt-4 text-neutral-500 dark:text-neutral-400">Generating images... ({resultImages.length}/{numberOfImages})</p>
          </div>
        )}
        {resultImages.length > 0 && !isLoading && (
           <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2">
            <div className="flex-1 flex items-center justify-center min-h-0 w-full relative group">
              <img src={`data:image/png;base64,${resultImages[selectedImageIndex]}`} alt={`Generated product ${selectedImageIndex + 1}`} className="rounded-md max-h-full max-w-full object-contain" />
              <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button onClick={() => onReEdit({ base64: resultImages[selectedImageIndex], mimeType: 'image/png' })} title="Re-edit this image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
                  <WandIcon className="w-4 h-4" />
                </button>
                <button onClick={() => onCreateVideo({ prompt: buildPrompt(), image: { base64: resultImages[selectedImageIndex], mimeType: 'image/png' } })} title="Create Video from this image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
                  <VideoIcon className="w-4 h-4" />
                </button>
                <button onClick={() => triggerDownload(resultImages[selectedImageIndex], 'monoklix-product-photo')} title="Download Image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
                  <DownloadIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
            {resultImages.length > 1 && (
              <div className="flex-shrink-0 w-full flex justify-center">
                <div className="flex gap-2 overflow-x-auto p-2">
                  {resultImages.map((img, index) => (
                    <button key={index} onClick={() => setSelectedImageIndex(index)} className={`w-16 h-16 md:w-20 md:h-20 rounded-md overflow-hidden flex-shrink-0 transition-all duration-200 ${selectedImageIndex === index ? 'ring-4 ring-primary-500' : 'ring-2 ring-transparent hover:ring-primary-300'}`}>
                      <img src={`data:image/png;base64,${img}`} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {resultImages.length === 0 && !isLoading && (
          <div className="text-center text-neutral-500 dark:text-neutral-600">
            <CameraIcon className="w-16 h-16 mx-auto" />
            <p>Your content output will appear here.</p>
          </div>
        )}
    </>
  );
  
  return <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} />;
};

export default ProductPhotoView;