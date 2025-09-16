import React, { useState, useCallback, useEffect, useRef } from "react";
import { generateVideo } from "../../services/geminiService";
import { addHistoryItem } from "../../services/historyService";
import Spinner from "../common/Spinner";
import { VideoIcon, DownloadIcon, TrashIcon, UploadIcon } from "../Icons";

interface ImageData {
  base64: string;
  mimeType: string;
}

interface VideoGenPreset {
  prompt: string;
  image: { base64: string; mimeType: string };
}

interface VideoGenerationViewProps {
  preset: VideoGenPreset | null;
  clearPreset: () => void;
}

const loadingMessages = [
  "Membancuh ramuan video anda...",
  "Mengajar piksel untuk menari...",
  "Menyusun kecemerlangan sinematik...",
  "Ini mengambil masa lebih lama dari biasa, tetapi kesabaran itu membuahkan hasil...",
  "Hampir siap, hanya menggilap kanta...",
  "Memuktamadkan suntingan pengarah...",
];

const models = [
    { id: 'veo-3.0-fast-generate-001', name: 'Veo 3.0 Fast' },
    { id: 'veo-3.0-generate-001', name: 'Veo 3.0 HD' },
    { id: 'veo-2.0-generate-001', name: 'Veo 2.0' },
];
const aspectRatios = ["9:16", "1:1", "16:9", "4:3", "3:4"];
const resolutions = ["720p", "1080p"];
const cameraMotions = [ "None", "Pan", "Zoom In", "Zoom Out", "Tilt", "Crane", "Dolly", "Aerial" ];
const styles = [ "None", "Photorealistic", "Cinematic", "Anime", "Vintage", "Claymation", "Watercolor", "3D Animation" ];

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div>
    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
      {title}
    </h3>
    {children}
  </div>
);

