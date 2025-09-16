import React, { useState } from 'react';
import { MicIcon, DownloadIcon } from '../Icons';
import { generateVoiceOver } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';

// FIX: Update voice actors with valid IDs for the gemini-2.5-flash-preview-tts model.
const voiceActors = [
    { id: 'Puck', name: 'Puck', language: 'Inggeris', gender: 'Lelaki' },
    { id: 'Kore', name: 'Kore', language: 'Inggeris', gender: 'Perempuan' },
    { id: 'Chant', name: 'Chant', language: 'Inggeris', gender: 'Lelaki' },
    { id: 'Chipmunk', name: 'Chipmunk', language: 'Inggeris', gender: 'Unisex' },
    { id: 'Drake', name: 'Drake', language: 'Inggeris', gender: 'Lelaki' },
    { id: 'Duke', name: 'Duke', language: 'Inggeris', gender: 'Lelaki' },
    { id: 'Echo', name: 'Echo', language: 'Inggeris', gender: 'Unisex' },
    { id: 'Luna', name: 'Luna', language: 'Inggeris', gender: 'Perempuan' },
    { id: 'Nova', name: 'Nova', language: 'Inggeris', gender: 'Perempuan' },
    { id: 'Orion', name: 'Orion', language: 'Inggeris', gender: 'Lelaki' },
];


const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">{title}</h3>
        {children}
    </div>
);

const SliderControl: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  displayValue: string;
  unit: string;
}> = ({ label, value, min, max, step, onChange, displayValue, unit }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {label} ({displayValue}{unit})
    </label>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={onChange}
      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
    />
  </div>
);


const VoiceStudioView: React.FC = () => {
    const [script, setScript] = useState('');
    const [selectedActor, setSelectedActor] = useState(voiceActors[0].id);
    const [speed, setSpeed] = useState(1.0);
    const [pitch, setPitch] = useState(0.0);
    const [volume, setVolume] = useState(0.0);
    const [isLoading, setIsLoading] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const groupedActors = voiceActors.reduce((acc, actor) => {
        const groupKey = `${actor.language} - ${actor.gender}`;
        (acc[groupKey] = acc[groupKey] || []).push(actor);
        return acc;
    }, {} as Record<string, typeof voiceActors>);

    const handleGenerate = async () => {
        if (!script.trim()) {
            setError("Sila masukkan skrip untuk alih suara.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setAudioUrl(null);

        try {
            const resultUrl = await generateVoiceOver(script, selectedActor, speed, pitch, volume);
            setAudioUrl(resultUrl);
            await addHistoryItem({
                type: 'Audio',
                prompt: `Studio Suara (${selectedActor}): ${script.substring(0, 50)}...`,
                result: resultUrl
            });
        } catch (e) {
            console.error(e);
            const errorMessage = e instanceof Error ? e.message : "Gagal menjana alih suara. Sila cuba lagi.";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        if (!audioUrl) return;
        const link = document.createElement('a');
        link.href = audioUrl;
        link.download = `1za7-ai-audio-${Date.now()}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
            {/* Left Panel */}
            <div className="flex flex-col gap-5 overflow-y-auto pr-2 custom-scrollbar">
                <h1 className="text-3xl font-bold">Jana Audio</h1>
                <p className="text-gray-500 dark:text-gray-400 -mt-3">Ubah teks menjadi audio berkualiti tinggi dengan pelbagai pilihan suara.</p>
                
                <Section title="1. Tulis Skrip Anda">
                    <div className="relative h-48">
                        <textarea
                            value={script}
                            onChange={(e) => setScript(e.target.value)}
                            placeholder="Taip atau tampal skrip alih suara anda di sini..."
                            className="w-full h-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-4 resize-none focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                        />
                        <span className="absolute bottom-3 right-3 text-xs text-gray-500">{script.length} aksara</span>
                    </div>
                </Section>
                
                <Section title="2. Pilih Pelakon Suara">
                    <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                        {Object.entries(groupedActors).map(([group, actors]) => (
                            <div key={group}>
                                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">{group}</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {actors.map(actor => (
                                         <button key={actor.id} onClick={() => setSelectedActor(actor.id)} className={`p-3 rounded-lg text-left transition-colors text-sm ${selectedActor === actor.id ? 'bg-primary-500/20 ring-2 ring-primary-500' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                                            <p className={`font-semibold ${selectedActor === actor.id ? 'text-primary-400' : 'text-gray-900 dark:text-white'}`}>{actor.name}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>
                
                <Section title="3. Tetapan Lanjutan">
                    <div className="space-y-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
                        <SliderControl
                          label="Kelajuan Suara"
                          value={speed}
                          min={0.5} max={2.0} step={0.01}
                          onChange={(e) => setSpeed(parseFloat(e.target.value))}
                          displayValue={speed.toFixed(2)}
                          unit="x"
                        />
                        <SliderControl
                          label="Pitch"
                          value={pitch}
                          min={-20} max={20} step={0.1}
                          onChange={(e) => setPitch(parseFloat(e.target.value))}
                          displayValue={pitch.toFixed(1)}
                          unit=""
                        />
                        <SliderControl
                          label="Volume"
                          value={volume}
                          min={-96} max={16} step={0.1}
                          onChange={(e) => setVolume(parseFloat(e.target.value))}
                          displayValue={volume.toFixed(1)}
                          unit="dB"
                        />
                    </div>
                </Section>

                <button
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="w-full mt-2 flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Spinner/> : 'Jana Alih Suara'}
                </button>
            </div>

            {/* Right Panel */}
             <div className="bg-white dark:bg-black rounded-lg flex flex-col p-4">
                <h2 className="text-xl font-bold mb-4">Output</h2>
                <div className="flex-1 flex items-center justify-center bg-gray-200 dark:bg-gray-900/50 rounded-md p-4">
                    {isLoading ? (
                        <div className="text-center">
                           <Spinner />
                           <p className="mt-4 text-gray-500 dark:text-gray-400">Menjana audio...</p>
                        </div>
                    ) : audioUrl ? (
                        <div className="w-full space-y-4">
                            <audio controls src={audioUrl} className="w-full">
                                Penyemak imbas anda tidak menyokong elemen audio.
                            </audio>
                            <button 
                                onClick={handleDownload}
                                className="w-full flex items-center justify-center gap-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-semibold py-2 px-3 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
                            >
                                <DownloadIcon className="w-4 h-4"/> Muat Turun Audio
                            </button>
                        </div>
                    ) : error ? (
                        <div className="text-center text-red-500 dark:text-red-400">
                             <p className="font-semibold">Penjanaan Gagal</p>
                             <p className="text-xs mt-2">{error}</p>
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 dark:text-gray-600">
                            <MicIcon className="w-16 h-16 mx-auto" />
                            <p className="mt-2">Output Audio Anda akan muncul di sini.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VoiceStudioView;