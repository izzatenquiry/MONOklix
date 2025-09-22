import React, { useState, useCallback } from 'react';
import ImageUpload from '../common/ImageUpload';
import { composeImage, type MultimodalContent } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { TikTokIcon, DownloadIcon, UserIcon, WandIcon, VideoIcon } from '../Icons';
import { type User } from '../../types';
import TwoColumnLayout from '../common/TwoColumnLayout';
import { getTiktokAffiliatePrompt } from '../../services/promptManager';

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

interface TiktokAffiliateViewProps {
  onReEdit: (preset: ImageEditPreset) => void;
  onCreateVideo: (preset: VideoGenPreset) => void;
}

const modelFaceOptions = ["Random", "Malaysia", "Vietnam", "England", "USA", "Arab", "Russia", "Japan", "Korea", "Thailand"];
const lightingOptions = ["Random", "Soft Daylight", "Golden Hour", "Hard Light", "Window Backlight", "Warm Lamp Glow", "Mixed Light", "Studio Light", "Dramatic", "Natural Light", "Neon", "Backlight", "Rim Lighting"];
const cameraOptions = ["Random", "Detail / Macro", "Close-Up", "Medium Close-Up", "Medium / Half-Body", "Three-Quarter", "Full Body", "Flatlay", "Wide Shot", "Medium Shot", "Long Shot", "Dutch Angle", "Low Angle", "High Angle", "Overhead Shot"];
const poseOptions = ["Random", "Professional Model Pose", "Standing Relaxed", "Sitting on Chair Edge", "Walking Slowly", "Leaning on Wall", "Half-Body Rotation"];
const vibeOptions = [
    "Random", "Studio", "Bedroom", "Bathroom / Vanity", "Living Room", "Kitchen / Dining", "Workspace / Study", "Entryway / Laundry", "Urban Clean", 
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
const styleOptions = ["Random", "Realism", "Photorealistic", "Cinematic", "Anime", "Vintage", "3D Animation", "Watercolor", "Claymation"];
const compositionOptions = ["Random", "Rule of Thirds", "Leading Lines", "Symmetry", "Golden Ratio", "Centered", "Asymmetrical"];
const lensTypeOptions = ["Random", "Wide Angle Lens", "Telephoto Lens", "Fisheye Lens", "Macro Lens", "50mm lens", "85mm lens"];
const filmSimOptions = ["Random", "Fujifilm Velvia", "Kodak Portra 400", "Cinematic Kodachrome", "Vintage Polaroid", "Ilford HP5 (B&W)"];


const SelectControl: React.FC<{
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: (string|number)[];
}> = ({ id, value, onChange, options }) => (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 text-neutral-800 dark:text-neutral-300 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
    >
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
);

const TiktokAffiliateView: React.FC<TiktokAffiliateViewProps> = ({ onReEdit, onCreateVideo }) => {
    const [productImage, setProductImage] = useState<MultimodalContent | null>(null);
    const [faceImage, setFaceImage] = useState<MultimodalContent | null>(null);
    const [resultImages, setResultImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);

    const [gender, setGender] = useState('Female');
    const [modelFace, setModelFace] = useState('Random');
    const [lighting, setLighting] = useState('Random');
    const [camera, setCamera] = useState('Random');
    const [pose, setPose] = useState('Random');
    const [vibe, setVibe] = useState('Random');
    const [style, setStyle] = useState('Random');
    const [composition, setComposition] = useState('Random');
    const [lensType, setLensType] = useState('Random');
    const [filmSim, setFilmSim] = useState('Random');
    const [creativityLevel, setCreativityLevel] = useState(5);
    const [customPrompt, setCustomPrompt] = useState('');
    const [numberOfImages, setNumberOfImages] = useState(1);
    
    const handleGenerate = async () => {
        if (!productImage) {
            setError("Please upload a product image first.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setResultImages([]);

        const prompt = getTiktokAffiliatePrompt({
            gender, modelFace, lighting, camera, pose, vibe, creativityLevel, customPrompt,
            hasFaceImage: !!faceImage, style, composition, lensType, filmSim
        });
        
        try {
            const imagesToCompose: MultimodalContent[] = [productImage];
            if (faceImage) {
                imagesToCompose.push(faceImage);
            }

            const generatedImages: string[] = [];
            for (let i = 0; i < numberOfImages; i++) {
                const result = await composeImage(prompt, imagesToCompose);
                if (result.imageBase64) {
                    generatedImages.push(result.imageBase64);
                    setResultImages([...generatedImages]);
                    setSelectedImageIndex(i);
                } else {
                    throw new Error(`The AI failed to generate image #${i + 1}. Please try different settings.`);
                }
            }

            if (generatedImages.length > 0) {
                for (const imgBase64 of generatedImages) {
                    await addHistoryItem({
                        type: 'Image',
                        prompt: `TikTok Affiliate: Vibe - ${vibe}, Model - ${gender}`,
                        result: imgBase64,
                    });
                }
                generatedImages.forEach((imgBase64, index) => {
                    triggerDownload(imgBase64, `1za7-ai-model-photo-${index + 1}`);
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
            <h1 className="text-2xl font-bold sm:text-3xl">Model Photos</h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">Quickly create UGC content using AI.</p>
          </div>
          
          <Section title="1. Asset & Model">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ImageUpload id="tiktok-product-upload" onImageUpload={(base64, mimeType) => setProductImage({base64, mimeType})} title="Product Photo" description="Required."/>
                  <ImageUpload id="tiktok-face-upload" onImageUpload={(base64, mimeType) => setFaceImage({base64, mimeType})} title="Face Photo" description="Optional inspiration."/>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                  <CreativeButton label="Female" isSelected={gender === 'Female'} onClick={() => setGender('Female')} icon={UserIcon}/>
                  <CreativeButton label="Male" isSelected={gender === 'Male'} onClick={() => setGender('Male')} icon={UserIcon}/>
              </div>
          </Section>

          <Section title="2. Custom Prompt (Optional)">
              <textarea
                id="custom-prompt-model"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Or write your own prompt here..."
                rows={3}
                className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 text-sm text-neutral-800 dark:text-neutral-300 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">If filled, this prompt will override the dropdown selections below.</p>
          </Section>
          
          <Section title="3. Model's Face">
            <SelectControl id="model-face-select" value={modelFace} onChange={setModelFace} options={modelFaceOptions} />
          </Section>
          <Section title="4. Artistic Style">
            <SelectControl id="style-select" value={style} onChange={setStyle} options={styleOptions} />
          </Section>
          <Section title="5. Lighting">
            <SelectControl id="lighting-select" value={lighting} onChange={setLighting} options={lightingOptions} />
          </Section>
          <Section title="6. Camera Shot">
            <SelectControl id="camera-select" value={camera} onChange={setCamera} options={cameraOptions} />
          </Section>
          <Section title="7. Body Pose">
            <SelectControl id="pose-select" value={pose} onChange={setPose} options={poseOptions} />
          </Section>
          <Section title="8. Content Vibe / Background">
            <SelectControl id="vibe-select" value={vibe} onChange={setVibe} options={vibeOptions} />
          </Section>
          <Section title="9. Composition">
            <SelectControl id="composition-select" value={composition} onChange={setComposition} options={compositionOptions} />
          </Section>
          <Section title="10. Lens Type">
            <SelectControl id="lens-select" value={lensType} onChange={setLensType} options={lensTypeOptions} />
          </Section>
          <Section title="11. Film Simulation">
            <SelectControl id="film-select" value={filmSim} onChange={setFilmSim} options={filmSimOptions} />
          </Section>
          
          <Section title={`12. AI Creativity Level (${creativityLevel})`}>
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
          </Section>
          
          <Section title="13. Number of Images">
            <SelectControl id="num-images-select" value={String(numberOfImages)} onChange={(val) => setNumberOfImages(Number(val))} options={[1, 2, 3, 4, 5]} />
          </Section>

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
                  <img src={`data:image/png;base64,${resultImages[selectedImageIndex]}`} alt={`Generated affiliate content ${selectedImageIndex + 1}`} className="rounded-md max-h-full max-w-full object-contain" />
                  <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button onClick={() => onReEdit({ base64: resultImages[selectedImageIndex], mimeType: 'image/png' })} title="Re-edit this image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
                          <WandIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => onCreateVideo({ prompt: getTiktokAffiliatePrompt({ gender, modelFace, lighting, camera, pose, vibe, creativityLevel, customPrompt, style, composition, lensType, filmSim }), image: { base64: resultImages[selectedImageIndex], mimeType: 'image/png' } })} title="Create Video from this image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
                          <VideoIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => triggerDownload(resultImages[selectedImageIndex], '1za7-model-photo')} title="Download Image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
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
                  <TikTokIcon className="w-16 h-16 mx-auto" />
                  <p>Your content output will appear here.</p>
              </div>
          )}
      </>
    );

    return <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} />;
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        {children}
    </div>
);

export default TiktokAffiliateView;