import React, { useState, useCallback, useEffect } from 'react';
import { generateVideo } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { DownloadIcon, TrashIcon, StarIcon } from '../Icons';
import TwoColumnLayout from '../common/TwoColumnLayout';
import ImageUpload from '../common/ImageUpload';
import { MODELS } from '../../services/aiConfig';

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

const aspectRatios = ["9:16", "1:1", "16:9", "4:3", "3:4"];
const cameraMotions = ["Random", "Pan", "Zoom In", "Zoom Out", "Tilt", "Crane", "Dolly", "Aerial"];
const styles = ["Random", "Photorealistic", "Cinematic", "Anime", "Vintage", "Claymation", "Watercolor", "3D Animation", "Soft Daylight Studio", "Pastel Clean", "High-Key White", "Low-Key Moody", "Color Block", "Gradient Backdrop", "Paper Curl Backdrop", "Beige Seamless", "Shadow Play / Hard Light", "Marble Tabletop", "Pastel Soft"];
const backgroundVibes = [
    "Random", "Coffee Shop Aesthetic", "Urban Night", "Tropical Beach", "Luxury Apartment", "Flower Garden", "Old Building", "Classic Library", 
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
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        {children}
    </div>
);

const triggerDownload = (data: Blob, fileNameBase: string) => {
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileNameBase}-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up immediately
};


const VideoGenerationView: React.FC<VideoGenerationViewProps> = ({ preset, clearPreset }) => {
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
  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
  const [referenceImage, setReferenceImage] = useState<ImageData | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [model, setModel] = useState(MODELS.videoGenerationOptions[0].id);
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [resolution, setResolution] = useState("720p");
  const [imageUploadKey, setImageUploadKey] = useState(Date.now());

  useEffect(() => {
    let interval: number;
    if (isLoading) {
      interval = window.setInterval(() => {
        setLoadingMessage(prev => {
          const currentIndex = loadingMessages.indexOf(prev);
          const nextIndex = (currentIndex + 1) % loadingMessages.length;
          return loadingMessages[nextIndex];
        });
      }, 3000);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isLoading]);

  useEffect(() => {
    if (preset) {
      setSubjectContext(preset.prompt);
      const imageData = {
        base64: preset.image.base64,
        mimeType: preset.image.mimeType
      };
      setReferenceImage(imageData);
      setPreviewUrl(`data:${imageData.mimeType};base64,${imageData.base64}`);
      clearPreset();
    }
  }, [preset, clearPreset]);
  
  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (videoUrl && videoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);
  
  useEffect(() => {
    const isVeo3 = model.startsWith('veo-3.0');
    // Force 720p if not Veo 3
    if (!isVeo3) {
        setResolution('720p');
    } 
    // Force 720p if Veo 3 is selected but aspect ratio is not 16:9 for 1080p
    else if (aspectRatio !== '16:9' && resolution === '1080p') {
        setResolution('720p');
    }
  }, [model, aspectRatio, resolution]);

  const handleReferenceImageUpload = useCallback((base64: string, mimeType: string) => {
    const imageData = { base64, mimeType };
    setReferenceImage(imageData);
    setPreviewUrl(`data:${mimeType};base64,${base64}`);
  }, []);

  const removeImage = () => {
    setReferenceImage(null);
    setPreviewUrl(null);
    setImageUploadKey(Date.now());
  };
  
  const buildPrompt = () => {
      let fullPrompt = subjectContext;
      if (action) fullPrompt += `, ${action}`;
      if (dialogue) fullPrompt += `. Dialogue spoken by a character: "${dialogue}"`;
      if (style !== 'Random') fullPrompt += `, in a ${style} style`;
      if (cameraMotion !== 'Random') fullPrompt += `, with ${cameraMotion.toLowerCase()} camera motion`;
      if (ambiance) fullPrompt += `, creating an ambiance of ${ambiance}`;
      if (backgroundVibe !== 'Random') fullPrompt += `, with a ${backgroundVibe.toLowerCase()} background`;
      return fullPrompt.trim();
  };

  const handleGenerate = useCallback(async () => {
    if (!subjectContext.trim()) {
      setError("Please describe the main subject for your video in the 'Subject & Context' field.");
      return;
    }
    setIsLoading(true);
    setError(null);
    if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
    }
    setVideoUrl(null);

    const fullPrompt = buildPrompt();

    try {
      const imageParam = referenceImage ? { imageBytes: referenceImage.base64, mimeType: referenceImage.mimeType } : undefined;
      const resultBlob = await generateVideo(
        fullPrompt,
        model,
        aspectRatio,
        resolution,
        negativePrompt,
        imageParam,
        dialogue
      );
      
      // --- UI Update First ---
      const resultUrl = URL.createObjectURL(resultBlob);
      setVideoUrl(resultUrl);
      setIsLoading(false); // Update UI immediately

      // --- Background Tasks ---
      triggerDownload(resultBlob, 'monoklix-video');
      await addHistoryItem({
        type: 'Video',
        prompt: fullPrompt,
        result: resultBlob, // Save the Blob itself for persistence
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      console.error("Generation failed:", e);
      setError(errorMessage);
      setIsLoading(false); // Ensure loading is false on error
    }
  }, [subjectContext, negativePrompt, ambiance, cameraMotion, style, action, dialogue, backgroundVibe, model, aspectRatio, resolution, referenceImage, videoUrl]);

  const leftPanel = (
    <>
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Generate Video</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">Turn your ideas into motion with text-to-video generation.</p>
      </div>
              
      <Section title="1. Model & Format">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label htmlFor="model-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">AI Model</label>
                <select id="model-select" value={model} onChange={(e) => setModel(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">
                    {MODELS.videoGenerationOptions.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="aspect-ratio-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Aspect Ratio</label>
                <select id="aspect-ratio-select" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">
                    {aspectRatios.map(ar => <option key={ar} value={ar}>{ar}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="resolution-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Resolution</label>
                <select 
                    id="resolution-select" 
                    value={resolution} 
                    onChange={(e) => setResolution(e.target.value)} 
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none disabled:bg-gray-200 dark:disabled:bg-gray-700/50 disabled:cursor-not-allowed"
                    disabled={!model.startsWith('veo-3.0')}
                >
                    <option value="720p">720p</option>
                    <option value="1080p" disabled={!model.startsWith('veo-3.0') || aspectRatio !== '16:9'}>1080p (Veo 3 & 16:9 only)</option>
                </select>
            </div>
        </div>
      </Section>
      
      <Section title="2. Subject & Context">
          <textarea value={subjectContext} onChange={(e) => setSubjectContext(e.target.value)} placeholder="e.g., A golden retriever puppy" rows={3} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none" />
      </Section>

      <Section title="3. Action">
          <input type="text" value={action} onChange={(e) => setAction(e.target.value)} placeholder="e.g., chasing a red ball in a park" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none"/>
      </Section>

      <Section title="4. Creative Direction (Optional)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <label htmlFor="video-style" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Style</label>
                  <select id="video-style" value={style} onChange={(e) => setStyle(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">
                      {styles.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
              </div>
              <div>
                  <label htmlFor="video-camera" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Camera Motion</label>
                  <select id="video-camera" value={cameraMotion} onChange={(e) => setCameraMotion(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">
                      {cameraMotions.map(cm => <option key={cm} value={cm}>{cm}</option>)}
                  </select>
              </div>
              <div>
                  <label htmlFor="video-background" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Background Vibe</label>
                  <select id="video-background" value={backgroundVibe} onChange={(e) => setBackgroundVibe(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">
                          {backgroundVibes.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
              </div>
              <div>
                  <label htmlFor="video-ambiance" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Ambiance</label>
                  <input id="video-ambiance" type="text" value={ambiance} onChange={(e) => setAmbiance(e.target.value)} placeholder="e.g., joyful, mysterious" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none"/>
              </div>
          </div>
           <div className="mt-4">
              <label htmlFor="video-negative-prompt" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Negative Prompt</label>
              <input id="video-negative-prompt" type="text" value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} placeholder="e.g., cartoon, drawing, low quality" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none"/>
          </div>
      </Section>
      
      <Section title="5. Dialogue / Audio (Optional)">
          <textarea value={dialogue} onChange={(e) => setDialogue(e.target.value)} placeholder="Dialogue for the character to speak..." rows={2} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none"/>
      </Section>

      <Section title="6. Reference Image (Optional)">
          {previewUrl && referenceImage ? (
              <div className="relative w-full max-w-[150px]">
                  <img src={previewUrl} alt="upload preview" className="w-full h-auto object-cover rounded-md"/>
                  <button onClick={removeImage} className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 text-white hover:bg-red-600 transition-colors">
                      <TrashIcon className="w-3 h-3"/>
                  </button>
              </div>
          ) : (
              <ImageUpload
                id="video-gen-ref-upload"
                key={imageUploadKey}
                onImageUpload={handleReferenceImageUpload}
                title="Upload Image"
              />
          )}
      </Section>

      <div className="mt-auto pt-4">
          <button onClick={handleGenerate} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? <Spinner /> : 'Generate Video'}
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
              <p className="mt-4 font-semibold text-primary-500 dark:text-primary-400">Generating your video...</p>
              <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{loadingMessage}</p>
          </div>
      )}
      {!isLoading && videoUrl && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 relative group">
              <video src={videoUrl} controls autoPlay loop className="max-h-full max-w-full rounded-md" />
              <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <a href={videoUrl} download={`monoklix-video-${Date.now()}.mp4`} title="Download Video" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
                    <DownloadIcon className="w-4 h-4"/>
                </a>
              </div>
          </div>
      )}
      {!isLoading && !videoUrl && (
          <div className="text-center text-neutral-500 dark:text-neutral-600">
               <StarIcon className="w-16 h-16 mx-auto" />
               <p>Your generated video will appear here.</p>
          </div>
      )}
    </>
  );
  
  return <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} />;
};

export default VideoGenerationView;