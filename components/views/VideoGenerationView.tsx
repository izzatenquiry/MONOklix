import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateVideo } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { VideoIcon, DownloadIcon, TrashIcon, UploadIcon, StarIcon } from '../Icons';
import { sendToTelegram } from '../../services/telegramService';

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
}

const loadingMessages = [
  "Brewing your video potion...",
  "Teaching the pixels to dance...",
  "Assembling cinematic brilliance...",
  "This is taking a bit longer than usual, but patience is a virtue...",
  "Almost there, just polishing the lens...",
  "Finalising the director's cut...",
];

const videoModels = [
    { id: 'veo-2.0-generate-001', name: 'VEO 2.0 (with Dialogue)' },
    { id: 'veo-3.0-generate-001', name: 'VEO 3 (with Audio Prompt)' },
];

const aspectRatios = ["9:16", "1:1", "16:9", "4:3", "3:4"];
const cameraMotions = ["None", "Pan", "Zoom In", "Zoom Out", "Tilt", "Crane", "Dolly", "Aerial"];
const styles = ["None", "Photorealistic", "Cinematic", "Anime", "Vintage", "Claymation", "Watercolor", "3D Animation", "Soft Daylight Studio", "Pastel Clean", "High-Key White", "Low-Key Moody", "Color Block", "Gradient Backdrop", "Paper Curl Backdrop", "Beige Seamless", "Shadow Play / Hard Light", "Marble Tabletop", "Pastel Soft"];
const backgroundVibes = [
    "None", "Coffee Shop Aesthetic", "Urban Night", "Tropical Beach", "Luxury Apartment", "Flower Garden", "Old Building", "Classic Library", 
    "Minimalist Studio", "Rooftop Bar", "Autumn Garden", "Tokyo Street", "Scandinavian Interior", "Magical Forest", "Cyberpunk City", 
    "Bohemian Desert", "Modern Art Gallery", "Sunset Rooftop", "Snowy Mountain Cabin", "Industrial Loft", "Futuristic Lab", 
    "Pastel Dream Sky", "Palace Interior", "Country Kitchen", "Coral Reef", "Paris Street", "Asian Night Market", "Cruise Deck", 
    "Vintage Train Station", "Outdoor Basketball Court", "Professional Kitchen", "Luxury Hotel Lobby", "Rock Concert Stage", 
    "Zen Garden", "Mediterranean Villa Terrace", "Space / Sci-Fi Setting", "Modern Workspace", "Hot Spring Bath", 
    "Fantasy Throne Room", "Skyscraper Peak", "Sports Car Garage", "Botanical Greenhouse", "Ice Rink", "Classic Dance Studio", 
    "Beach Party Night", "Ancient Library", "Mountain Observation Deck", "Modern Dance Studio", "Speakeasy Bar", 
    "Rainforest Trail", "Rice Terrace Field"
];

const Section: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{title}</h3>
        {children}
    </div>
);


