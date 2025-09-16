import React, { useState, useCallback } from 'react';
import ImageUpload from '../common/ImageUpload';
import { generateMultimodalContent } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { StoreIcon, DownloadIcon } from '../Icons';
import { type MultimodalContent } from '../../services/geminiService';
import { type User } from '../../types';

const creativeOptions = {
  vibe: ["Bertenaga & Seronok", "Sinematik & Epik", "Moden & Bersih", "Semula Jadi & Organik", "Teknologi & Futuristik"],
  lighting: ["Cahaya Studio", "Dramatik", "Cahaya Semula Jadi", "Neon"],
  contentType: ["Jualan Terus", "Jualan Lembut", "Bercerita", "Masalah/Penyelesaian", "ASMR / Sensori", "Buka Kotak", "Pendidikan", "Testimoni"],
};

const backgroundOptions = ["Kafe Estetik", "Gaya Urban (Makan)", "Pantai Tropika", "Pangsapuri Mewah", "Taman Bunga", "Bangunan Lama", "Tersuai"];

type CreativeKey = keyof typeof creativeOptions;

const downloadText = (text: string, fileName: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const ProductAdView: React.FC = () => {
  const [productImage, setProductImage] = useState<MultimodalContent | null>(null);
  const [productDesc, setProductDesc] = useState('');
  const [selections, setSelections] = useState<Record<CreativeKey, string[]>>({ vibe: [], lighting: [], contentType: [] });
  const [storyboard, setStoryboard] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backgroundVibe, setBackgroundVibe] = useState('Kafe Estetik');
  const [customVibe, setCustomVibe] = useState('');

  const handleImageUpload = useCallback((base64: string, mimeType: string) => {
    setProductImage({ base64, mimeType });
  }, []);

  const handleSelection = (category: CreativeKey, value: string) => {
    setSelections(prev => {
      const current = prev[category];
      const updated = current.includes(value) ? current.filter(item => item !== value) : [...current, value];
      return { ...prev, [category]: updated };
    });
  };

  const handleGenerate = async () => {
    if (!productImage || !productDesc) {
      setError("Sila muat naik imej produk dan berikan penerangan.");
      return;
    }
    if (backgroundVibe === 'Tersuai' && !customVibe.trim()) {
      setError("Sila masukkan suasana latar belakang tersuai anda.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setStoryboard(null);

    const finalBackgroundVibe = backgroundVibe === 'Tersuai' ? customVibe : backgroundVibe;

    const prompt = `
      Anda seorang penulis salinan iklan dan artis papan cerita yang pakar untuk iklan video media sosial.
      Cipta papan cerita 1-babak yang menarik untuk iklan video berdasarkan imej dan butiran produk yang diberikan.
      Output mestilah papan cerita yang jelas dan padat.

      **Penerangan Produk:**
      ${productDesc}

      **Hala Tuju Kreatif:**
      - Suasana: ${selections.vibe.join(', ') || 'Tidak dinyatakan'}
      - Pencahayaan: ${selections.lighting.join(', ') || 'Tidak dinyatakan'}
      - Jenis Kandungan: ${selections.contentType.join(', ') || 'Tidak dinyatakan'}
      - Suasana Latar Belakang: ${finalBackgroundVibe}

      Berdasarkan semua maklumat ini, terangkan satu babak yang berkesan. Apa yang penonton lihat? Apakah alih suara atau teks pada skrin?
      Pastikan ia pendek, menarik, dan dioptimumkan untuk platform seperti TikTok atau Instagram Reels.
    `;

    try {
      const result = await generateMultimodalContent(prompt, [productImage]);
      setStoryboard(result);
      await addHistoryItem({
        type: 'Papan Cerita',
        prompt: `Iklan Produk: ${productDesc.substring(0, 50)}...`,
        result: result,
      });
    } catch (e) {
      console.error(e);
      setError("Gagal menjana papan cerita. Sila cuba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const CreativeButtonGroup: React.FC<{ title: string, category: CreativeKey, options: string[] }> = ({ title, category, options }) => (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {options.map(option => (
          <button
            key={option}
            onClick={() => handleSelection(category, option)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              selections[category].includes(option)
                ? 'bg-primary-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      {/* Left Panel: Controls */}
      <div className="flex flex-col gap-5 overflow-y-auto pr-4">
        <h1 className="text-3xl font-bold">Copywriting Produk</h1>
        <p className="text-gray-500 dark:text-gray-400 -mt-3">Buat papan cerita iklan video 1-babak dari satu gambar produk.</p>

        <div>
          <h2 className="text-lg font-semibold mb-2">1. Muat Naik Produk</h2>
          <ImageUpload id="product-ad-upload" onImageUpload={handleImageUpload} />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">2. Penerangan Produk</h2>
          <textarea
            value={productDesc}
            onChange={(e) => setProductDesc(e.target.value)}
            placeholder="Contoh: Kemeja flanel lengan panjang, bahan kapas premium, sesuai untuk gaya kasual."
            rows={4}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">3. Hala Tuju Kreatif</h2>
          <CreativeButtonGroup title="Suasana" category="vibe" options={creativeOptions.vibe} />
          <CreativeButtonGroup title="Pencahayaan" category="lighting" options={creativeOptions.lighting} />
          <CreativeButtonGroup title="Jenis Kandungan" category="contentType" options={creativeOptions.contentType} />
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Suasana Latar Belakang</h3>
            <div className="flex flex-wrap gap-2">
              {backgroundOptions.map(option => (
                <button
                  key={option}
                  onClick={() => setBackgroundVibe(option)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    backgroundVibe === option
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            {backgroundVibe === 'Tersuai' && (
              <textarea
                value={customVibe}
                onChange={(e) => setCustomVibe(e.target.value)}
                placeholder="Taipkan suasana latar belakang anda sendiri..."
                rows={2}
                className="w-full mt-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
              />
            )}
          </div>
        </div>


        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full mt-2 flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <Spinner /> : 'Jana Konsep Iklan'}
        </button>
        {error && <p className="text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
      </div>

      {/* Right Panel: Results */}
      <div className="bg-white dark:bg-black rounded-lg flex flex-col p-4">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Output</h2>
            {storyboard && !isLoading && (
                <button 
                  onClick={() => downloadText(storyboard, `1za7-storyboard-${Date.now()}.txt`)} 
                  className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                    <DownloadIcon className="w-4 h-4"/> Muat Turun
                </button>
            )}
        </div>
        <div className="flex-1 bg-gray-100 dark:bg-gray-900/50 rounded-md p-4 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <Spinner />
                <p className="mt-4 text-gray-500 dark:text-gray-400">Menjana papan cerita...</p>
              </div>
            </div>
          )}
          {storyboard && (
            <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {storyboard}
            </div>
          )}
          {!isLoading && !storyboard && (
            <div className="flex items-center justify-center h-full text-center text-gray-500 dark:text-gray-600">
              <div>
                <StoreIcon className="w-16 h-16 mx-auto" />
                <p>Output Iklan Anda akan muncul di sini</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductAdView;