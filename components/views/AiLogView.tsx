import React, { useState, useEffect, useCallback } from 'react';
import { getLogs, clearLogs } from '../../services/aiLogService';
import { type AiLogItem } from '../../types';
import { ClipboardListIcon, TrashIcon, AudioIcon } from '../Icons';
import Spinner from '../common/Spinner';

const AiLogView: React.FC = () => {
    const [logs, setLogs] = useState<AiLogItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [blobUrls, setBlobUrls] = useState<Map<string, string>>(new Map());

    const refreshLogs = useCallback(async () => {
        setIsLoading(true);
        const fetchedLogs = await getLogs();
        setLogs(fetchedLogs);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        refreshLogs();
    }, [refreshLogs]);
    
    // Effect to create and revoke blob URLs for media previews
    useEffect(() => {
        const newUrls = new Map<string, string>();
        logs.forEach(log => {
            if (log.mediaOutput instanceof Blob) {
                const url = URL.createObjectURL(log.mediaOutput);
                newUrls.set(log.id, url);
            }
        });
        setBlobUrls(newUrls);

        // Cleanup function to revoke URLs when the component unmounts or logs change
        return () => {
            newUrls.forEach(url => URL.revokeObjectURL(url));
        };
    }, [logs]);

    const handleClearLogs = async () => {
        if (window.confirm("Are you sure you want to clear the entire AI log? This action cannot be undone.")) {
            await clearLogs();
            await refreshLogs();
        }
    };
    
    const renderPreview = (log: AiLogItem) => {
        const baseClasses = "w-10 h-10 object-cover rounded bg-neutral-200 dark:bg-neutral-800 flex-shrink-0";
        if (!log.mediaOutput) {
            return <div className={baseClasses}></div>;
        }
        if (typeof log.mediaOutput === 'string') { // base64 image
            return <img src={`data:image/png;base64,${log.mediaOutput}`} alt="Preview" className={baseClasses} />;
        }
        if (log.mediaOutput instanceof Blob) {
            const url = blobUrls.get(log.id);
            if (!url) return <div className={baseClasses}><Spinner /></div>;
    
            if (log.mediaOutput.type.startsWith('video/')) {
                return <video src={url} className={`${baseClasses} bg-black`} muted loop playsInline />;
            }
            if (log.mediaOutput.type.startsWith('audio/')) {
                return <div className={`${baseClasses} flex items-center justify-center`}><AudioIcon className="w-5 h-5 text-neutral-500" /></div>;
            }
        }
        return <div className={baseClasses}></div>;
    };


    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold sm:text-3xl">AI API Log</h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1">A detailed record of your recent interactions with the Gemini API.</p>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Interaction History</h2>
                    {logs.length > 0 && (
                        <button onClick={handleClearLogs} className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 font-semibold">
                            <TrashIcon className="w-4 h-4" />
                            Clear Log
                        </button>
                    )}
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center py-20"><Spinner /></div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-20 text-neutral-500 dark:text-neutral-400">
                        <ClipboardListIcon className="w-16 h-16 mx-auto mb-4" />
                        <p className="font-semibold">No Log Entries Found</p>
                        <p className="text-sm">Your interactions with the AI will be logged here automatically.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-neutral-500 dark:text-neutral-400">
                            <thead className="text-xs text-neutral-700 uppercase bg-neutral-100 dark:bg-neutral-800/50 dark:text-neutral-400">
                                <tr>
                                    <th scope="col" className="px-4 py-3">Preview</th>
                                    <th scope="col" className="px-6 py-3">Timestamp</th>
                                    <th scope="col" className="px-6 py-3">Model</th>
                                    <th scope="col" className="px-6 py-3">Prompt</th>
                                    <th scope="col" className="px-6 py-3">Output</th>
                                    <th scope="col" className="px-6 py-3 text-right">Tokens</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id} className={`border-b dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 ${log.status === 'Error' ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                                        <td className="px-4 py-3">{renderPreview(log)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                        <td className="px-6 py-4 font-mono text-xs">{log.model}</td>
                                        <td className="px-6 py-4 max-w-xs truncate" title={log.prompt}>{log.prompt}</td>
                                        <td className="px-6 py-4 max-w-xs truncate" title={log.output}>
                                            <span className={`${log.status === 'Error' ? 'text-red-500' : ''}`}>{log.output}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-xs">{log.tokenCount > 0 ? log.tokenCount.toLocaleString() : 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AiLogView;