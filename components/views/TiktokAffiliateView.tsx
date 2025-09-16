import React, { useState, useCallback } from 'react';
import ImageUpload from '../common/ImageUpload';
import { composeImage, type MultimodalContent } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { TikTokIcon, DownloadIcon } from '../Icons';
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

const TiktokAffiliateView: React.FC = () => {
    const [productImage, setProductImage] = useState<MultimodalContent | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [gender, setGender] = useState('Wanita');
    const [modelFace, setModelFace] = useState('Rawak');
    const [lighting, setLighting] = useState('Rawak');
    const [camera, setCamera] = useState('Rawak');
    const [pose, setPose] = useState('Rawak');
    const [vibe, setVibe] = useState('Studio');
    const [creativity, setCreativity] = useState(0.5);

    const vibeOptions = ["Studio", "Bilik Tidur", "Gaming Setup", "Dapur / Ruang Makan", "Ruang Kerja / Belajar", "Pintu Masuk / Dobi", "Bandar Bersih", "Studio Cahaya Siang", "Pastel Bersih", "Kecerahan Tinggi Putih", "Kecerahan Rendah Suram"];
    
    const handleGenerate = async () => {
        if (!productImage) {
            setError("Sila muat naik imej produk terlebih dahulu.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setResultImage(null);

        const prompt = `
            Cipta imej Kandungan Janaan Pengguna (UGC) yang fotorealistik untuk platform seperti TikTok.
            Imej mesti menampilkan imej produk yang dimuat naik secara semula jadi.
            Berikut adalah butiran untuk imej:
            - Model: Seorang ${gender} dari ${modelFace === 'Rawak' ? 'Asia Tenggara' : modelFace}. Pastikan wajah kelihatan realistik dan menarik.
            - Produk: Sertakan produk dari imej yang dimuat naik.
            - Pencahayaan: ${lighting === 'Rawak' ? 'pencahayaan yang menarik dan kelihatan semula jadi' : lighting}.
            - Kamera & Lensa: ${camera === 'Rawak' ? 'sudut yang dinamik' : camera}.
            - Gerakan Tubuh / Pose: ${pose === 'Rawak' ? 'pose yang semula jadi dan santai' : pose}. Model harus berinteraksi dengan produk jika sesuai.
            - Suasana Kandungan / Latar Belakang: ${vibe}.
            - Tahap Kreativiti (0=dekat dengan asal, 1=sangat kreatif): ${creativity}.
            Hasilnya mestilah imej berkualiti tinggi, kelihatan asli, dan menarik yang boleh digunakan untuk pemasaran gabungan. Jangan masukkan sebarang teks atau logo.
        `;
        
        try {
            const result = await composeImage(prompt, [productImage]);
            if (result.imageBase64) {
                setResultImage(result.imageBase64);
                await addHistoryItem({
                    type: 'Imej',
                    prompt: `Tiktok Affiliate: Vibe - ${vibe}, Model - ${gender}`,
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
            <div className="flex flex-col gap-4 overflow-y-auto pr-4 custom-scrollbar">
                <h1 className="text-3xl font-bold">Tiktok Affiliate</h1>
                <p className="text-gray-500 dark:text-gray-400 -mt-3">Buat kandungan UGC dengan pantas menggunakan AI.</p>

                {/* Sections */}
                <Section title="1. Aset & Model">
                    <ImageUpload id="tiktok-affiliate-upload" onImageUpload={(base64, mimeType) => setProductImage({base64, mimeType})} title="Muat Naik Produk"/>
                    <div className="flex gap-2 mt-2">
                        <OptionButton label="Wanita" isSelected={gender === 'Wanita'} onClick={() => setGender('Wanita')} />
                        <OptionButton label="Lelaki" isSelected={gender === 'Lelaki'} onClick={() => setGender('Lelaki')} />
                        <OptionButton label="Tersuai" isSelected={gender === 'Tersuai'} onClick={() => setGender('Tersuai')} />
                    </div>
                </Section>

                <Section title="2. Wajah Model">
                    <select value={modelFace} onChange={e => setModelFace(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none">
                        <option>Rawak</option>
                        <option>Malaysia</option>
                        <option>Indonesia</option>
                        <option>Vietnam</option>
                    </select>
                </Section>
                
                <Section title="3. Pencahayaan">
                    <div className="flex flex-wrap gap-2">
                         <OptionButton label="Rawak" isSelected={lighting === 'Rawak'} onClick={() => setLighting('Rawak')} />
                         <OptionButton label="Cahaya Siang Semula Jadi" isSelected={lighting === 'Cahaya Siang Semula Jadi'} onClick={() => setLighting('Cahaya Siang Semula Jadi')} />
                         <OptionButton label="Waktu Senja" isSelected={lighting === 'Waktu Senja'} onClick={() => setLighting('Waktu Senja')} />
                    </div>
                </Section>

                <Section title="4. Kamera & Lensa">
                    <div className="flex flex-wrap gap-2">
                         <OptionButton label="Rawak" isSelected={camera === 'Rawak'} onClick={() => setCamera('Rawak')} />
                         <OptionButton label="Perincian/Makro" isSelected={camera === 'Perincian/Makro'} onClick={() => setCamera('Perincian/Makro')} />
                         <OptionButton label="Tarak Dekat" isSelected={camera === 'Tarak Dekat'} onClick={() => setCamera('Tarak Dekat')} />
                    </div>
                </Section>

                <Section title="5. Gerakan Tubuh">
                    <div className="flex flex-wrap gap-2">
                         <OptionButton label="Rawak" isSelected={pose === 'Rawak'} onClick={() => setPose('Rawak')} />
                         <OptionButton label="Model Profesional" isSelected={pose === 'Model Profesional'} onClick={() => setPose('Model Profesional')} />
                         <OptionButton label="Berdiri Santai" isSelected={pose === 'Berdiri Santai'} onClick={() => setPose('Berdiri Santai')} />
                    </div>
                </Section>

                <Section title="6. Suasana Kandungan">
                    <div className="flex flex-wrap gap-2">
                        {vibeOptions.map(opt => <OptionButton key={opt} label={opt} isSelected={vibe === opt} onClick={() => setVibe(opt)} />)}
                    </div>
                </Section>
                
                <Section title="7. Kreativiti AI">
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
                </Section>

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
                            <img src={`data:image/png;base64,${resultImage}`} alt="Kandungan affiliate dijana" className="rounded-md max-h-full max-w-full object-contain" />
                             <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => downloadImage(resultImage, `1za7-affiliate-image-${Date.now()}.png`)}
                                  className="flex items-center gap-2 bg-black/60 text-white text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-black/80 transition-colors"
                                >
                                    <DownloadIcon className="w-3 h-3"/> Muat Turun
                                </button>
                            </div>
                        </div>
                    )}
                    {!resultImage && !isLoading && (
                        <div className="text-center text-gray-500 dark:text-gray-600">
                            <TikTokIcon className="w-16 h-16 mx-auto" />
                            <p>Output kandungan anda akan muncul di sini.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        {children}
    </div>
);

export default TiktokAffiliateView;