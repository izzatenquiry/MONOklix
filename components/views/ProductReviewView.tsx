import React, { useState, useCallback, useEffect, useRef } from 'react';
import ImageUpload from '../common/ImageUpload';
import { composeImage, type MultimodalContent, generateMultimodalContent } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { StarIcon, DownloadIcon, ImageIcon, VideoIcon, WandIcon } from '../Icons';
import { getProductReviewImagePrompt, getProductReviewStoryboardPrompt } from '../../services/promptManager';

const vibeOptions = ["Random", "Energetic & Fun", "Cinematic & Epic", "Modern & Clean", "Natural & Organic", "Tech & Futuristic"];
const backgroundVibes = [
    "Random", "Aesthetic Cafe", "Urban Style (Dining)", "Tropical Beach", "Luxury Apartment", "Flower Garden", "Old Building", "Classic Library", 
    "Minimalist Studio", "Rooftop Bar", "Autumn Garden", "Tokyo Street", "Scandinavian Interior", "Magical Forest", "Cyberpunk City", 
    "Bohemian Desert", "Modern Art Gallery", "Sunset Rooftop", "Snowy Mountain Cabin", "Industrial Loft", "Futuristic Lab", 
    "Pastel Dream Sky", "Palace Interior", "Country Kitchen", "Coral Reef", "Paris Street", "Asian Night Market", "Cruise Deck", 
    "Vintage Train Station", "Outdoor Basketball Court", "Professional Kitchen", "Luxury Hotel Lobby", "Rock Concert Stage", 
    "Zen Garden", "Mediterranean Villa Terrace", "Space / Sci-Fi Setting", "Modern Workspace", "Hot Spring Bath", 
    "Fantasy Throne Room", "Skyscraper Peak", "Sports Car Garage", "Botanical Greenhouse", "Ice Rink", "Classic Dance Studio", 
    "Beach Party Night", "Ancient Library", "Mountain Observation Deck", "Modern Dance Studio", "Speakeasy Bar", 
    "Rainforest Trail", "Rice Terrace Field"
];

const lightingOptions = ["Random", "Studio Light", "Dramatic", "Natural Light", "Neon", "Golden Hour", "Soft Daylight"];
const contentTypeOptions = ["Random", "Hard Selling", "Soft Selling", "Storytelling", "Problem/Solution", "ASMR / Sensory", "Unboxing", "Educational", "Testimonial"];
const languages = ["English", "Bahasa Malaysia", "Chinese"];

interface VideoGenPreset {
  prompt: string;
  image: { base64: string; mimeType: string; };
}

interface ImageEditPreset {
  base64: string;
  mimeType: string;
}

interface ProductReviewViewProps {
  onReEdit: (preset: ImageEditPreset) => void;
  onCreateVideo: (preset: VideoGenPreset) => void;
}

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

