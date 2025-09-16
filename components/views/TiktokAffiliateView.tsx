import React, { useState, useCallback } from 'react';
import ImageUpload from '../common/ImageUpload';
import { composeImage, type MultimodalContent } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { TikTokIcon, DownloadIcon, UserIcon } from '../Icons';
import { type User } from '../../types';

const CreativeButton: React.FC<{
  label: string;
  isSelected: boolean;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
}> = ({ label, isSelected, onClick, icon: Icon }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-center gap-3 p-3 rounded-lg border text-left transition-all duration-200 w-full
      ${isSelected
        ? 'border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-400'
        : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100/50 dark:hover:bg-neutral-700/50 hover:border-neutral-400 dark:hover:border-neutral-500'
      }`}
  >
    {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
    <span className="font-semibold text-sm flex-1 text-center">{label}</span>
  </button>
);

const downloadImage = (base64Image: string, fileName: string) => {
  const link = document.createElement('a');
  link.href = `data:image/png;base64,${base64Image}`;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const modelFaceOptions = ["Random", "Malaysia", "Vietnam", "England", "USA", "Arab", "Russia", "Japan", "Korea", "Thailand"];
const lightingOptions = ["Random", "Soft Daylight", "Golden Hour", "Hard Light", "Window Backlight", "Warm Lamp Glow", "Mixed Light", "Studio Light", "Dramatic", "Natural Light", "Neon"];
const cameraOptions = ["Random", "Detail / Macro", "Close-Up", "Medium Close-Up", "Medium / Half-Body", "Three-Quarter", "Full Body", "Flatlay"];
const poseOptions = ["Random", "Professional Model Pose", "Standing Relaxed", "Sitting on Chair Edge", "Walking Slowly", "Leaning on Wall", "Half-Body Rotation"];
const vibeOptions = [
    "Studio", "Bedroom", "Bathroom / Vanity", "Living Room", "Kitchen / Dining", "Workspace / Study", "Entryway / Laundry", "Urban Clean", 
    "Coffee Shop Aesthetic", "Urban Night", "Tropical Beach", "Luxury Apartment", "Flower Garden", "Old Building", "Classic Library", 
    "Minimalist Studio", "Rooftop Bar", "Autumn Garden", "Tokyo Street", "Scandinavian Interior", "Magical Forest", "Cyberpunk City", 
    "Bohemian Desert", "Modern Art Gallery", "Sunset Rooftop", "Snowy Mountain Cabin", "Industrial Loft", "Futuristic Lab", 
    "Pastel Dream Sky", "Palace Interior", "Country Kitchen", "Coral Reef", "Paris Street", "Asian Night Market", "Cruise Deck", 
    "Vintage Train Station", "Outdoor Basketball Court", "Professional Kitchen", "Luxury Hotel Lobby", "Rock Concert Stage", 
    "Zen Garden", "Mediterranean Villa Terrace", "Space / Sci-Fi Setting", "Modern Workspace", "Hot Spring Bath", 
    "Fantasy Throne Room", "Skyscraper Peak", "Sports Car Garage", "Botanical Greenhouse", "Ice Rink", "Classic Dance Studio", 
    "Beach Party Night", "Ancient Library", "Mountain Observation Deck", "Modern Dance Studio", "Speakeasy Bar", 
    "Rainforest Trail", "Rice Terrace Field"
];

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

const TiktokAffiliateView: React.FC = () => {
    const [productImage, setProductImage] = useState<MultimodalContent | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [gender, setGender] = useState('Female');
    const [modelFace, setModelFace] = useState('Random');
    const [lighting, setLighting] = useState('Random');
    const [camera, setCamera] = useState('Random');
    const [pose, setPose] = useState('Random');
    const [vibe, setVibe] = useState('Studio');
    
    const handleGenerate = async () => {
        if (!productImage) {
            setError("Please upload a product image first.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setResultImage(null);

        const prompt = `
            Create a photorealistic User-Generated Content (UGC) image for a platform like TikTok.
            The image must naturally feature the uploaded product image.
            Here are the details for the image:
            - Model: A ${gender} from ${modelFace === 'Random' ? 'Southeast Asia' : modelFace}. Ensure the face looks realistic and appealing.
            - Product: Include the product from the uploaded image.
            - Lighting: ${lighting === 'Random' ? 'flattering and natural-looking lighting' : lighting}.
            - Camera & Lens: ${camera === 'Random' ? 'a dynamic angle' : camera}.
            - Body Movement / Pose: ${pose === 'Random' ? 'a natural and relaxed pose' : pose}. The model should be interacting with the product if appropriate.
            - Content Vibe / Background: ${vibe}.
            The result should be a high-quality, authentic-looking, and engaging image that could be used for affiliate marketing. Do not include any text or logos.
        `;
        
        try {
            const result = await composeImage(prompt, [productImage]);
            if (result.imageBase64) {
                setResultImage(result.imageBase64);
                await addHistoryItem({
                    type: 'Image',
                    prompt: `TikTok Affiliate: Vibe - ${vibe}, Model - ${gender}`,
                    result: result.imageBase64,
                });
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
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm flex flex-col gap-4 overflow-y-auto pr-4 custom-scrollbar">
                <h1 className="text-3xl font-bold">Model Photos</h1>
                <p className="text-neutral-500 dark:text-neutral-400 -mt-3">Quickly create UGC content using AI.</p>
                
                <Section title="1. Asset & Model">
                    <ImageUpload id="tiktok-affiliate-upload" onImageUpload={(base64, mimeType) => setProductImage({base64, mimeType})} title="Upload Product"/>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <CreativeButton label="Female" isSelected={gender === 'Female'} onClick={() => setGender('Female')} icon={UserIcon}/>
                        <CreativeButton label="Male" isSelected={gender === 'Male'} onClick={() => setGender('Male')} icon={UserIcon}/>
                    </div>
                </Section>
                
                <SelectControl label="2. Model's Face" value={modelFace} onChange={setModelFace} options={modelFaceOptions} />
                <SelectControl label="3. Lighting" value={lighting} onChange={setLighting} options={lightingOptions} />
                <SelectControl label="4. Camera & Lens" value={camera} onChange={setCamera} options={cameraOptions} />
                <SelectControl label="5. Body Pose" value={pose} onChange={setPose} options={poseOptions} />
                <SelectControl label="6. Content Vibe" value={vibe} onChange={setVibe} options={vibeOptions} />
                
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
                            <img src={`data:image/png;base64,${resultImage}`} alt="Generated affiliate content" className="rounded-md max-h-full max-w-full object-contain" />
                             <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => downloadImage(resultImage, `1za7-affiliate-image-${Date.now()}.png`)}
                                  className="flex items-center gap-2 bg-black/60 text-white text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-black/80 transition-colors"
                                >
                                    <DownloadIcon className="w-3 h-3"/> Download
                                </button>
                            </div>
                        </div>
                    )}
                    {!resultImage && !isLoading && (
                        <div className="text-center text-neutral-500 dark:text-neutral-600">
                            <TikTokIcon className="w-16 h-16 mx-auto" />
                            <p>Your content output will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h2 className="text-lg font-semibold mb-3">{title}</h2>
        {children}
    </div>
);

export default TiktokAffiliateView;