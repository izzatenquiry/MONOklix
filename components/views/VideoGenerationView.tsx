import React, { useState, useCallback, useEffect } from 'react';
import { generateVideo } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { DownloadIcon, TrashIcon, StarIcon } from '../Icons';
import TwoColumnLayout from '../common/TwoColumnLayout';
import ImageUpload from '../common/ImageUpload';
import { MODELS } from '../../services/aiConfig';
import { type Language } from '../../types';
import { getTranslations } from '../../services/translations';


interface ImageData {
  base64: string;
  mimeType: string;
}

interface VideoGenPreset {
  prompt: string;
  image: { base64: string; mimeType: string; };
}

interface VideoGenerationViewProps {
  preset: VideoGenPreset | null;
  clearPreset: () => void;
  language: Language;
}

const aspectRatios = ["9:16", "1:1", "16:9", "4:3", "3:4"];
const cameraMotions = ["Random", "Pan", "Zoom In", "Zoom Out", "Tilt", "Crane", "Dolly", "Aerial"];
const styles = ["Random", "Photorealistic", "Cinematic", "Anime", "Vintage", "Claymation", "Watercolor", "3D Animation", "Soft Daylight Studio", "Pastel Clean", "High-Key White", "Low-Key Moody", "Color Block", "Gradient Backdrop", "Paper Curl Backdrop", "Beige Seamless", "Shadow Play / Hard Light", "Marble Tabletop", "Pastel Soft"];
const backgroundVibes = [ "Random", "Coffee Shop Aesthetic", "Urban Night", "Tropical Beach", "Luxury Apartment", "Flower Garden", "Old Building", "Classic Library", "Minimalist Studio", "Rooftop Bar", "Autumn Garden", "Tokyo Street", "Scandinavian Interior", "Magical Forest", "Cyberpunk City", "Bohemian Desert", "Modern Art Gallery", "Sunset Rooftop", "Snowy Mountain Cabin", "Industrial Loft", "Futuristic Lab", "Pastel Dream Sky", "Palace Interior", "Country Kitchen", "Coral Reef", "Paris Street", "Asian Night Market", "Cruise Deck", "Vintage Train Station", "Outdoor Basketball Court", "Professional Kitchen", "Luxury Hotel Lobby", "Rock Concert Stage", "Zen Garden", "Mediterranean Villa Terrace", "Space / Sci-Fi Setting", "Modern Workspace", "Hot Spring Bath", "Fantasy Throne Room", "Skyscraper Peak", "Sports Car Garage", "Botanical Greenhouse", "Ice Rink", "Classic Dance Studio", "Beach Party Night", "Ancient Library", "Mountain Observation Deck", "Modern Dance Studio", "Speakeasy Bar", "Rainforest Trail", "Rice Terrace Field" ];
const resolutions = ["720p", "1080p"];

const Section: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div><h2 className="text-lg font-semibold mb-2">{title}</h2>{children}</div>
);

