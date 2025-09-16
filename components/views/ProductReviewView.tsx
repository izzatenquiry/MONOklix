import React, { useState, useCallback } from 'react';
import ImageUpload from '../common/ImageUpload';
import { generateMultimodalContent, type MultimodalContent } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { StarIcon, DownloadIcon } from '../Icons';
import { type User } from '../../types';

const backgroundVibes = ["Kafe Estetik", "Gaya Urban (Makan)", "Pantai Tropika", "Pangsapuri Mewah", "Taman Bunga", "Bangunan Lama"];

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

const ProductReviewView: React.FC = () => {
  const [productImage, setProductImage] = useState<MultimodalContent | null>(null);
  const [faceImage, setFaceImage] = useState<MultimodalContent | null>(null);
  const [productDesc, setProductDesc] = useState('');
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);
  const [storyboard, setStoryboard] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProductImageUpload = useCallback((base64: string, mimeType: string) => {
    setProductImage({ base64, mimeType });
  }, []);

  const handleFaceImageUpload = useCallback((base64: string, mimeType: string) => {
    setFaceImage({ base64, mimeType });
  }, []);

  const handleGenerate = async () => {
    if (!productImage || !faceImage || !productDesc || !selectedVibe) {
      setError("Sila muat naik kedua-dua imej, berikan penerangan, dan pilih suasana.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setStoryboard(null);

    const prompt = `
      Anda seorang pembantu AI yang pakar dalam mencipta papan cerita untuk video ulasan produk untuk media sosial.
      Berdasarkan imej produk pengguna, imej wajah, penerangan produk, dan suasana latar belakang yang dipilih, jana papan cerita yang pendek dan menarik untuk video ulasan.

      **Penerangan Produk:**
      ${productDesc}

      **Suasana Latar Belakang:**
      ${selectedVibe}

      Gabungkan elemen-elemen ini untuk mencipta penerangan babak, termasuk syot kamera, teks/kapsyen pada skrin, dan skrip alih suara di mana orang itu (dari imej wajah) sedang mengulas produk.
    `;

    try {
      // Ensure payload is correct after the check
      const imagesPayload: MultimodalContent[] = [productImage, faceImage];
      const result = await generateMultimodalContent(prompt, imagesPayload);
      setStoryboard(result);
      await addHistoryItem({
        type: 'Papan Cerita',
        prompt: `Ulasan Produk: ${productDesc.substring(0, 50)}...`,
        result: result,
      });
    } catch (e) {
      console.error("Error generating product review storyboard:", e);
      setError("Gagal menjana papan cerita. Sila cuba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      {/* Left Panel: Controls */}
      <div className="flex flex-col gap-5 overflow-y-auto pr-4">
        <h1 className="text-3xl font-bold">Ulasan Produk</h1>
        <p className="text-gray-500 dark:text-gray-400 -mt-3">Buat papan cerita, visual, dan video ulasan produk secara automatik.</p>

        <div>
          <h2 className="text-lg font-semibold mb-2">1. Muat Naik Aset</h2>
          <div className="grid grid-cols-2 gap-4">
            <ImageUpload id="product-review-product-upload" onImageUpload={handleProductImageUpload} title="Foto Produk" />
            <ImageUpload id="product-review-face-upload" onImageUpload={handleFaceImageUpload} title="Foto Wajah" />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">2. Penerangan Produk</h2>
          <textarea
            value={productDesc}
            onChange={(e) => setProductDesc(e.target.value)}
            placeholder="Contoh: Pencuci muka dengan ekstrak teh hijau..."
            rows={4}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">3. Suasana Latar Belakang</h2>
          <div className="flex flex-wrap gap-2">
            {backgroundVibes.map(vibe => (
              <button
                key={vibe}
                onClick={() => setSelectedVibe(vibe)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  selectedVibe === vibe
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {vibe}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full mt-2 flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <Spinner /> : 'Jana Kandungan'}
        </button>
        {error && <p className="text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
      </div>

      {/* Right Panel: Results */}
      <div className="bg-white dark:bg-black rounded-lg flex flex-col p-4">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Output</h2>
            {storyboard && !isLoading && (
                 <button 
                  onClick={() => downloadText(storyboard, `1za7-review-storyboard-${Date.now()}.txt`)} 
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
                <StarIcon className="w-16 h-16 mx-auto" />
                <p>Output Kandungan Anda akan muncul di sini.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductReviewView;