import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateVideo } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { VideoIcon, DownloadIcon, TrashIcon, UploadIcon, StarIcon } from '../Icons';
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

const videoModels = [
    { id: MODELS.videoGeneration, name: 'VEO 2.0 (with Dialogue)' },
    // VEO 3.0 is not an available model in the guidelines, but keeping it as it was in the user's code.
    // In a real scenario, this would be removed if not supported.
    { id: 'veo-3.0-generate-001', name: 'VEO 3 (with Audio Prompt)' }, 
];

const aspectRatios = ["9:16", "1:1", "16:9", "4:3", "3:4"];

const VideoGenerationView: React.FC<VideoGenerationViewProps> = ({ preset, clearPreset }) => {
    const [prompt, setPrompt] = useState('');
    const [model, setModel] = useState(videoModels[0].id);
    const [aspectRatio, setAspectRatio] = useState("9:16");
    const [image, setImage] = useState<ImageData | null>(null);
    const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
    
    useEffect(() => {
        if (preset) {
            setPrompt(preset.prompt);
            setImage({ base64: preset.image.base64, mimeType: preset.image.mimeType });
            clearPreset();
        }
    }, [preset, clearPreset]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isLoading) {
            interval = setInterval(() => {
                setLoadingMessage(prev => {
                    const currentIndex = loadingMessages.indexOf(prev);
                    const nextIndex = (currentIndex + 1) % loadingMessages.length;
                    return loadingMessages[nextIndex];
                });
            }, 3000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isLoading]);

    useEffect(() => {
        if (videoBlob) {
            const url = URL.createObjectURL(videoBlob);
            setVideoUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [videoBlob]);

    const handleImageUpload = useCallback((base64: string, mimeType: string) => {
        setImage({ base64, mimeType });
    }, []);

    const handleRemoveImage = () => {
        setImage(null);
    };

    const handleGenerate = useCallback(async () => {
        if (!prompt.trim()) {
            setError("Please enter a prompt.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setVideoBlob(null);

        try {
            const imageParam = image ? { imageBytes: image.base64, mimeType: image.mimeType } : undefined;
            const resultBlob = await generateVideo(prompt, model, aspectRatio, imageParam);
            setVideoBlob(resultBlob);
            await addHistoryItem({
                type: 'Video',
                prompt: `Video: ${prompt}`,
                result: resultBlob,
            });
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [prompt, model, aspectRatio, image]);

    const leftPanel = (
        <>
            <div>
                <h1 className="text-2xl font-bold sm:text-3xl">AI Video Generation</h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1">Create stunning videos from text prompts, with an optional image.</p>
            </div>
            <div>
                <label className="block text-sm font-medium mb-2">Prompt</label>
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500" placeholder="e.g., A cat wearing sunglasses driving a car" />
            </div>
            <div>
                <label className="block text-sm font-medium mb-2">Model</label>
                <select value={model} onChange={e => setModel(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500">
                    {videoModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium mb-2">Aspect Ratio</label>
                <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500">
                    {aspectRatios.map(ar => <option key={ar} value={ar}>{ar}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium mb-2">Reference Image (Optional)</label>
                {image ? (
                     <div className="relative w-full aspect-video">
                        <img src={`data:${image.mimeType};base64,${image.base64}`} alt="Reference" className="w-full h-full object-contain rounded-md bg-gray-100 dark:bg-gray-800" />
                        <button onClick={handleRemoveImage} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"><TrashIcon className="w-4 h-4" /></button>
                     </div>
                ) : (
                    <ImageUpload id="video-gen-upload" onImageUpload={handleImageUpload} />
                )}
            </div>
             <div className="pt-4 mt-auto">
                <button onClick={handleGenerate} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50">
                    {isLoading ? <Spinner /> : 'Generate Video'}
                </button>
             </div>
             {error && <p className="text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
        </>
    );

    const rightPanel = (
         <>
            {isLoading && (
                <div className="text-center">
                    <Spinner />
                    <p className="mt-4 text-neutral-500 dark:text-neutral-400">{loadingMessage}</p>
                    <p className="text-xs mt-2 text-neutral-400">Video generation can take several minutes.</p>
                </div>
            )}
            {!isLoading && videoUrl && (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                    <video src={videoUrl} controls autoPlay className="max-h-full max-w-full rounded-md" />
                    <a href={videoUrl} download={`monoklix-video-${Date.now()}.mp4`} className="flex items-center gap-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold py-2 px-4 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600">
                        <DownloadIcon className="w-4 h-4" /> Download Video
                    </a>
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