// FIX: Replaced incomplete component with full implementation, adding a JSX return and a default export to fix compilation errors.
const VideoGenerationView: React.FC<VideoGenerationViewProps> = ({ preset, clearPreset, language }) => {
  const [subjectContext, setSubjectContext] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [ambiance, setAmbiance] = useState('');
  const [cameraMotion, setCameraMotion] = useState('Random');
  const [style, setStyle] = useState('Random');
  const [action, setAction] = useState('');
  const [dialogue, setDialogue] = useState('');
  const [backgroundVibe, setBackgroundVibe] = useState('Random');
  
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [referenceImage, setReferenceImage] = useState<ImageData | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [model, setModel] = useState(MODELS.videoGenerationDefault);
  const [resolution, setResolution] = useState("720p");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [imageUploadKey, setImageUploadKey] = useState(Date.now());

  const T = getTranslations(language).videoGenerationView;
  const showResolution = model.includes('veo-3.0');

  const loadingMessages = [
    "Warming up the AI director...",
    "Scouting for digital locations...",
    "Casting virtual actors...",
    "Adjusting camera and lighting...",
    "Action! Rendering scenes...",
    "This can take a few minutes. Please be patient.",
    "The AI is working hard on your masterpiece...",
    "Adding the final cinematic touches...",
    "Almost ready for the premiere...",
  ];

  useEffect(() => {
// FIX: Replaced `NodeJS.Timeout` with `ReturnType<typeof setInterval>` to resolve a type error in browser environments. `setInterval` returns a `number` in the browser, and this change correctly reflects that without relying on Node.js types.
      let interval: ReturnType<typeof setInterval> | null = null;
      if (isLoading) {
        interval = setInterval(() => {
          setLoadingMessageIndex(prev => (prev + 1) % loadingMessages.length);
        }, 3000);
      }
      return () => {
        if (interval) clearInterval(interval);
      };
  }, [isLoading, loadingMessages.length]);

  useEffect(() => {
      if (preset) {
          setSubjectContext(preset.prompt);
          setReferenceImage(preset.image);
          setPreviewUrl(`data:${preset.image.mimeType};base64,${preset.image.base64}`);
          clearPreset();
          window.scrollTo(0, 0);
      }
  }, [preset, clearPreset]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
      return () => {
          if (videoUrl) {
              URL.revokeObjectURL(videoUrl);
          }
      };
  }, [videoUrl]);

  const handleImageUpload = useCallback((base64: string, mimeType: string) => {
      setReferenceImage({ base64, mimeType });
      setPreviewUrl(`data:${mimeType};base64,${base64}`);
  }, []);

  const handleGenerate = useCallback(async () => {
      if (!subjectContext.trim() && !action.trim() && !referenceImage) {
          setError("Please provide a subject or an action, or upload a reference image.");
          return;
      }
      setIsLoading(true);
      setError(null);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);

      const fullPrompt = [subjectContext, ambiance, action, dialogue].filter(Boolean).join('. ');

      try {
          const image = referenceImage ? { imageBytes: referenceImage.base64, mimeType: referenceImage.mimeType } : undefined;
          const result = await generateVideo(fullPrompt, model, aspectRatio, resolution, negativePrompt, image);
          const url = URL.createObjectURL(result);
          setVideoUrl(url);

          const link = document.createElement('a');
          link.href = url;
          link.download = `monoklix-video-${Date.now()}.mp4`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          await addHistoryItem({
              type: 'Video',
              prompt: `Video: ${fullPrompt}`,
              result: result,
          });
      } catch (e) {
          const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
          setError(errorMessage);
      } finally {
          setIsLoading(false);
      }
  }, [subjectContext, ambiance, action, referenceImage, model, aspectRatio, resolution, negativePrompt, dialogue, videoUrl]);

  const removeReferenceImage = () => {
      setReferenceImage(null);
      setPreviewUrl(null);
      setImageUploadKey(Date.now()); // Force re-render of ImageUpload
  };

  const leftPanel = (
    <>
        <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{T.title}</h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">{T.subtitle}</p>
        </div>

        <Section title={T.modelFormat}>
            <div className={`grid grid-cols-1 ${showResolution ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}>
                <div className={showResolution ? 'sm:col-span-1' : 'sm:col-span-1'}>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.aiModel}</label>
                    <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition">
                        {MODELS.videoGenerationOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                    </select>
                </div>
                <div className={showResolution ? 'sm:col-span-1' : 'sm:col-span-1'}>
                     <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.aspectRatio}</label>
                     <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition">
                        {aspectRatios.map(ar => <option key={ar} value={ar}>{ar}</option>)}
                    </select>
                </div>
                {showResolution && (
                    <div className="sm:col-span-1">
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.resolution}</label>
                        <select value={resolution} onChange={(e) => setResolution(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition">
                            {resolutions.map(res => <option key={res} value={res}>{res}</option>)}
                        </select>
                    </div>
                )}
            </div>
        </Section>
        
        <Section title={T.subjectContext}>
            <textarea value={subjectContext} onChange={e => setSubjectContext(e.target.value)} placeholder={T.subjectContextPlaceholder} rows={2} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition" />
        </Section>
        
        <Section title={T.action}>
            <textarea value={action} onChange={e => setAction(e.target.value)} placeholder={T.actionPlaceholder} rows={2} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition" />
        </Section>

        <Section title={T.creativeDirection}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">{T.style}</label><select value={style} onChange={e => setStyle(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">{styles.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">{T.cameraMotion}</label><select value={cameraMotion} onChange={e => setCameraMotion(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">{cameraMotions.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                 <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">{T.backgroundVibe}</label><select value={backgroundVibe} onChange={e => setBackgroundVibe(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">{backgroundVibes.map(v => <option key={v} value={v}>{v}</option>)}</select></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">{T.ambiance}</label><textarea value={ambiance} onChange={e => setAmbiance(e.target.value)} placeholder={T.ambiancePlaceholder} rows={1} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none" /></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">{T.negativePrompt}</label><textarea value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)} placeholder={T.negativePromptPlaceholder} rows={1} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none" /></div>
            </div>
        </Section>

        <Section title={T.dialogue}>
            <textarea value={dialogue} onChange={e => setDialogue(e.target.value)} placeholder={T.dialoguePlaceholder} rows={2} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none" />
        </Section>

        <Section title={T.refImage}>
            {previewUrl ? (
                 <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                    <img src={previewUrl} alt="Reference Preview" className="w-full h-full object-contain bg-neutral-100 dark:bg-neutral-800" />
                    <button onClick={removeReferenceImage} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <ImageUpload id="video-ref-upload" key={imageUploadKey} onImageUpload={handleImageUpload} title={T.uploadImage}/>
            )}
        </Section>
        
        <div className="pt-4 mt-auto">
            <button onClick={handleGenerate} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? <Spinner /> : T.generateButton}
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
                  <p className="mt-4 text-neutral-500 dark:text-neutral-400">{T.loading}</p>
                  <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">{loadingMessages[loadingMessageIndex]}</p>
              </div>
          )}
          {error && (
               <div className="text-center text-red-500 dark:text-red-400 p-4">
                   <p className="font-semibold">An Error Occurred</p>
                   <p className="text-sm mt-2">{error}</p>
              </div>
          )}
          {!isLoading && videoUrl && (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                  <video src={videoUrl} controls autoPlay className="max-h-full max-w-full rounded-md" />
                  <a href={videoUrl} download={`monoklix-video-${Date.now()}.mp4`} className="flex items-center gap-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold py-2 px-4 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors">
                      <DownloadIcon className="w-4 h-4" /> Download Video
                  </a>
              </div>
          )}
          {!isLoading && !videoUrl && !error && (
              <div className="text-center text-neutral-500 dark:text-neutral-600">
                  <StarIcon className="w-16 h-16 mx-auto" />
                  <p>{T.outputPlaceholder}</p>
              </div>
          )}
      </>
  );

  return <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} />;
};

export default VideoGenerationView;
