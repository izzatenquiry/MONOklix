import React, { useState, useCallback } from 'react';
import { generateContentWithGoogleSearch } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { type GenerateContentResponse } from '@google/genai';
import { TrendingUpIcon } from '../Icons';
import { sendToTelegram } from '../../services/telegramService';

const ContentIdeasView: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [response, setResponse] = useState<GenerateContentResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = useCallback(async () => {
        if (!topic.trim()) {
            setError("Please enter a topic or niche.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setResponse(null);

        const prompt = `
            Generate a list of 5 engaging content ideas (e.g., blog posts, social media updates, video scripts) for the following topic: "${topic}".
            The ideas should be trendy, relevant, and aimed at capturing audience attention. For each idea, provide a catchy title and a brief description of the concept.
        `;

        try {
            const result = await generateContentWithGoogleSearch(prompt);
            setResponse(result);
            await addHistoryItem({
                type: 'Copy',
                prompt: `Content Ideas for: ${topic}`,
                result: result.text,
            });
            sendToTelegram(`*Content Ideas for "${topic}"*:\n\n${result.text}`, 'text');
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
            console.error("Generation failed:", e);
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [topic]);

    const groundingChunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
            {/* Left Panel: Controls */}
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm flex flex-col gap-5">
                <h1 className="text-3xl font-bold">AI Content Idea Generator</h1>
                <p className="text-gray-500 dark:text-gray-400 -mt-3">Get trendy and relevant content ideas for any topic, powered by Google Search.</p>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="topic-input" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Enter your topic or niche</label>
                        <input
                            id="topic-input"
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g., Sustainable fashion, home cooking, AI technology"
                            className="w-full bg-white dark:bg-gray-700/60 border border-gray-300 dark:border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                        />
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Spinner /> : 'Generate Ideas'}
                    </button>
                    {error && <p className="text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
                </div>
            </div>

            {/* Right Panel: Output */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg flex flex-col p-4 shadow-sm">
                <h2 className="text-xl font-bold mb-4">Output</h2>
                <div className="flex-1 bg-neutral-100 dark:bg-neutral-800/50 rounded-md p-4 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full text-center">
                             <div>
                                <Spinner />
                                <p className="mt-4 text-neutral-500 dark:text-neutral-400">Searching for ideas...</p>
                            </div>
                        </div>
                    ) : response ? (
                        <div>
                            <MarkdownRenderer content={response.text} />
                            {groundingChunks && groundingChunks.length > 0 && (
                                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Sources:</h4>
                                    <ul className="space-y-1 list-disc list-inside">
                                        {groundingChunks.map((chunk, index) => (
                                            chunk.web && (
                                                <li key={index} className="text-sm">
                                                    <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">
                                                        {chunk.web.title || chunk.web.uri}
                                                    </a>
                                                </li>
                                            )
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-center text-neutral-500 dark:text-neutral-600">
                            <div>
                                <TrendingUpIcon className="w-16 h-16 mx-auto" />
                                <p>Your brilliant content ideas will appear here.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContentIdeasView;