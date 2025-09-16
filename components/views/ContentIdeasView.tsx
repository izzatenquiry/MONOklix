import React, { useState, useCallback } from 'react';
import { generateContentWithGoogleSearch } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { type GenerateContentResponse } from '@google/genai';
import { TrendingUpIcon } from '../Icons';

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
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center">
                <h2 className="text-3xl font-bold">AI Content Idea Generator</h2>
                <p className="text-gray-500 dark:text-gray-400">Get trendy and relevant content ideas for any topic, powered by Google Search.</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl shadow-lg space-y-4">
                <div className="space-y-2">
                    <label htmlFor="topic-input" className="block text-sm font-medium text-gray-600 dark:text-gray-400">Enter your topic or niche</label>
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
            </div>

            {error && <p className="text-red-500 dark:text-red-400 text-center">{error}</p>}

            {(isLoading || response) && (
                <div className="mt-6 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl">
                    <h3 className="text-xl font-semibold mb-4">Generated Ideas</h3>
                    {isLoading ? (
                        <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
                            <Spinner />
                            <p>Searching for the latest trends and ideas...</p>
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
                    ) : null}
                </div>
            )}
            
            {!isLoading && !response && !error && (
                 <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                    <TrendingUpIcon className="w-16 h-16 mx-auto" />
                    <p className="mt-2">Your brilliant content ideas will appear here.</p>
                </div>
            )}
        </div>
    );
};

export default ContentIdeasView;