const VideoGenerationView: React.FC<VideoGenerationViewProps> = ({
  preset,
  clearPreset,
}) => {
  // Prompt state
  const [subjectContext, setSubjectContext] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [ambiance, setAmbiance] = useState("");
  const [cameraMotion, setCameraMotion] = useState("None");
  const [style, setStyle] = useState("None");
  const [action, setAction] = useState("");
  
  // Technical state
  const [selectedModel, setSelectedModel] = useState(models[0].id);
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [durationSeconds, setDurationSeconds] = useState(4);
  const [resolution, setResolution] = useState("720p");
  const [generateAudio, setGenerateAudio] = useState(false);
  
  // App logic state
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
  const [referenceImage, setReferenceImage] = useState<ImageData | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingMessage((prev) => {
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
      const imageData = {
        base64: preset.image.base64,
        mimeType: preset.image.mimeType,
      };
      setReferenceImage(imageData);
      setPreviewUrl(`data:${imageData.mimeType};base64,${imageData.base64}`);
      clearPreset();
    }
  }, [preset, clearPreset]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(",")[1];
        setReferenceImage({ base64: base64String, mimeType: file.type });
        setPreviewUrl(URL.createObjectURL(file));
      };
      reader.readAsDataURL(file);
    }
    if (event.target) event.target.value = "";
  };

  const removeReferenceImage = () => {
    setReferenceImage(null);
    setPreviewUrl(null);
  };

  const buildPrompt = useCallback(() => {
    let parts = [subjectContext.trim()];
    if (action.trim()) parts.push(`Action: ${action.trim()}.`);
    if (ambiance.trim()) parts.push(`Ambiance: ${ambiance.trim()}.`);
    if (style !== "None") parts.push(`Style: ${style}.`);
    if (cameraMotion !== "None") parts.push(`Camera Motion: ${cameraMotion}.`);
    if (negativePrompt.trim())
      parts.push(`Negative Prompt: Do not include ${negativePrompt.trim()}.`);

    return parts.filter((p) => p).join(" ");
  }, [
    subjectContext,
    action,
    ambiance,
    style,
    cameraMotion,
    negativePrompt,
  ]);

  const handleGenerate = useCallback(async () => {
    if (!subjectContext.trim()) {
      setError("Sila masukkan Subjek & Konteks prompt.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setVideoUrl(null);
    setLoadingMessage(loadingMessages[0]);

    const finalPrompt = buildPrompt();

    try {
      const imageParam = referenceImage
        ? { imageBytes: referenceImage.base64, mimeType: referenceImage.mimeType }
        : undefined;
      
      const url = await generateVideo(
        finalPrompt,
        selectedModel,
        aspectRatio,
        durationSeconds,
        resolution,
        generateAudio,
        imageParam,
      );
      setVideoUrl(url);
      await addHistoryItem({
        type: "Video",
        prompt: `Jana Video: ${finalPrompt}`,
        result: url,
      });
    } catch (e) {
      console.error(e);
      const errorMessage =
        e instanceof Error ? e.message : "Berlaku ralat yang tidak diketahui.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [
    buildPrompt,
    referenceImage,
    selectedModel,
    aspectRatio,
    durationSeconds,
    resolution,
    generateAudio,
  ]);

  const handleDownload = () => {
    if (!videoUrl) return;
    const link = document.createElement("a");
    link.href = videoUrl;
    link.download = `1za7-ai-video-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formInputClass = "w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      {/* Left Panel */}
      <div className="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
        <h1 className="text-3xl font-bold">Jana Video Veo</h1>

        <Section title="Imej Rujukan (Pilihan)">
          {previewUrl ? (
            <div className="relative group w-full h-48">
              <img src={previewUrl} alt="Imej rujukan" className="w-full h-full object-contain rounded-lg bg-gray-100 dark:bg-gray-800/50 p-2" />
              <button onClick={removeReferenceImage} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Padam imej">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-300 h-48 border-gray-300 dark:border-gray-600 hover:border-primary-500 hover:bg-gray-100 dark:hover:bg-gray-800/50">
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" ref={fileInputRef} />
              <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
                <UploadIcon className="w-10 h-10 mb-2" />
                <p className="font-semibold text-gray-800 dark:text-gray-300">Klik untuk muat naik</p>
              </div>
            </label>
          )}
        </Section>
        
        <Section title="Tetapan Utama">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                 <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Model</label>
                    <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className={formInputClass}>
                        {models.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nisbah Aspek</label>
                    <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className={formInputClass}>
                        {aspectRatios.map((ar) => (<option key={ar} value={ar}>{ar}</option>))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Durasi (saat)</label>
                    <input type="number" value={durationSeconds} onChange={(e) => setDurationSeconds(parseInt(e.target.value, 10))} className={formInputClass} min="1" max="15"/>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Resolusi</label>
                    <select value={resolution} onChange={(e) => setResolution(e.target.value)} className={formInputClass}>
                        {resolutions.map((r) => (<option key={r} value={r}>{r}</option>))}
                    </select>
                </div>
                <div className="flex flex-col justify-end">
                    <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2">
                        <label htmlFor="audio-toggle" className="text-sm font-medium text-gray-600 dark:text-gray-400">Audio</label>
                        <label htmlFor="audio-toggle" className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="audio-toggle" className="sr-only peer" checked={generateAudio} onChange={(e) => setGenerateAudio(e.target.checked)}/>
                            <div className="w-9 h-5 bg-gray-200 dark:bg-gray-700/50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                        </label>
                    </div>
                </div>
            </div>
        </Section>

        <Section title="Bina Prompt Anda">
          <div className="space-y-3">
            <textarea value={subjectContext} onChange={(e) => setSubjectContext(e.target.value)} placeholder="Subjek & Konteks... cth., seekor kucing comel dengan topi ahli sihir" rows={3} className={formInputClass} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input type="text" value={action} onChange={(e) => setAction(e.target.value)} placeholder="Tindakan... cth., menari di atas meja" className={formInputClass} />
              <input type="text" value={ambiance} onChange={(e) => setAmbiance(e.target.value)} placeholder="Suasana... cth., dalam bilik yang gelap dan misteri" className={formInputClass} />
              <select value={style} onChange={(e) => setStyle(e.target.value)} className={formInputClass}>
                <option value="None" disabled>Pilih Gaya</option>
                {styles.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
              <select value={cameraMotion} onChange={(e) => setCameraMotion(e.target.value)} className={formInputClass}>
                <option value="None" disabled>Pilih Pergerakan Kamera</option>
                {cameraMotions.map((m) => (<option key={m} value={m}>{m}</option>))}
              </select>
            </div>
            <textarea value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} placeholder="Prompt Negatif... cth., kabur, teks, tera air" rows={2} className={formInputClass} />
          </div>
        </Section>

        <button onClick={handleGenerate} disabled={isLoading} className="w-full bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center disabled:opacity-50">
          <VideoIcon className="w-5 h-5 mr-2" />
          {isLoading ? "Menjana..." : "Jana Video"}
        </button>

        {error && (<div className="text-red-500 text-sm mt-2 p-2 border border-red-300 rounded">{error}</div>)}
      </div>

      {/* Right Panel */}
      <div className="bg-white dark:bg-black rounded-lg flex flex-col p-4">
        <h2 className="text-xl font-bold mb-4">Output</h2>
        <div className="flex-1 flex items-center justify-center bg-gray-200 dark:bg-gray-900/50 rounded-md overflow-hidden relative group">
          {isLoading ? (
            <div className="text-center p-4">
              <Spinner />
              <p className="mt-4 text-gray-500 dark:text-gray-400">{loadingMessage}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">(Penjanaan video boleh mengambil masa beberapa minit)</p>
            </div>
          ) : videoUrl ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-2">
              <video src={videoUrl} controls className="w-full h-full object-contain" />
              <button onClick={handleDownload} className="absolute bottom-3 right-3 flex items-center gap-2 bg-black/60 text-white text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100">
                <DownloadIcon className="w-3 h-3" />
                Muat Turun Video
              </button>
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-600">
                <VideoIcon className="w-16 h-16 mx-auto" />
                <p>Hasil video anda akan dipaparkan di sini.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoGenerationView;