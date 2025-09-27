import React, { useState, useCallback } from 'react';
import ImageUpload from '../common/ImageUpload';
import { composeImage, type MultimodalContent } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { CameraIcon, DownloadIcon, WandIcon, VideoIcon } from '../Icons';
import TwoColumnLayout from '../common/TwoColumnLayout';
import { getProductPhotoPrompt } from '../../services/promptManager';
import { type Language } from '../../types';
import { getTranslations } from '../../services/translations';


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
  language: Language;
}

const vibeOptions = ["Random", "Studio Backdrop", "Tabletop / Surface", "Premium Texture", "Light & Shadow", "Color & Palette", "Nature & Organic", "Urban & Industrial", "Soft Daylight Studio", "Pastel Clean", "High-Key White", "Low-Key Moody", "Color Block", "Gradient Backdrop", "Paper Curl Backdrop", "Beige Seamless", "Shadow Play / Hard Light", "Marble Tabletop", "Pastel Soft"];
const styleOptions = ["Random", "Realism", "Photorealistic", "Cinematic", "Anime", "Vintage", "3D Animation", "Watercolor", "Claymation"];
const lightingOptions = ["Random", "Soft Daylight", "Golden Hour", "Hard Light", "Window Backlight", "Warm Lamp Glow", "Mixed Light", "Studio Light", "Dramatic", "Natural Light", "Neon", "Backlight", "Rim Lighting"];
const cameraOptions = ["Random", "Detail / Macro", "Close-Up", "Medium Close-Up", "Medium / Half-Body", "Three-Quarter", "Full Body", "Flatlay", "Wide Shot", "Medium Shot", "Long Shot", "Dutch Angle", "Low Angle", "High Angle", "Overhead Shot"];
const compositionOptions = ["Random", "Rule of Thirds", "Leading Lines", "Symmetry", "Golden Ratio", "Centered", "Asymmetrical"];
const lensTypeOptions = ["Random", "Wide Angle Lens", "Telephoto Lens", "Fisheye Lens", "Macro Lens", "50mm lens", "85mm lens"];
const filmSimOptions = ["Random", "Fujifilm Velvia", "Kodak Portra 400", "Cinematic Kodachrome", "Vintage Polaroid", "Ilford HP5 (B&W)"];
const effectOptions = ["None", "Random", "Water Splash", "Smoke", "Fire", "Floating in Water", "Rain Drops", "Light Streaks", "Confetti", "Glitter", "Powder Explosion"];


const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        {children}
    </div>
);

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