const VideoGenerationView: React.FC<VideoGenerationViewProps> = ({ preset, clearPreset }) => {
  const [subjectContext, setSubjectContext] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [ambiance, setAmbiance] = useState('');
  const [cameraMotion, setCameraMotion] = useState('None');
  const [style, setStyle] = useState('None');
  const [action, setAction] = useState('');
  const [audioPrompt, setAudioPrompt] = useState('');
  const [dialogue, setDialogue] = useState('');
  const [backgroundVibe, setBackgroundVibe] = useState('None');
  
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
  const [referenceImage, setReferenceImage] = useState<ImageData | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState(videoModels[0].id);
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingMessage(prev => {
          const currentIndex = loadingMessages.indexOf(prev);
          const nextIndex = (currentIndex + 1) % loadingMessages.length;
          return loadingMessages[nextIndex];
        });
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);
  
  useEffect(() => {
    if (preset) {
        setSubjectContext(preset.prompt);
        const imageData = { base64: preset.image.base64, mimeType: preset.image.mimeType };
        setReferenceImage(imageData);
        setPreviewUrl(`data:${imageData.mimeType};base64,${imageData.base64}`);
        clearPreset();
    }
  }, [preset, clearPreset]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            setReferenceImage({ base64: base64String, mimeType: file.type });
            setPreviewUrl(URL.createObjectURL(file));
        };
        reader.readAsDataURL(file);
    }
    if(event.target) event.target.value = '';
  };

  const removeReferenceImage = () => {
    setReferenceImage(null);
    setPreviewUrl(null);
  };

  const buildPrompt = useCallback(() => {
    let parts = [subjectContext.trim()];
    if (action.trim()) parts.push(`Action: ${action.trim()}.`);
    if (ambiance.trim()) parts.push(`Ambiance: ${ambiance.trim()}.`);
    if (style !== 'None') parts.push(`Style: ${style}.`);
    if (backgroundVibe !== 'None') parts.push(`Background: ${backgroundVibe}.`);
    if (cameraMotion !== 'None') parts.push(`Camera Motion: ${cameraMotion}.`);
    if (selectedModel === 'veo-3.0-generate-001' && audioPrompt.trim()) {
        parts.push(`Audio: ${audioPrompt.trim()}.`);
    }
    if (negativePrompt.trim()) parts.push(`Negative Prompt: Do not include ${negativePrompt.trim()}.`);

    return parts.filter(p => p).join(' ');
  }, [subjectContext, action, ambiance, style, cameraMotion, selectedModel, audioPrompt, negativePrompt, backgroundVibe]);

  const handleGenerate = useCallback(async () => {
    if (!subjectContext.trim()) {
      setError("Please enter a Subject & Context prompt.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setVideoUrl(null);
    setLoadingMessage(loadingMessages[0]);
    
    const finalPrompt = buildPrompt();

    try {
      const imageParam = referenceImage ? { imageBytes: referenceImage.base64, mimeType: referenceImage.mimeType } : undefined;
      const dialogueParam = selectedModel === 'veo-2.0-generate-001' && dialogue.trim() ? { texts: dialogue.trim().split('\n').filter(line => line.length > 0) } : undefined;

      const url = await generateVideo(finalPrompt, selectedModel, aspectRatio, imageParam, dialogueParam);
      setVideoUrl(url);
      await addHistoryItem({
        type: 'Video',
        prompt: `Generate Video: ${finalPrompt}`,
        result: url
      });
      sendToTelegram(url, 'video', `Generate Video: ${finalPrompt}`);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      console.error("Generation failed:", e);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [buildPrompt, referenceImage, selectedModel, dialogue, aspectRatio]);

  const handleDownload = () => {
    if (!videoUrl) return;
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `1za7-ai-video-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      {/* Left Panel: Controls */}
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm flex flex-col gap-4 overflow-y-auto pr-4 custom-scrollbar">
        <h1 className="text-3xl font-bold">Generate Veo Video</h1>
        
        <Section title="Reference Image (Optional)">
            {previewUrl ? (
                <div className="relative group w-full h-48">
                    <img src={previewUrl} alt="Reference image" className="w-full h-full object-contain rounded-lg bg-gray-100 dark:bg-gray-800/50 p-2" />
                    <button onClick={removeReferenceImage} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Delete image">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-300 h-48 border-gray-300 dark:border-gray-600 hover:border-primary-500 hover:bg-gray-100 dark:hover:bg-gray-800/50">
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" ref={fileInputRef}/>
                    <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
                        <UploadIcon className="w-10 h-10 mb-2" />
                        <p className="font-semibold text-gray-800 dark:text-gray-300">Click to upload</p>
                    </div>
                </label>
            )}
        </Section>
        
        <Section title="Main Settings">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 <div>
                    <label htmlFor="video-model" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Model</label>
                    <select id="video-model" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none">
                        {videoModels.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="aspect-ratio" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Aspect Ratio</label>
                    <select id="aspect-ratio" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none">
                        {aspectRatios.map(ar => <option key={ar} value={ar}>{ar}</option>)}
                    </select>
                </div>
            </div>
        </Section>
        
        <Section title="Build Your Prompt">
            <div className="space-y-3">
                <textarea value={subjectContext} onChange={(e) => setSubjectContext(e.target.value)} placeholder="Subject & Context (e.g., A neon hologram of a cat driving...)" rows={3} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none transition" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input type="text" value={action} onChange={(e) => setAction(e.target.value)} placeholder="Action (e.g., driving at top speed)" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none transition" />
                    <input type="text" value={ambiance} onChange={(e) => setAmbiance(e.target.value)} placeholder="Ambiance (e.g., night, cyberpunk city)" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none transition" />
                    <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none">
                        <option value="None" disabled>Select Style</option>
                        {styles.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                     <select value={cameraMotion} onChange={(e) => setCameraMotion(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none">
                        <option value="None" disabled>Select Camera Motion</option>
                        {cameraMotions.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="background-vibe" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Background / Setting Vibe</label>
                    <select id="background-vibe" value={backgroundVibe} onChange={(e) => setBackgroundVibe(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none">
                        {backgroundVibes.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                </div>
                <textarea value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} placeholder="Negative Prompt (e.g., blurry, text, people)" rows={2} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none transition" />
            </div>
        </Section>
        
        <Section title="Audio">
            {selectedModel === 'veo-2.0-generate-001' ? (
              <textarea id="dialogue" value={dialogue} onChange={(e) => setDialogue(e.target.value)} placeholder="Dialogue (one line per entry)..." rows={3} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none transition" />
            ) : (
              <textarea id="audioPrompt" value={audioPrompt} onChange={(e) => setAudioPrompt(e.target.value)} placeholder="Audio Prompt (e.g., engine sounds, upbeat synthwave music)..." rows={3} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none transition" />
            )}
        </Section>

        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full mt-2 flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <Spinner /> : 'Generate Video'}
        </button>
      </div>

      {/* Right Panel: Results */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg flex flex-col p-4 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Output</h2>
        <div className="flex-1 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800/50 rounded-md relative group">
          {isLoading && (
            <div className="flex flex-col items-center justify-center text-center p-8 space-y-4">
              <Spinner />
              <p className="text-xl font-semibold text-neutral-700 dark:text-neutral-300">Generating Video</p>
              <p className="text-neutral-500 dark:text-neutral-400">This may take a few minutes. Please be patient.</p>
              <p className="text-primary-500 dark:text-primary-400 italic">{loadingMessage}</p>
            </div>
          )}
          {videoUrl && !isLoading && (
             <div className="w-full h-full flex items-center justify-center">
                 <video src={videoUrl} controls autoPlay loop className="rounded-md max-h-full max-w-full" />
                 <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={handleDownload} className="flex items-center gap-2 bg-black/60 text-white text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-black/80 transition-colors">
                         <DownloadIcon className="w-4 h-4"/> Download
                     </button>
                 </div>
             </div>
          )}
          {error && !isLoading && (
            <div className="text-left p-4 max-w-md mx-auto">
              <h3 className="font-bold text-center text-red-600 dark:text-red-400">Generation Failed</h3>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap">{error}</p>
            </div>
          )}
          {!isLoading && !videoUrl && !error && (
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

export default VideoGenerationView;