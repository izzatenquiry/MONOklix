import React, { useState, useCallback } from 'react';
import { composeImage } from '../../services/geminiService';
import ImageUpload from '../common/ImageUpload';
import Spinner from '../common/Spinner';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { type MultimodalContent } from '../../services/geminiService';
import { DownloadIcon } from '../Icons';

interface ImageData extends MultimodalContent {
  file: File;
}

const downloadImage = (base64Image: string, fileName: string) => {
  const link = document.createElement('a');
  link.href = `data:image/png;base64,${base64Image}`;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const ImageEditingView: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [result, setResult] = useState<{ text?: string, imageBase64?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = useCallback((base64: string, mimeType: string, file: File) => {
    setImageData({ base64, mimeType, file });
    setResult(null); // Clear previous result on new image upload
  }, []);

  const handleEdit = useCallback(async () => {
    if (!imageData) {
      setError("Sila muat naik imej untuk disunting.");
      return;
    }
    if (!prompt.trim()) {
      setError("Sila masukkan arahan suntingan.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const apiResult = await composeImage(prompt, [imageData]);
      setResult(apiResult);
    } catch (e) {
      console.error(e);
      setError("Gagal menyunting imej. Sila cuba lagi.");
    } finally {
      setIsLoading(false);
    }
  }, [prompt, imageData]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold">Penyuntingan Imej</h2>
        <p className="text-gray-500 dark:text-gray-400">Ubah imej anda dengan arahan teks yang mudah.</p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl shadow-lg space-y-4">
        <ImageUpload id="image-edit-upload" onImageUpload={handleImageUpload} title="Muat Naik Imej untuk Disunting"/>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="cth., 'Jadikan langit kelihatan seperti matahari terbenam', 'tambah seekor kucing memakai topi ahli sihir'"
          rows={2}
          className="w-full bg-gray-200 dark:bg-gray-700/60 border border-gray-300 dark:border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
        />
        <button
          onClick={handleEdit}
          disabled={isLoading || !imageData}
          className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading && <Spinner />}
          Gunakan Suntingan
        </button>
      </div>
      
      {error && <p className="text-red-500 dark:text-red-400 text-center">{error}</p>}

      {isLoading && (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <Spinner />
          <p className="mt-4 text-gray-500 dark:text-gray-400">Menggunakan suntingan ajaib... ini mungkin mengambil sedikit masa.</p>
        </div>
      )}

      {result && (
        <div className="mt-6 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl space-y-4">
          <h3 className="text-2xl font-semibold text-center mb-4">Output</h3>
          {result.text && <MarkdownRenderer content={result.text} />}
          {result.imageBase64 && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <h4 className="font-semibold text-center mb-2 text-gray-500 dark:text-gray-400">Asal</h4>
                <img src={URL.createObjectURL(imageData!.file)} alt="Asal" className="rounded-lg w-full" />
              </div>
              <div>
                <h4 className="font-semibold text-center mb-2 text-gray-500 dark:text-gray-400">Disunting</h4>
                 <div className="relative group">
                    <img src={`data:image/png;base64,${result.imageBase64}`} alt="Disunting" className="rounded-lg w-full" />
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => downloadImage(result.imageBase64!, `1za7-edited-image-${Date.now()}.png`)}
                          className="flex items-center gap-2 bg-black/60 text-white text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-black/80 transition-colors"
                        >
                            <DownloadIcon className="w-3 h-3"/> Muat Turun
                        </button>
                    </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageEditingView;