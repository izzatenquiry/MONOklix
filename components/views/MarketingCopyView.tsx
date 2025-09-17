import React, { useState, useCallback } from 'react';
import { generateText } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { MegaphoneIcon, DownloadIcon } from '../Icons';
import { sendToTelegram } from '../../services/telegramService';

const tones = ["Professional", "Casual", "Witty", "Persuasive", "Empathetic", "Bold"];

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

const MarketingCopyView: React.FC = () => {
    const [productDetails, setProductDetails] = useState('');
    const [targetAudience, setTargetAudience] = useState('');
    const [keywords, setKeywords] = useState('');
    const [selectedTone, setSelectedTone] = useState(tones[0]);
    const [generatedCopy, setGeneratedCopy] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = useCallback(async () => {
        if (!productDetails.trim()) {
            setError("Please provide product/service details.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedCopy('');

        const prompt = `
            You are an expert marketing copywriter. Generate compelling marketing copy based on the following details.

            **Product/Service Details:**
            ${productDetails}

            **Target Audience:**
            ${targetAudience || 'General Audience'}

            **Tone of Voice:**
            ${selectedTone}

            **Keywords to include:**
            ${keywords || 'None'}

            The copy should be engaging, persuasive, and ready for use in social media posts, advertisements, or website content. Structure the output clearly, perhaps with a headline and body.
        `;

        try {
            const result = await generateText(prompt);
            setGeneratedCopy(result);
            // Automatically save to history
            await addHistoryItem({
                type: 'Copy',
                prompt: `Marketing Copy for: ${productDetails.substring(0, 50)}...`,
                result: result,
            });
            sendToTelegram(`*Marketing Copy for "${productDetails.substring(0, 50)}..."*:\n\n${result}`, 'text');
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
            console.error("Generation failed:", e);
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [productDetails, targetAudience, keywords, selectedTone]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
            {/* Left Panel: Controls */}
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm flex flex-col gap-5 overflow-y-auto pr-4 custom-scrollbar">
                <h1 className="text-3xl font-bold">Generate Marketing Copy</h1>
                <p className="text-gray-500 dark:text-gray-400 -mt-3">Create powerful marketing text with just a few inputs.</p>

                <div>
                    <label htmlFor="product-details" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Product/Service Details</label>
                    <textarea
                        id="product-details"
                        value={productDetails}
                        onChange={(e) => setProductDetails(e.target.value)}
                        placeholder="e.g., A high-performance electric scooter with a 50-mile range and a sleek, foldable design."
                        rows={5}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                    />
                </div>

                <div>
                    <label htmlFor="target-audience" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Target Audience</label>
                    <input
                        id="target-audience"
                        type="text"
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                        placeholder="e.g., Urban commuters, tech enthusiasts, students"
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                    />
                </div>

                <div>
                    <label htmlFor="keywords" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Keywords (comma-separated)</label>
                    <input
                        id="keywords"
                        type="text"
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                        placeholder="e.g., eco-friendly, fast, portable"
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                    />
                </div>

                <div>
                    <label htmlFor="tone" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Tone of Voice</label>
                    <select
                        id="tone"
                        value={selectedTone}
                        onChange={(e) => setSelectedTone(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                    >
                        {tones.map(tone => <option key={tone} value={tone}>{tone}</option>)}
                    </select>
                </div>

                <div className="pt-2">
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Spinner /> : 'Generate Copy'}
                    </button>
                    {error && <p className="text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
                </div>
            </div>

            {/* Right Panel: Results */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg flex flex-col p-4 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Output</h2>
                    {generatedCopy && !isLoading && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => navigator.clipboard.writeText(generatedCopy)}
                                className="text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold py-1.5 px-3 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                Copy
                            </button>
                            <button
                                onClick={() => downloadText(generatedCopy, `1za7-marketing-copy-${Date.now()}.txt`)}
                                className="flex items-center gap-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold py-1.5 px-3 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                <DownloadIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
                <div className="flex-1 bg-neutral-100 dark:bg-neutral-800/50 rounded-md p-4 overflow-y-auto">
                     {isLoading ? (
                        <div className="flex items-center justify-center h-full text-center">
                            <div>
                                <Spinner />
                                <p className="mt-4 text-neutral-500 dark:text-neutral-400">Crafting your copy...</p>
                            </div>
                        </div>
                    ) : generatedCopy ? (
                        <div className="prose dark:prose-invert max-w-none text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                            {generatedCopy}
                        </div>
                    ) : (
                         <div className="flex items-center justify-center h-full text-center text-neutral-500 dark:text-neutral-600 p-4">
                            <div>
                                <MegaphoneIcon className="w-16 h-16 mx-auto" />
                                <p>Your output will appear here.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MarketingCopyView;