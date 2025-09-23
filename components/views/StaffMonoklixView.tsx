import React, { useState, useCallback, useMemo } from 'react';
import { generateText } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import MarkdownRenderer from '../common/MarkdownRenderer';
import {
    UserIcon, SmileyIcon, LightbulbIcon, FileTextIcon, ClipboardListIcon, TrendingUpIcon, StoreIcon, MegaphoneIcon, FilmIcon, UsersIcon, ImageIcon, GalleryIcon, DownloadIcon, ClipboardIcon, CheckCircleIcon, AIAgentIcon
} from '../Icons';
import TwoColumnLayout from '../common/TwoColumnLayout';
import { getStaffMonoklixPrompt } from '../../services/promptManager';

interface AiAgent {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
}

const aiAgents: AiAgent[] = [
    { id: 'karim', name: 'Karim', description: 'Ideal Customer Persona', icon: UserIcon, placeholder: 'Nyatakan produk/servis anda...' },
    { id: 'lina', name: 'Lina', description: 'Fear & Desire', icon: SmileyIcon, placeholder: 'Nyatakan produk/servis anda...' },
    { id: 'ali', name: 'Ali', description: 'Marketing Angle', icon: LightbulbIcon, placeholder: 'Nyatakan produk/servis anda...' },
    { id: 'aminah', name: 'Aminah', description: 'Copywriter', icon: FileTextIcon, placeholder: 'Nyatakan produk/servis anda...' },
    { id: 'hassan', name: 'Hassan', description: 'Variasi Copywriting', icon: ClipboardListIcon, placeholder: 'Masukkan teks jualan asal anda...' },
    { id: 'siti', name: 'Siti', description: 'Formula Copywriting (AIDA)', icon: TrendingUpIcon, placeholder: 'Nyatakan produk/servis anda...' },
    { id: 'alex', name: 'Alex', description: 'Sales Page Creator', icon: StoreIcon, placeholder: 'Nyatakan produk/servis anda...' },
    { id: 'alia', name: 'Alia', description: 'Headline Brainstormer', icon: MegaphoneIcon, placeholder: 'Nyatakan produk/servis anda...' },
    { id: 'haslam', name: 'Haslam', description: 'Script Writer', icon: FilmIcon, placeholder: 'Nyatakan produk/servis anda...' },
    { id: 'luqman', name: 'Luqman', description: 'LinkedIn Personal Branding', icon: UsersIcon, placeholder: 'Nyatakan platform dan topik. Cth: LinkedIn, Topik: Pentingnya personal branding' },
    { id: 'davinci', name: 'Da Vinci', description: 'Image Prompter', icon: ImageIcon, placeholder: 'Cth: Tema: Kucing comel, Gaya: Realistik, Elemen: Kucing sedang tidur atas sofa.' },
    { id: 'izzad', name: 'Izzad', description: 'Poster Prompter', icon: GalleryIcon, placeholder: 'Cth: Tujuan: Iklan event, Gaya: Moden, Teks: Jualan Hebat, Warna: Merah.' }
];

const languages = ["English", "Bahasa Malaysia", "Chinese"];

const downloadText = (text: string, fileName: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const StaffMonoklixView: React.FC = () => {
    const [selectedAgentId, setSelectedAgentId] = useState<string>('karim');
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedCopy, setGeneratedCopy] = useState<string>('');
    const [copied, setCopied] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState(languages[1]); // Default to Bahasa Malaysia

    const selectedAgent = useMemo(() => aiAgents.find(agent => agent.id === selectedAgentId)!, [selectedAgentId]);

    const handleGenerate = useCallback(async () => {
        if (!userInput.trim()) {
            setError(`Please provide input for ${selectedAgent.name}.`);
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedCopy('');
        setCopied(false);

        const finalPrompt = getStaffMonoklixPrompt({
            agentId: selectedAgent.id,
            userInput: userInput,
            language: selectedLanguage,
        });

        try {
            const result = await generateText(finalPrompt);
            setGeneratedCopy(result);
            await addHistoryItem({
                type: 'Copy',
                prompt: `Staff MONOklix (${selectedAgent.name}): ${userInput.substring(0, 50)}... (Lang: ${selectedLanguage})`,
                result: result,
            });
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [userInput, selectedAgent, selectedLanguage]);

    const handleCopy = () => {
        if (!generatedCopy) return;
        navigator.clipboard.writeText(generatedCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const leftPanel = (
        <>
            <div>
                <h1 className="text-2xl font-bold sm:text-3xl">Staff MONOklix</h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1">Select an AI Agent to help you with your task.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {aiAgents.map(agent => {
                    const isSelected = agent.id === selectedAgentId;
                    return (
                        <button
                            key={agent.id}
                            onClick={() => {
                                setSelectedAgentId(agent.id);
                                setUserInput('');
                            }}
                            className={`p-4 rounded-lg text-center border-2 transition-all duration-200 ${
                                isSelected 
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md transform scale-105' 
                                : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 hover:border-neutral-400 dark:hover:border-neutral-500'
                            }`}
                        >
                            <agent.icon className={`w-6 h-6 mx-auto mb-2 ${isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-500'}`} />
                            <p className={`font-bold text-sm ${isSelected ? 'text-primary-700 dark:text-white' : 'text-neutral-800 dark:text-neutral-200'}`}>{agent.name}</p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">{agent.description}</p>
                        </button>
                    )
                })}
            </div>

            <div>
                <label htmlFor="agent-input" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Input for {selectedAgent.name}
                </label>
                <textarea
                    id="agent-input"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder={selectedAgent.placeholder}
                    rows={6}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                />
            </div>

            <div>
                <label htmlFor="agent-language" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Output Language
                </label>
                <select
                    id="agent-language"
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                >
                    {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                </select>
            </div>
            
            <div className="pt-4 mt-auto">
                <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Spinner /> : 'Generate'}
                </button>
                {error && <p className="text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
            </div>
        </>
    );

     const rightPanel = (
        <>
             {generatedCopy && !isLoading && (
                <div className="absolute top-3 right-3 flex gap-2 z-10">
                    <button 
                      onClick={handleCopy}
                      className="flex items-center gap-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                    >
                      {copied ? <CheckCircleIcon className="w-4 h-4 text-green-500"/> : <ClipboardIcon className="w-4 h-4"/>}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                        onClick={() => downloadText(generatedCopy, `monoklix-staff-${selectedAgent.id}.txt`)}
                        className="flex items-center gap-1.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold py-1.5 px-3 rounded-full hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                    >
                        <DownloadIcon className="w-4 h-4" /> Download
                    </button>
                </div>
            )}
             {isLoading ? (
                <div className="flex items-center justify-center h-full text-center">
                    <div>
                        <Spinner />
                        <p className="mt-4 text-neutral-500 dark:text-neutral-400">Generating...</p>
                    </div>
                </div>
            ) : generatedCopy ? (
                <div className="w-full h-full overflow-y-auto pr-2 custom-scrollbar">
                     <MarkdownRenderer content={generatedCopy} />
                </div>
            ) : (
                 <div className="flex items-center justify-center h-full text-center text-neutral-500 dark:text-neutral-600 p-4">
                    <div>
                        <AIAgentIcon className="w-16 h-16 mx-auto" />
                        <p>Your AI-generated content will appear here.</p>
                    </div>
                </div>
            )}
        </>
    );

    return <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} />;
};

export default StaffMonoklixView;