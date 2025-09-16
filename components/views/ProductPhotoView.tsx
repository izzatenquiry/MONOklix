import React, { useState, useCallback } from 'react';
import ImageUpload from '../common/ImageUpload';
import { composeImage, type MultimodalContent } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { CameraIcon, DownloadIcon } from '../Icons';
import { type User } from '../../types';

// Helper component for option buttons
const OptionButton: React.FC<{ label: string; isSelected: boolean; onClick: () => void; }> = ({ label, isSelected, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
      isSelected ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
    }`}
  >
    {label}
  </button>
);

const downloadImage = (base64Image: string, fileName: string) => {
  const link = document.createElement('a');
  link.href = `data:image/png;base64,${base64Image}`;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const ProductPhotoView: React.FC = () => {
  const [productImage, setProductImage] = useState<MultimodalContent | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [vibe, setVibe] = useState('Studio Backdrop');
  const [lighting, setLighting] = useState('Rawak');
  const [camera, setCamera] = useState('Rawak');
  const [creativity, setCreativity] = useState(0.5);

  const vibeOptions = {
    "Studio": ["Studio Backdrop", "Tekstur Buatan", "Warna & Palet", "Urban & Industri", "Muslimah & Kampung"],
    "Rumah": ["Minimalis Moden", "Cahaya & Bayangan", "Alam & Organik", "Dapur & Ruang Makan", "Bilik Mandi & Kecantikan"],
    "Luar": ["Efek Cahaya & Atmosfera", "Putih Bersih & Anggun", "Warna Duotone", "Hitam Putih", "Gradien Halus", "Bayangan Halus"]
  };

  const lightingOptions = ["Rawak", "Cahaya Siang Semula Jadi", "Waktu Senja", "Cahaya Terang", "Lampu Latar Tetingkap", "Cahaya Lampu Hangat", "Cahaya Campuran"];
  const cameraOptions = ["Rawak", "Perincian/Makro", "Tarak Dekat", "Tarak Sederhana Dekat", "Tarak Sederhana", "Tiga Suku", "Seluruh Badan", "Gaya Rata"];

  const handleGenerate = async () => {
    if (!productImage) {
      setError("Sila muat naik imej produk terlebih dahulu.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setResultImage(null);

    const prompt = `
      Cipta foto produk profesional untuk imej yang dimuat naik. Jangan masukkan manusia atau model.
      Fokus pada produk sahaja.
      Letakkan produk dalam tetapan berikut:
      - Vibe / Latar Belakang: ${vibe}
      - Pencahayaan: ${lighting === 'Rawak' ? 'pencahayaan sinematik yang menarik' : lighting}
      - Sudut Kamera & Lensa: ${camera === 'Rawak' ? 'sudut yang dinamik' : camera}
      - Tahap Kreativiti (0=dekat dengan asal, 1=sangat kreatif): ${creativity}
      Hasilnya mestilah imej yang fotorealistik, bersih, dan estetik sesuai untuk media sosial atau penyenaraian e-dagang.
    `;

    try {
      const result = await composeImage(prompt, [productImage]);
      if (result.imageBase64) {
        setResultImage(result.imageBase64);
        await addHistoryItem({
            type: 'Imej',
            prompt: `Foto Produk: Vibe - ${vibe}`,
            result: result.imageBase64,
        });
      } else {
        setError("AI tidak dapat menjana imej. Sila cuba tetapan yang berbeza.");
      }
    } catch (e) {
      console.error(e);
      setError("Gagal menjana imej. Sila cuba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      <div className="flex flex-col gap-5 overflow-y-auto pr-4 custom-scrollbar">
        <h1 className="text-3xl font-bold">Foto Produk</h1>
        <p className="text-gray-500 dark:text-gray-400 -mt-3">Buat kandungan UGC untuk produk tanpa model.</p>

        <div>
          <h2 className="text-lg font-semibold mb-2">1. Muat Naik Produk</h2>
          <ImageUpload id="product-photo-upload" onImageUpload={(base64, mimeType) => setProductImage({ base64, mimeType })} title="Klik untuk muat naik" />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">2. Pilih Suasana Kandungan</h2>
          {Object.entries(vibeOptions).map(([category, options]) => (
            <div key={category} className="mb-3">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{category}</h3>
              <div className="flex flex-wrap gap-2">
                {options.map(opt => <OptionButton key={opt} label={opt} isSelected={vibe === opt} onClick={() => setVibe(opt)} />)}
              </div>
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">3. Pencahayaan</h2>
          <div className="flex flex-wrap gap-2">
            {lightingOptions.map(opt => <OptionButton key={opt} label={opt} isSelected={lighting === opt} onClick={() => setLighting(opt)} />)}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">4. Kamera & Lensa</h2>
          <div className="flex flex-wrap gap-2">
            {cameraOptions.map(opt => <OptionButton key={opt} label={opt} isSelected={camera === opt} onClick={() => setCamera(opt)} />)}
          </div>
        </div>
        
        <div>
            <h2 className="text-lg font-semibold mb-2">5. Kreativiti AI</h2>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span>Sama pada Produk</span>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={creativity}
                    onChange={(e) => setCreativity(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
                <span>Sangat kreatif</span>
            </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full mt-2 flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <Spinner /> : 'Jana Gambar'}
        </button>
        {error && <p className="text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
      </div>

      <div className="bg-white dark:bg-black rounded-lg flex flex-col p-4">
        <h2 className="text-xl font-bold mb-4">Output</h2>
        <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-900/50 rounded-md relative group">
          {isLoading && (
            <div className="text-center">
              <Spinner />
              <p className="mt-4 text-gray-500 dark:text-gray-400">Menjana imej...</p>
            </div>
          )}
          {resultImage && !isLoading && (
            <div className="w-full h-full flex items-center justify-center">
                <img src={`data:image/png;base64,${resultImage}`} alt="Produk dijana" className="rounded-md max-h-full max-w-full object-contain" />
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => downloadImage(resultImage, `1za7-product-photo-${Date.now()}.png`)}
                      className="flex items-center gap-2 bg-black/60 text-white text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-black/80 transition-colors"
                    >
                        <DownloadIcon className="w-3 h-3"/> Muat Turun
                    </button>
                </div>
            </div>
          )}
          {!resultImage && !isLoading && (
            <div className="text-center text-gray-500 dark:text-gray-600">
              <CameraIcon className="w-16 h-16 mx-auto" />
              <p>Output kandungan anda akan muncul di sini.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductPhotoView;