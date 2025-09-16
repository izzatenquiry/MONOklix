import React, { useState, useCallback, useRef } from 'react';
import { generateImages, composeImage } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { ImageIcon, UploadIcon, TrashIcon, DownloadIcon, VideoIcon } from '../Icons';
import { type MultimodalContent } from '../../services/geminiService';
import { type User } from '../../types';

interface ImageData extends MultimodalContent {
  id: string;
  previewUrl: string;
}

const aspectRatios = ["9:16", "1:1", "16:9", "4:3", "3:4"];

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

interface ImageGenerationViewProps {
  onCreateVideo: (preset: VideoGenPreset) => void;
}

const ImageGenerationView: React.FC<ImageGenerationViewProps> = ({ onCreateVideo }) => {
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
  const [personGeneration, setPersonGeneration] = useState('GENERATE_DEFAULT');

  const isEditing = referenceImages.length > 0;

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
      setError("Sila masukkan Prompt.");
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
            type: 'Imej',
            prompt: `Suntingan Imej: ${prompt}`,
            result: result.imageBase64,
          });
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
            type: 'Imej',
            prompt: `Jana Imej: ${prompt} (Nisbah: ${aspectRatio})`,
            result: result[0],
          });
        }
      }
    } catch (e) {
      console.error(e);
      setError("Gagal memproses permintaan. Sila cuba lagi.");
    } finally {
      setIsLoading(false);
    }
  }, [prompt, aspectRatio, referenceImages, numberOfImages, negativePrompt, seed, highDynamicRange, personGeneration]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      {/* Left Panel: Controls */}
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">Jana & Sunting Imej</h1>
        
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Imej Rujukan (Pilihan, sehingga 5)</label>
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 min-h-[116px]">
                <div className="flex items-center gap-3 flex-wrap">
                    {referenceImages.map(img => (
                        <div key={img.id} className="relative w-20 h-20">
                            <img src={img.previewUrl} alt="pratonton muat naik" className="w-full h-full object-cover rounded-md"/>
                            <button onClick={() => removeImage(img.id)} className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 text-white hover:bg-red-600 transition-colors">
                                <TrashIcon className="w-3 h-3"/>
                            </button>
                        </div>
                    ))}
                    {referenceImages.length < 5 && (
                        <button onClick={() => fileInputRef.current?.click()} className="w-20 h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md flex flex-col items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                            <UploadIcon className="w-6 h-6"/>
                            <span className="text-xs mt-1">Muat Naik</span>
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
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Muat naik sehingga 5 imej untuk disunting atau digabungkan. Biarkan kosong untuk mencipta imej baharu daripada teks.</p>
            </div>
        </div>

        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Prompt</label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Seorang angkasawan bersendirian di bulan, sinematik"
            rows={4}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
          />
        </div>
        
        <div title={isEditing ? "Nisbah Aspek tidak boleh diubah dalam mod suntingan" : ""}>
          <label htmlFor="aspect-ratio" className={`block text-sm font-medium mb-2 transition-colors ${isEditing ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>Nisbah Aspek</label>
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
        
        <div title={isEditing ? "Hanya satu imej boleh dijana dalam mod suntingan" : ""}>
          <label htmlFor="number-of-images" className={`block text-sm font-medium mb-2 transition-colors ${isEditing ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>Bilangan Imej</label>
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
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tetapan Lanjutan</h3>
            
            <div title={isEditing ? "Prompt Negatif tidak disokong dalam mod suntingan" : ""}>
              <label htmlFor="negative-prompt" className={`block text-sm font-medium mb-2 transition-colors ${isEditing ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>Prompt Negatif</label>
              <textarea
                id="negative-prompt"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="Contoh: teks, logo, kabur, hodoh"
                rows={2}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isEditing}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div title={isEditing ? "Seed tidak boleh digunakan dalam mod suntingan" : ""}>
                  <label htmlFor="seed" className={`block text-sm font-medium mb-2 transition-colors ${isEditing ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>Seed</label>
                  <input
                    id="seed"
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    placeholder="Nombor rawak"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isEditing}
                  />
                </div>
                 <div title={isEditing ? "Penjanaan Orang tidak boleh digunakan dalam mod suntingan" : ""}>
                  <label htmlFor="person-generation" className={`block text-sm font-medium mb-2 transition-colors ${isEditing ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>Penjanaan Orang</label>
                  <select 
                    id="person-generation" 
                    value={personGeneration} 
                    onChange={(e) => setPersonGeneration(e.target.value)} 
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isEditing}
                  >
                    <option value="GENERATE_DEFAULT">Lalai</option>
                    <option value="GENERATE_PHOTOREALISTIC_FACES">Wajah Fotorealistik</option>
                    <option value="DONT_GENERATE">Jangan Jana</option>
                  </select>
                </div>
            </div>

            <div title={isEditing ? "HDR tidak boleh digunakan dalam mod suntingan" : ""}>
                <div className={`flex items-center justify-between ${isEditing ? 'cursor-not-allowed' : ''}`}>
                    <label htmlFor="hdr-toggle" className={`text-sm font-medium transition-colors ${isEditing ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>Julat Dinamik Tinggi (HDR)</label>
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


        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full mt-2 flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <Spinner /> : 'Jana'}
        </button>
        {error && <p className="text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
      </div>

      {/* Right Panel: Results */}
      <div className="bg-white dark:bg-black rounded-lg flex flex-col p-4">
        <h2 className="text-xl font-bold mb-4">Output</h2>
        <div className="flex-1 flex items-center justify-center bg-gray-200 dark:bg-gray-900/50 rounded-md overflow-hidden relative group">
          {isLoading && (
            <div className="text-center">
              <Spinner />
              <p className="mt-4 text-gray-500 dark:text-gray-400">Menjana karya agung anda...</p>
            </div>
          )}
          {!isLoading && images.length > 0 && (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2">
              <div className="flex-1 flex items-center justify-center min-h-0 w-full relative">
                <img src={`data:image/png;base64,${images[selectedImageIndex]}`} alt={`Imej dijana ${selectedImageIndex + 1}`} className="rounded-md max-h-full max-w-full object-contain" />
                 <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button onClick={() => downloadImage(images[selectedImageIndex], `1za7-ai-image-${Date.now()}.png`)} className="flex items-center gap-2 bg-black/60 text-white text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-black/80 transition-colors">
                        <DownloadIcon className="w-3 h-3"/> Muat Turun
                    </button>
                    <button onClick={() => onCreateVideo({ prompt, image: { base64: images[selectedImageIndex], mimeType: 'image/png' } })} className="flex items-center gap-2 bg-primary-600/80 text-white text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-primary-600 transition-colors">
                        <VideoIcon className="w-3 h-3"/> Buat Video
                    </button>
                </div>
              </div>
              {images.length > 1 && (
                <div className="flex-shrink-0 w-full flex justify-center">
                  <div className="flex gap-2 overflow-x-auto p-2">
                    {images.map((img, index) => (
                      <button key={index} onClick={() => setSelectedImageIndex(index)} className={`w-16 h-16 md:w-20 md:h-20 rounded-md overflow-hidden flex-shrink-0 transition-all duration-200 ${selectedImageIndex === index ? 'ring-4 ring-primary-500' : 'ring-2 ring-transparent hover:ring-primary-300'}`}>
                        <img src={`data:image/png;base64,${img}`} alt={`Imej kecil ${index + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {!isLoading && editedResult?.imageBase64 && (
             <div className="w-full h-full flex items-center justify-center relative">
                <img src={`data:image/png;base64,${editedResult.imageBase64}`} alt="Output suntingan" className="rounded-md max-h-full max-w-full object-contain" />
                <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button onClick={() => downloadImage(editedResult.imageBase64!, `1za7-ai-edited-image-${Date.now()}.png`)} className="flex items-center gap-2 bg-black/60 text-white text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-black/80 transition-colors">
                        <DownloadIcon className="w-3 h-3"/> Muat Turun
                    </button>
                    <button onClick={() => onCreateVideo({ prompt, image: { base64: editedResult.imageBase64!, mimeType: 'image/png' } })} className="flex items-center gap-2 bg-primary-600/80 text-white text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-primary-600 transition-colors">
                        <VideoIcon className="w-3 h-3"/> Buat Video
                    </button>
                </div>
             </div>
          )}
           {!isLoading && images.length === 0 && !editedResult && (
            <div className="text-center text-gray-500 dark:text-gray-600">
              <ImageIcon className="w-16 h-16 mx-auto" />
              <p>Output akan muncul di sini</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageGenerationView;