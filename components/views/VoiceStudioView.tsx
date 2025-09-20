import React, { useState, useEffect } from 'react';
import { MicIcon, DownloadIcon } from '../Icons';
import { generateVoiceOver } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { sendToTelegram } from '../../services/telegramService';
import TwoColumnLayout from '../common/TwoColumnLayout';

const voiceActors = [
    { id: 'Puck', name: 'Puck', language: 'English', gender: 'Male' },
    { id: 'Kore', name: 'Kore', language: 'English', gender: 'Female' },
    { id: 'Chant', name: 'Chant', language: 'English', gender: 'Male' },
    { id: 'Chipmunk', name: 'Chipmunk', language: 'English', gender: 'Unisex' },
    { id: 'Drake', name: 'Drake', language: 'English', gender: 'Male' },
    { id: 'Duke', name: 'Duke', language: 'English', gender: 'Male' },
    { id: 'Echo', name: 'Echo', language: 'English', gender: 'Unisex' },
    { id: 'Luna', name: 'Luna', language: 'English', gender: 'Female' },
    { id: 'Nova', name: 'Nova', language: 'English', gender: 'Female' },
    { id: 'Orion', name: 'Orion', language: 'English', gender: 'Male' },
];


const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
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

const triggerDownload = (data: Blob, fileNameBase: string) => {
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileNameBase}-${Date.now()}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up immediately
};


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

    // Cleanup object URLs to prevent memory leaks
    useEffect(() => {
        return () => {
        if (audioUrl && audioUrl.startsWith('blob:')) {
            URL.revokeObjectURL(audioUrl);
        }
        };
    }, [audioUrl]);

    const handleGenerate = async () => {
        if (!script.trim()) {
            setError("A script is required to generate a voice-over.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setAudioUrl(null);

        try {
            const resultBlob = await generateVoiceOver(script, selectedActor, speed, pitch, volume);
            triggerDownload(resultBlob, `monoklix-voiceover-${selectedActor}`);
            
            const resultUrl = URL.createObjectURL(resultBlob);
            setAudioUrl(resultUrl);
            
            await addHistoryItem({
                type: 'Audio',
                prompt: `Voice Studio (${selectedActor}): ${script.substring(0, 50)}...`,
                result: resultBlob // Save the Blob itself for persistence
            });
            sendToTelegram(resultUrl, 'audio', `Voice Studio (${selectedActor}):\n\n${script.substring(0, 900)}...`);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
            console.error("Generation failed:", e);
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        if (!audioUrl) return;
        const link = document.createElement('a');
        link.href = audioUrl;
        link.download = `monoklix-audio-${Date.now()}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const leftPanel = (
        <>
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">Generate Audio</h1>
              <p className="text-neutral-500 dark:text-neutral-400 mt-1">Turn text into high-quality audio with a variety of voices.</p>
            </div>
            
            <Section title="1. Write Your Script">
                <div className="relative h-48">
                    <textarea
                        value={script}
                        onChange={(e) => setScript(e.target.value)}
                        placeholder="Type or paste your voice-over script here..."
                        className="w-full h-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-4 resize-none focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                    />
                    <span className="absolute bottom-3 right-3 text-xs text-gray-500">{script.length} characters</span>
                </div>
            </Section>
            
            <Section title="2. Select Voice Actor">
                <select
                    value={selectedActor}
                    onChange={(e) => setSelectedActor(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                >
                    {Object.entries(groupedActors).map(([group, actors]) => (
                        <optgroup key={group} label={group}>
                            {actors.map(actor => (
                                <option key={actor.id} value={actor.id}>
                                    {actor.name}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </Section>
            
            <Section title="3. Advanced Settings">
                <div className="space-y-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
                    <SliderControl
                      label="Speech Speed"
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

            <div className="pt-4 mt-auto">
                <button
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Spinner/> : 'Generate Voice Over'}
                </button>
                 {error && <p className="text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
            </div>
        </>
    );

    const rightPanel = (
        <>
            {isLoading ? (
                <div className="text-center">
                   <Spinner />
                   <p className="mt-4 text-neutral-500 dark:text-neutral-400">Generating audio...</p>
                </div>
            ) : audioUrl ? (
                <div className="w-full space-y-4">
                    <audio controls src={audioUrl} className="w-full">
                        Your browser does not support the audio element.
                    </audio>
                    <button 
                        onClick={handleDownload}
                        className="w-full flex items-center justify-center gap-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold py-2 px-3 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                    >
                        <DownloadIcon className="w-4 h-4"/> Download Audio
                    </button>
                </div>
            ) : error ? (
                <div className="text-center text-red-500 dark:text-red-400">
                     <p className="font-semibold">Generation Failed</p>
                     <p className="text-xs mt-2">{error}</p>
                </div>
            ) : (
                <div className="text-center text-neutral-500 dark:text-neutral-600">
                    <MicIcon className="w-16 h-16 mx-auto" />
                    <p className="mt-2">Your Audio Output Will Appear Here.</p>
                </div>
            )}
        </>
    );

    return <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} />;
};

export default VoiceStudioView;