const ProductPhotoView: React.FC<ProductPhotoViewProps> = ({ onReEdit, onCreateVideo, language }) => {
  const [productImage, setProductImage] = useState<MultimodalContent | null>(null);
  const [resultImages, setResultImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const [vibe, setVibe] = useState('Random');
  const [style, setStyle] = useState('Random');
  const [lighting, setLighting] = useState('Random');
  const [camera, setCamera] = useState('Random');
  const [composition, setComposition] = useState('Random');
  const [lensType, setLensType] = useState('Random');
  const [filmSim, setFilmSim] = useState('Random');
  const [effect, setEffect] = useState('None');
  const [creativityLevel, setCreativityLevel] = useState(5);
  const [customPrompt, setCustomPrompt] = useState('');
  const [numberOfImages, setNumberOfImages] = useState(1);
  
  const T = getTranslations(language).productPhotoView;

  const handleGenerate = useCallback(async () => {
    if (!productImage) {
      setError("Please upload a product image first.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setResultImages([]);

    const prompt = getProductPhotoPrompt({ vibe, lighting, camera, creativityLevel, customPrompt, style, composition, lensType, filmSim, effect });

    try {
      const generatedImages: string[] = [];
      for (let i = 0; i < numberOfImages; i++) {
        try {
          const result = await composeImage(prompt, [productImage]);
          if (result.imageBase64) {
            const newImageBase64 = result.imageBase64;
            generatedImages.push(newImageBase64);
            setResultImages([...generatedImages]);
            setSelectedImageIndex(i);
          } else {
            throw new Error(`The AI did not return an image for this attempt.`);
          }
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
          setError(`Failed to generate image ${i + 1} of ${numberOfImages}. Error: ${errorMessage}`);
          console.error(`Generation failed for image ${i + 1}:`, e);
        }
      }

      if (generatedImages.length > 0) {
        for (const imgBase64 of generatedImages) {
          await addHistoryItem({
            type: 'Image',
            prompt: `Product Photo: ${prompt.substring(0, 50)}...`,
            result: imgBase64,
          });
        }
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      console.error("Generation failed:", e);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [productImage, vibe, lighting, camera, creativityLevel, customPrompt, style, composition, lensType, filmSim, effect, numberOfImages]);

  const leftPanel = (
    <>
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{T.title}</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">{T.subtitle}</p>
      </div>

      <Section title={T.uploadProduct}>
        <ImageUpload id="product-photo-upload" onImageUpload={(base64, mimeType) => setProductImage({ base64, mimeType })} title={T.uploadTitle} />
      </Section>

      <Section title={T.customPrompt}>
        <textarea
          id="custom-prompt"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder={T.customPromptPlaceholder}
          rows={3}
          className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 text-sm text-neutral-800 dark:text-neutral-300 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{T.customPromptHelp}</p>
      </Section>
      
      <Section title={T.creativeDirection}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label htmlFor="vibe-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.backgroundVibe}</label><SelectControl id="vibe-select" value={vibe} onChange={setVibe} options={vibeOptions} /></div>
          <div><label htmlFor="style-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.artisticStyle}</label><SelectControl id="style-select" value={style} onChange={setStyle} options={styleOptions} /></div>
          <div><label htmlFor="lighting-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.lighting}</label><SelectControl id="lighting-select" value={lighting} onChange={setLighting} options={lightingOptions} /></div>
          <div><label htmlFor="camera-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.cameraShot}</label><SelectControl id="camera-select" value={camera} onChange={setCamera} options={cameraOptions} /></div>
          <div><label htmlFor="composition-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.composition}</label><SelectControl id="composition-select" value={composition} onChange={setComposition} options={compositionOptions} /></div>
          <div><label htmlFor="lens-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.lensType}</label><SelectControl id="lens-select" value={lensType} onChange={setLensType} options={lensTypeOptions} /></div>
          <div><label htmlFor="film-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.filmSim}</label><SelectControl id="film-select" value={filmSim} onChange={setFilmSim} options={filmSimOptions} /></div>
          <div><label htmlFor="effect-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.visualEffect}</label><SelectControl id="effect-select" value={effect} onChange={setEffect} options={effectOptions} /></div>
        </div>
      </Section>
      
      <Section title={T.aiSettings}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <label htmlFor="creativity-slider" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{`${T.creativityLevel} (${creativityLevel})`}</label>
              <input id="creativity-slider" type="range" min="0" max="10" step="1" value={creativityLevel} onChange={(e) => setCreativityLevel(Number(e.target.value))} className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-primary-500" />
            </div>
             <div>
              <label htmlFor="num-images-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.numberOfImages}</label>
              <SelectControl id="num-images-select" value={String(numberOfImages)} onChange={(val) => setNumberOfImages(Number(val))} options={[1, 2, 3, 4, 5]} />
            </div>
        </div>
      </Section>
      
      <div className="pt-4 mt-auto">
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full mt-2 flex items-center justify-center gap-2 bg-primary-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isLoading ? <Spinner /> : T.generateButton}
          </button>
          {error && <p className="text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
      </div>
    </>
  );

  const rightPanel = (
    <>
        {isLoading && (<div className="text-center"><Spinner /><p className="mt-4 text-neutral-500 dark:text-neutral-400">{T.loading} ({resultImages.length}/{numberOfImages})</p></div>)}
        {resultImages.length > 0 && !isLoading && (
           <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2">
            <div className="flex-1 flex items-center justify-center min-h-0 w-full relative group">
              <img src={`data:image/png;base64,${resultImages[selectedImageIndex]}`} alt={`Generated product ${selectedImageIndex + 1}`} className="rounded-md max-h-full max-w-full object-contain" />
              <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button onClick={() => onReEdit({ base64: resultImages[selectedImageIndex], mimeType: 'image/png' })} title="Re-edit this image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"><WandIcon className="w-4 h-4" /></button>
                <button onClick={() => onCreateVideo({ prompt: getProductPhotoPrompt({ vibe, lighting, camera, creativityLevel, customPrompt, style, composition, lensType, filmSim, effect }), image: { base64: resultImages[selectedImageIndex], mimeType: 'image/png' } })} title="Create Video from this image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"><VideoIcon className="w-4 h-4" /></button>
                <button onClick={() => triggerDownload(resultImages[selectedImageIndex], 'monoklix-product-photo')} title="Download Image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"><DownloadIcon className="w-4 h-4" /></button>
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
            <CameraIcon className="w-16 h-16 mx-auto" /><p>{T.outputPlaceholder}</p>
          </div>
        )}
    </>
  );
  
  return <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} />;
};

export default ProductPhotoView;