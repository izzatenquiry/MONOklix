import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateImages, composeImage } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { ImageIcon, UploadIcon, TrashIcon, DownloadIcon, VideoIcon, StarIcon, WandIcon } from '../Icons';
import { type MultimodalContent } from '../../services/geminiService';
import { type User } from '../../types';
import { sendToTelegram } from '../../services/telegramService';
import TwoColumnLayout from '../common/TwoColumnLayout';

interface ImageData extends MultimodalContent {
  id: string;
  previewUrl: string;
}

const aspectRatios = ["9:16", "1:1", "16:9", "4:3", "3:4"];

const triggerDownload = (data: string, fileNameBase: string) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${data}`;
    link.download = `${fileNameBase}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


const downloadImage = (base64Image: string, fileName: string) => {
  const link = document.createElement('a');
  link.href = `data:image/png;base64,${base64Image}`;
  link.download = fileName;
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

interface ImageGenerationViewProps {
  onCreateVideo: (preset: VideoGenPreset) => void;
  onReEdit: (preset: ImageEditPreset) => void;
  imageToReEdit: ImageEditPreset | null;
  clearReEdit: () => void;
}

const ImageGenerationView: React.FC<ImageGenerationViewProps> = ({ onCreateVideo, onReEdit, imageToReEdit, clearReEdit }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceImages, setReferenceImages] = useState<ImageData[]>([]);
  const [editedResult, setEditedResult] = useState<{ text?: string, imageBase64?: string } | null>(null);
  const [numberOfImages, setNumberOfImages] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Advanced options state
  const [negativePrompt, setNegativePrompt] = useState('');
  const [seed, setSeed] = useState<number | ''>('');
  const [highDynamicRange, setHighDynamicRange] = useState(false);
  const [personGeneration, setPersonGeneration] = useState('GENERATE_PHOTOREALISTIC_FACES');

  const isEditing = referenceImages.length > 0;

  useEffect(() => {
    if (imageToReEdit) {
      const newImage: ImageData = {
        id: `re-edit-${Date.now()}`,
        previewUrl: `data:${imageToReEdit.mimeType};base64,${imageToReEdit.base64}`,
        base64: imageToReEdit.base64,
        mimeType: imageToReEdit.mimeType,
      };
      setReferenceImages([newImage]);
      setEditedResult(null);
      setImages([]);
      setPrompt(''); // Clear prompt for new edit
      clearReEdit();
    }
  }, [imageToReEdit, clearReEdit]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const filesToProcess = Array.from(files).slice(0, 5 - referenceImages.length);
    
    filesToProcess.forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                const newImage: ImageData = {
                    id: `${file.name}-${Date.now()}`,
                    previewUrl: reader.result as string,
                    base64: base64String,
                    mimeType: file.type,
                };
                setReferenceImages(prevImages => [...prevImages, newImage]);
                setEditedResult(null); // Clear previous results
                setImages([]);
            };
            reader.readAsDataURL(file);
        }
    });

    if(event.target) {
        event.target.value = '';
    }
  };

  const removeImage = (id: string) => {
    setReferenceImages(prev => {
        const updated = prev.filter(img => img.id !== id);
        if (updated.length === 0) {
            setEditedResult(null);
        }
        return updated;
    });
  };

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt to describe the image you want to create.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setImages([]);
    setEditedResult(null);

    try {
      if (referenceImages.length > 0) {
        // Image Editing Mode
        const result = await composeImage(prompt, referenceImages);
        setEditedResult(result);
        if (result.imageBase64) {
          await addHistoryItem({
            type: 'Image',
            prompt: `Image Edit: ${prompt}`,
            result: result.imageBase64,
          });
          sendToTelegram(result.imageBase64, 'image', `Image Edit: ${prompt}`);
          triggerDownload(result.imageBase64, 'monoklix-edited-image');
        }
      } else {
        // Image Generation Mode
        const seedValue = seed === '' ? undefined : Number(seed);
        const result = await generateImages(
            prompt, 
            aspectRatio, 
            numberOfImages,
            negativePrompt,
            seedValue,
            highDynamicRange,
            personGeneration as any
        );
        setImages(result);
        setSelectedImageIndex(0);
        if (result.length > 0) {
          await addHistoryItem({
            type: 'Image',
            prompt: `Generate Image: ${prompt} (Ratio: ${aspectRatio})`,
            result: result[0],
          });
          result.forEach((imgBase64, index) => {
            sendToTelegram(imgBase64, 'image', `Generate Image: ${prompt} (Ratio: ${aspectRatio})`);
            triggerDownload(imgBase64, `monoklix-generated-image-${index+1}`);
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
  }, [prompt, aspectRatio, referenceImages, numberOfImages, negativePrompt, seed, highDynamicRange, personGeneration]);

  const handleLocalReEdit = (base64: string, mimeType: string) => {
      const newImage: ImageData = {
          id: `re-edit-${Date.now()}`,
          previewUrl: `data:${mimeType};base64,${base64}`,
          base64,
          mimeType,
      };
      setReferenceImages([newImage]);
      setEditedResult(null);
      setImages([]);
      setPrompt('');
  };

  const leftPanel = (
    <>
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Generate & Edit Images</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">Create original images from text or modify existing ones with AI.</p>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Reference Images (Optional, up to 5)</label>
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 min-h-[116px]">
              <div className="flex items-center gap-3 flex-wrap">
                  {referenceImages.map(img => (
                      <div key={img.id} className="relative w-20 h-20">
                          <img src={img.previewUrl} alt="upload preview" className="w-full h-full object-cover rounded-md"/>
                          <button onClick={() => removeImage(img.id)} className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 text-white hover:bg-red-600 transition-colors">
                              <TrashIcon className="w-3 h-3"/>
                          </button>
                      </div>
                  ))}
                  {referenceImages.length < 5 && (
                      <button onClick={() => fileInputRef.current?.click()} className="w-20 h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md flex flex-col items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                          <UploadIcon className="w-6 h-6"/>
                          <span className="text-xs mt-1">Upload</span>
                      </button>
                  )}
                  <input
                      type="file"
                      accept="image/*"
                      multiple
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                  />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Upload up to 5 images to edit or combine. Leave blank to create a new image from text.</p>
          </div>
      </div>

      <div>
        <label htmlFor="prompt" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Prompt</label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="A lone astronaut on the moon, cinematic"
          rows={4}
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
        />
      </div>
      
      <div title={isEditing ? "Aspect Ratio cannot be changed in edit mode" : ""}>
        <label htmlFor="aspect-ratio" className={`block text-sm font-medium mb-2 transition-colors ${isEditing ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>Aspect Ratio</label>
        <select 
          id="aspect-ratio" 
          value={aspectRatio} 
          onChange={(e) => setAspectRatio(e.target.value)} 
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isEditing}
        >
          {aspectRatios.map(ar => <option key={ar} value={ar}>{ar}</option>)}
        </select>
      </div>
      
      <div title={isEditing ? "Only one image can be generated in edit mode" : ""}>
        <label htmlFor="number-of-images" className={`block text-sm font-medium mb-2 transition-colors ${isEditing ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>Number of Images</label>
        <select 
          id="number-of-images" 
          value={isEditing ? 1 : numberOfImages} 
          onChange={(e) => setNumberOfImages(parseInt(e.target.value, 10))} 
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isEditing}
        >
          {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      
      {/* Advanced Controls */}
      <div className="space-y-4 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-2">Advanced Settings</h2>
          
          <div title={isEditing ? "Negative Prompt is not supported in edit mode" : ""}>
            <label htmlFor="negative-prompt" className={`block text-sm font-medium mb-2 transition-colors ${isEditing ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>Negative Prompt</label>
            <textarea
              id="negative-prompt"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="e.g., text, logos, blurry, ugly"
              rows={2}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isEditing}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
              <div title={isEditing ? "Seed cannot be used in edit mode" : ""}>
                <label htmlFor="seed" className={`block text-sm font-medium mb-2 transition-colors ${isEditing ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>Seed</label>
                <input
                  id="seed"
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  placeholder="Random number"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isEditing}
                />
              </div>
               <div title={isEditing ? "Person Generation cannot be used in edit mode" : ""}>
                <label htmlFor="person-generation" className={`block text-sm font-medium mb-2 transition-colors ${isEditing ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>Person Generation</label>
                <select 
                  id="person-generation" 
                  value={personGeneration} 
                  onChange={(e) => setPersonGeneration(e.target.value)} 
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isEditing}
                >
                  <option value="GENERATE_PHOTOREALISTIC_FACES">Photorealistic Faces</option>
                  <option value="GENERATE_DEFAULT">Default</option>
                  <option value="DONT_GENERATE">Don't Generate</option>
                </select>
              </div>
          </div>

          <div title={isEditing ? "HDR cannot be used in edit mode" : ""}>
              <div className={`flex items-center justify-between ${isEditing ? 'cursor-not-allowed' : ''}`}>
                  <label htmlFor="hdr-toggle" className={`text-sm font-medium transition-colors ${isEditing ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>High Dynamic Range (HDR)</label>
                  <label htmlFor="hdr-toggle" className={`relative inline-flex items-center ${isEditing ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                      <input 
                          type="checkbox" 
                          id="hdr-toggle" 
                          className="sr-only peer" 
                          checked={highDynamicRange} 
                          onChange={(e) => setHighDynamicRange(e.target.checked)}
                          disabled={isEditing}
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600 peer-disabled:opacity-50"></div>
                  </label>
              </div>
          </div>
      </div>

      <div className="pt-4 mt-auto">
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <Spinner /> : isEditing ? 'Apply Edit' : 'Generate Image'}
        </button>
      </div>
      {error && <p className="text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
    </>
  );

  const ActionButtons: React.FC<{ imageBase64: string; mimeType: string }> = ({ imageBase64, mimeType }) => (
    <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      <button onClick={() => handleLocalReEdit(imageBase64, mimeType)} title="Re-edit this image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
        <WandIcon className="w-4 h-4" />
      </button>
      <button onClick={() => onCreateVideo({ prompt, image: { base64: imageBase64, mimeType } })} title="Create Video from this image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
        <VideoIcon className="w-4 h-4" />
      </button>
      <button onClick={() => downloadImage(imageBase64, `monoklix-image-${Date.now()}.png`)} title="Download Image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
        <DownloadIcon className="w-4 h-4" />
      </button>
    </div>
  );

  const rightPanel = (
    <>
      {isLoading && (
        <div className="text-center">
          <Spinner />
          <p className="mt-4 text-neutral-500 dark:text-neutral-400">Generating your masterpiece...</p>
        </div>
      )}
      {!isLoading && images.length === 0 && !editedResult && (
        <div className="flex items-center justify-center h-full text-center text-neutral-500 dark:text-neutral-600">
            <div>
                <StarIcon className="w-16 h-16 mx-auto" />
                <p>Your Content Output will appear here.</p>
            </div>
        </div>
      )}

      {/* Unified Output Display */}
      {!isLoading && (images.length > 0 || editedResult?.imageBase64) && (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2">
            <div className="flex-1 flex items-center justify-center min-h-0 w-full relative group">
                {images.length > 0 && (
                    <img src={`data:image/png;base64,${images[selectedImageIndex]}`} alt={`Generated image ${selectedImageIndex + 1}`} className="rounded-md max-h-full max-w-full object-contain" />
                )}
                {editedResult?.imageBase64 && (
                     <img src={`data:image/png;base64,${editedResult.imageBase64}`} alt="Edited output" className="rounded-md max-h-full max-w-full object-contain" />
                )}
                <ActionButtons 
                    imageBase64={images.length > 0 ? images[selectedImageIndex] : editedResult!.imageBase64!}
                    mimeType="image/png"
                />
            </div>
             {images.length > 1 && (
                <div className="flex-shrink-0 w-full flex justify-center">
                <div className="flex gap-2 overflow-x-auto p-2">
                    {images.map((img, index) => (
                    <button key={index} onClick={() => setSelectedImageIndex(index)} className={`w-16 h-16 md:w-20 md:h-20 rounded-md overflow-hidden flex-shrink-0 transition-all duration-200 ${selectedImageIndex === index ? 'ring-4 ring-primary-500' : 'ring-2 ring-transparent hover:ring-primary-300'}`}>
                        <img src={`data:image/png;base64,${img}`} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                    </button>
                    ))}
                </div>
                </div>
            )}
        </div>
      )}
    </>
  );

  return <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} />;
};

export default ImageGenerationView;