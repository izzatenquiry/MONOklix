import React, { useState, useCallback } from 'react';
import { generateContentWithGoogleSearch } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { type GenerateContentResponse } from '@google/genai';
import { TrendingUpIcon, DownloadIcon, ClipboardIcon, CheckCircleIcon } from '../Icons';
import TwoColumnLayout from '../common/TwoColumnLayout';
import { getContentIdeasPrompt } from '../../services/promptManager';

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

const languages = ["English", "Bahasa Malaysia", "Chinese"];


const ContentIdeasView: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [response, setResponse] = useState<GenerateContentResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState(languages[1]);

    const handleGenerate = useCallback(async () => {
        if (!topic.trim()) {
            setError("Please enter a topic to generate content ideas.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setResponse(null);
        setCopied(false);

        const prompt = getContentIdeasPrompt(topic, selectedLanguage);

        try {
            const result = await generateContentWithGoogleSearch(prompt);
            setResponse(result);
            await addHistoryItem({
                type: 'Copy',
                prompt: `Content Ideas for: ${topic} (Lang: ${selectedLanguage})`,
                result: result.text,
            });
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
            console.error("Generation failed:", e);
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [topic, selectedLanguage]);

    const handleCopy = () => {
        if (!response?.text) return;
        navigator.clipboard.writeText(response.text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const leftPanel = (
        <>
            <div>
                <h1 className="text-2xl font-bold sm:text-3xl">Generate Content Ideas</h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1">Discover trending content ideas for any topic or niche.</p>
            </div>
            
            <div className="flex-1 flex flex-col justify-center gap-4">
                <div>
                    <label htmlFor="topic-input" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Topic or Niche</label>
                    <textarea
                        id="topic-input"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g., sustainable fashion, home gardening for beginners, AI in marketing"
                        rows={4}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                    />
                </div>
                <div>
                    <label htmlFor="language-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Output Language</label>
                    <select
                        id="language-select"
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                    >
                        {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                    </select>
                </div>
            </div>
            
            <div className="pt-4 mt-auto">
                <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Spinner /> : 'Generate Ideas'}
                </button>
                {error && <p className="text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
            </div>
        </>
    );

    const rightPanel = (
        <>
             {response && !isLoading && (
                <div className="absolute top-3 right-3 flex gap-2 z-10">
                     <button 
                      onClick={handleCopy}
                      className="flex items-center gap-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                    >
                      {copied ? <CheckCircleIcon className="w-4 h-4 text-green-500"/> : <ClipboardIcon className="w-4 h-4"/>}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                        onClick={() => downloadText(response.text, `1za7-content-ideas-${Date.now()}.txt`)}
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
                        <p className="mt-4 text-neutral-500 dark:text-neutral-400">Searching for trending ideas...</p>
                    </div>
                </div>
            ) : response ? (
                <div className="w-full h-full overflow-y-auto pr-2 custom-scrollbar">
                    <MarkdownRenderer content={response.text} />
                </div>
            ) : (
                 <div className="flex items-center justify-center h-full text-center text-neutral-500 dark:text-neutral-600 p-4">
                    <div>
                        <TrendingUpIcon className="w-16 h-16 mx-auto" />
                        <p>Your output will appear here.</p>
                    </div>
                </div>
            )}
        </>
    );

    return <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} />;
};

export default ContentIdeasView;