const triggerImageDownload = (data: string, fileNameBase: string) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${data}`;
    link.download = `${fileNameBase}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const ProductReviewView: React.FC<ProductReviewViewProps> = ({ onReEdit, onCreateVideo }) => {
  const [productImage, setProductImage] = useState<MultimodalContent | null>(null);
  const [faceImage, setFaceImage] = useState<MultimodalContent | null>(null);
  const [productDesc, setProductDesc] = useState('');
  const [selectedVibe, setSelectedVibe] = useState<string>(vibeOptions[0]);
  const [selectedBackgroundVibe, setSelectedBackgroundVibe] = useState<string>(backgroundVibes[0]);
  const [selectedLighting, setSelectedLighting] = useState<string>(lightingOptions[0]);
  const [selectedContentType, setSelectedContentType] = useState<string>(contentTypeOptions[0]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(languages[0]);
  const [storyboard, setStoryboard] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeCaptions, setIncludeCaptions] = useState<'Yes' | 'No'>('No');
  const [includeVoiceover, setIncludeVoiceover] = useState<'Yes' | 'No'>('No');

  // State for multi-image generation
  const [parsedScenes, setParsedScenes] = useState<string[]>([]);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [imageLoadingStatus, setImageLoadingStatus] = useState<boolean[]>(Array(4).fill(false));
  const [generatedImages, setGeneratedImages] = useState<(string | null)[]>(Array(4).fill(null));

  const handleProductImageUpload = useCallback((base64: string, mimeType: string) => {
    setProductImage({ base64, mimeType });
  }, []);

  const handleFaceImageUpload = useCallback((base64: string, mimeType: string) => {
    setFaceImage({ base64, mimeType });
  }, []);

  const handleGenerate = async () => {
    if (!productImage || !faceImage || !productDesc) {
      setError("A product image, face image, and product description are all required.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setStoryboard(null);
    setParsedScenes([]);
    setGeneratedImages(Array(4).fill(null));

    const prompt = getProductReviewStoryboardPrompt({
      productDesc,
      selectedLanguage,
      selectedVibe,
      selectedBackgroundVibe,
      selectedLighting,
      selectedContentType,
      includeCaptions,
      includeVoiceover
    });

    try {
      const imagesPayload: MultimodalContent[] = [productImage, faceImage];
      const result = await generateMultimodalContent(prompt, imagesPayload);
      setStoryboard(result);

      // Parse scenes from the result. Splits by lines like "**Scene 1:** Description"
      const scenes = result.split(/^\s*\*\*Scene \d+.*?\*\*/gm).map(s => s.trim()).filter(Boolean);
      setParsedScenes(scenes.slice(0, 4));

      await addHistoryItem({
        type: 'Storyboard',
        prompt: `Product Review: ${productDesc.substring(0, 50)}... (Lang: ${selectedLanguage})`,
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

  const handleCreateImages = async () => {
    if (parsedScenes.length === 0 || !productImage || !faceImage) {
      setError("A storyboard must be generated first before creating images.");
      return;
    }

    setIsGeneratingImages(true);
    setError(null);
    const loadingStates = Array(4).fill(false);
    
    // Clear previous images
    setGeneratedImages(Array(4).fill(null));

    for (let i = 0; i < Math.min(parsedScenes.length, 4); i++) {
        loadingStates[i] = true;
        setImageLoadingStatus([...loadingStates]);
        
        try {
            const scenePrompt = getProductReviewImagePrompt({
                sceneDescription: parsedScenes[i],
                selectedVibe,
                selectedBackgroundVibe,
                selectedLighting,
            });
            
            const result = await composeImage(
                scenePrompt,
                [productImage, faceImage]
            );

            if (result.imageBase64) {
                triggerImageDownload(result.imageBase64, `monoklix-review-image-${i + 1}`);

                setGeneratedImages(prev => {
                    const newImages = [...prev];
                    newImages[i] = result.imageBase64;
                    return newImages;
                });
                
                await addHistoryItem({
                    type: 'Image',
                    prompt: `Product Review Scene Image ${i + 1}: ${parsedScenes[i].substring(0, 50)}...`,
                    result: result.imageBase64
                });
            } else {
                 throw new Error("The AI did not return an image for this scene. Try rephrasing your inputs.");
            }

        } catch (e) {
            console.error(`Error generating image for scene ${i + 1}:`, e);
            const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
            setError(`Failed on scene ${i + 1}: ${errorMessage}`);
            break; 
        } finally {
            loadingStates[i] = false;
            setImageLoadingStatus([...loadingStates]);
        }
    }
    
    setIsGeneratingImages(false);
  };

  const leftPanel = (
    <>
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Product Review Storyboard</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">Automatically create storyboards and images for product reviews.</p>
      </div>

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
        <h2 className="text-lg font-semibold mb-2">3. Creative & Output Options</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="review-vibe-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Vibe</label>
                <select
                    id="review-vibe-select"
                    value={selectedVibe}
                    onChange={(e) => setSelectedVibe(e.target.value)}
                    className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                >
                    {vibeOptions.map(vibe => <option key={vibe} value={vibe}>{vibe}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="review-background-vibe-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Background Vibe</label>
                <select
                    id="review-background-vibe-select"
                    value={selectedBackgroundVibe}
                    onChange={(e) => setSelectedBackgroundVibe(e.target.value)}
                    className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                >
                    {backgroundVibes.map(vibe => <option key={vibe} value={vibe}>{vibe}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="review-lighting-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Lighting</label>
                <select
                    id="review-lighting-select"
                    value={selectedLighting}
                    onChange={(e) => setSelectedLighting(e.target.value)}
                    className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                >
                    {lightingOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="review-content-type-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Content Type</label>
                <select
                    id="review-content-type-select"
                    value={selectedContentType}
                    onChange={(e) => setSelectedContentType(e.target.value)}
                    className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                >
                    {contentTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="review-language-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Output Language</label>
                <select
                    id="review-language-select"
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                >
                    {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                </select>
            </div>
             <div>
                <label htmlFor="review-captions-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">On-Screen Text/Captions</label>
                <select
                    id="review-captions-select"
                    value={includeCaptions}
                    onChange={(e) => setIncludeCaptions(e.target.value as 'Yes' | 'No')}
                    className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                </select>
            </div>
            <div>
                <label htmlFor="review-voiceover-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Voiceover Script (Reviewer)</label>
                <select
                    id="review-voiceover-select"
                    value={includeVoiceover}
                    onChange={(e) => setIncludeVoiceover(e.target.value as 'Yes' | 'No')}
                    className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                </select>
            </div>
        </div>
      </div>

      <div className="pt-4 mt-auto">
        <button
          onClick={handleGenerate}
          disabled={isLoading || isGeneratingImages}
          className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {isLoading ? <Spinner /> : 'Generate Storyboard'}
        </button>
      </div>
      {error && !isGeneratingImages && <p className="text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
    </>
  );

 return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      {/* Left Panel: Controls */}
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
        {leftPanel}
      </div>

      {/* Right Panel Area (stacked) */}
      <div className="flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
        {/* Box 1: Text Output */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg flex flex-col p-4 shadow-sm min-h-[300px] flex-shrink-0">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Output</h2>
                {storyboard && !isLoading && (
                    <button 
                        onClick={() => downloadText(storyboard, `monoklix-review-storyboard-${Date.now()}.txt`)} 
                        className="flex items-center gap-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                    >
                        <DownloadIcon className="w-4 h-4"/> Download Text
                    </button>
                )}
            </div>
            <div className="flex-1 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800/50 rounded-md p-4 overflow-hidden relative">
                {isLoading ? (
                    <div className="text-center">
                        <Spinner />
                        <p className="mt-4 text-neutral-500 dark:text-neutral-400">Generating storyboard...</p>
                    </div>
                ) : storyboard ? (
                    <div className="prose dark:prose-invert max-w-none text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap w-full h-full overflow-y-auto pr-2 custom-scrollbar">
                        {storyboard}
                    </div>
                ) : (
                    <div className="text-center text-neutral-500 dark:text-neutral-600">
                        <StarIcon className="w-16 h-16 mx-auto" />
                        <p>Your Content Output will appear here.</p>
                    </div>
                )}
            </div>
        </div>

        {parsedScenes.length > 0 && !isLoading && (
            <div className="flex justify-center flex-shrink-0">
                <button
                    onClick={handleCreateImages}
                    disabled={isGeneratingImages}
                    className="flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-primary-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isGeneratingImages ? <Spinner/> : <ImageIcon className="w-5 h-5" />}
                    {isGeneratingImages ? 'Generating Images...' : 'Create 4 Images'}
                </button>
            </div>
        )}
        
        {(isGeneratingImages || generatedImages.some(v => v !== null)) && (
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm flex-shrink-0">
            <h3 className="text-xl font-bold mb-4">{isGeneratingImages ? "Generating Scene Images..." : "Generated Images"}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="aspect-[9/16] bg-neutral-200 dark:bg-neutral-800 rounded-lg flex items-center justify-center flex-col text-neutral-500 relative group overflow-hidden">
                  {imageLoadingStatus[index] ? (
                    <><Spinner /><p className="text-xs mt-2">Scene {index + 1}</p></>
                  ) : generatedImages[index] ? (
                    <>
                      <img src={`data:image/png;base64,${generatedImages[index]!}`} alt={`Scene ${index + 1}`} className="w-full h-full object-cover" />
                       <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                            <button onClick={() => onReEdit({ base64: generatedImages[index]!, mimeType: 'image/png' })} title="Re-edit this image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
                                <WandIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => onCreateVideo({ prompt: parsedScenes[index], image: { base64: generatedImages[index]!, mimeType: 'image/png' } })} title="Create Video from this image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
                                <VideoIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => triggerImageDownload(generatedImages[index]!, `scene-image-${index + 1}`)} title="Download Image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
                                <DownloadIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </>
                  ) : (
                    <div className="text-center text-xs p-2">
                       <p className="font-semibold">Scene {index + 1}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {error && isGeneratingImages && <p className="text-red-500 dark:text-red-400 mt-4 text-center text-sm">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductReviewView;