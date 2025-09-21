import React, { useState, useEffect, useCallback } from 'react';
import { getHistory, deleteHistoryItem, clearHistory } from '../../services/historyService';
import { type HistoryItem } from '../../types';
import { ImageIcon, VideoIcon, DownloadIcon, TrashIcon, PlayIcon, FileTextIcon, AudioIcon, WandIcon } from '../Icons';
import Tabs, { type Tab } from '../common/Tabs';

interface VideoGenPreset {
  prompt: string;
  image: { base64: string; mimeType: string; };
}

interface ImageEditPreset {
  base64: string;
  mimeType: string;
}

interface GalleryViewProps {
  onCreateVideo: (preset: VideoGenPreset) => void;
  onReEdit: (preset: ImageEditPreset) => void;
}

type GalleryTabId = 'images' | 'videos' | 'history';

const GalleryView: React.FC<GalleryViewProps> = ({ onCreateVideo, onReEdit }) => {
    const [allItems, setAllItems] = useState<HistoryItem[]>([]);
    const [activeTab, setActiveTab] = useState<GalleryTabId>('images');
    const [blobUrls, setBlobUrls] = useState<Map<string, string>>(new Map());

    const refreshHistory = useCallback(async () => {
        const history = await getHistory();
        setAllItems(history);
    }, []);

    useEffect(() => {
        refreshHistory();
    }, [refreshHistory]);

    // Effect to create and revoke blob URLs for persistent display
    useEffect(() => {
        const newUrls = new Map<string, string>();
        allItems.forEach(item => {
            if (item.result instanceof Blob) {
                const url = URL.createObjectURL(item.result);
                newUrls.set(item.id, url);
            }
        });
        setBlobUrls(newUrls);

        // Cleanup function to revoke URLs when the component unmounts or items change
        return () => {
            newUrls.forEach(url => URL.revokeObjectURL(url));
        };
    }, [allItems]);
    
    const getDisplayUrl = (item: HistoryItem): string => {
        if (item.type === 'Image' || item.type === 'Canvas') {
            return `data:image/png;base64,${item.result as string}`;
        }
        if (item.result instanceof Blob) {
            return blobUrls.get(item.id) || '';
        }
        // Fallback for potentially invalid, old string-based blob URLs
        return item.result as string;
    };
    
    const downloadAsset = (item: HistoryItem) => {
        const link = document.createElement('a');
        let fileName: string;
        let href: string | null = null;
        let shouldRevoke = false; // Flag to revoke object URLs created just for download
    
        switch (item.type) {
            case 'Image':
            case 'Canvas':
                fileName = `monoklix-${item.type.toLowerCase()}-${item.id}.png`;
                href = `data:image/png;base64,${item.result}`;
                break;
            case 'Video':
            case 'Audio':
                const extension = item.type === 'Video' ? 'mp4' : 'mp3';
                fileName = `monoklix-${item.type.toLowerCase()}-${item.id}.${extension}`;
                href = blobUrls.get(item.id) || null;
                // If the URL isn't in state (rare), create it temporarily
                if (!href && item.result instanceof Blob) {
                    href = URL.createObjectURL(item.result);
                    shouldRevoke = true;
                }
                break;
            case 'Storyboard':
            case 'Copy':
                fileName = `monoklix-${item.type.toLowerCase()}-${item.id}.txt`;
                const blob = new Blob([item.result as string], { type: 'text/plain;charset=utf-8' });
                href = URL.createObjectURL(blob);
                shouldRevoke = true;
                break;
            default:
                return;
        }
    
        if (!href) return;
    
        link.href = href;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (shouldRevoke && href.startsWith('blob:')) {
            URL.revokeObjectURL(href);
        }
    };


    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this item from your history?")) {
            await deleteHistoryItem(id);
            await refreshHistory();
        }
    };
    
    const handleClearHistory = async () => {
        if (window.confirm("Are you sure you want to delete all generation history? This action cannot be undone.")) {
            await clearHistory();
            await refreshHistory();
        }
    };

    const getIconForType = (type: HistoryItem['type']) => {
        switch(type) {
            case 'Image':
            case 'Canvas':
                return <ImageIcon className="w-5 h-5"/>
            case 'Video':
                return <VideoIcon className="w-5 h-5"/>
            case 'Audio':
                return <AudioIcon className="w-5 h-5"/>
            case 'Copy':
            case 'Storyboard':
                return <FileTextIcon className="w-5 h-5"/>
            default:
                return <FileTextIcon className="w-5 h-5"/>
        }
    }
    
    const imageItems = allItems.filter(item => item.type === 'Image' || item.type === 'Canvas');
    const videoItems = allItems.filter(item => item.type === 'Video');
    const itemsToDisplay = activeTab === 'images' ? imageItems : videoItems;

    const tabs: Tab<GalleryTabId>[] = [
        { id: 'images', label: 'Images', count: imageItems.length },
        { id: 'videos', label: 'Videos', count: videoItems.length },
        { id: 'history', label: 'History', count: allItems.length },
    ];


    const renderGridItem = (item: HistoryItem) => {
        const isImage = item.type === 'Image' || item.type === 'Canvas';
        const isVideo = item.type === 'Video';
        const displayUrl = getDisplayUrl(item);

        return (
            <div key={item.id} className="group relative aspect-square bg-neutral-200 dark:bg-neutral-800 rounded-lg overflow-hidden shadow-md">
                {isImage && <img src={displayUrl} alt={item.prompt} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />}
                {isVideo && displayUrl && (
                    <div className="w-full h-full flex items-center justify-center">
                        <video src={displayUrl} className="w-full h-full object-cover" loop muted playsInline title={item.prompt}/>
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <PlayIcon className="w-12 h-12 text-white/80" />
                        </div>
                    </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                    <p className="text-white text-xs line-clamp-3 drop-shadow-md">{item.prompt}</p>
                    <div className="flex justify-end gap-2">
                        {isImage && (
                          <>
                            <button
                                onClick={() => onReEdit({ base64: item.result as string, mimeType: 'image/png' })}
                                className="p-2 bg-purple-600/80 text-white rounded-full hover:bg-purple-600 transition-colors transform hover:scale-110"
                                title="Re-edit Image"
                            >
                                <WandIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => onCreateVideo({ prompt: item.prompt, image: { base64: item.result as string, mimeType: 'image/png' } })}
                                className="p-2 bg-primary-600/80 text-white rounded-full hover:bg-primary-600 transition-colors transform hover:scale-110"
                                title="Create Video"
                            >
                                <VideoIcon className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                            onClick={() => downloadAsset(item)}
                            className="p-2 bg-white/80 text-black rounded-full hover:bg-white transition-colors transform hover:scale-110"
                            title="Download"
                        >
                            <DownloadIcon className="w-4 h-4" />
                        </button>
                         <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 bg-red-500/80 text-white rounded-full hover:bg-red-500 transition-colors transform hover:scale-110"
                            title="Delete"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    };
    
    const renderContent = () => {
        if (activeTab === 'history') {
            return (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Full History</h2>
                        {allItems.length > 0 && (
                            <button onClick={handleClearHistory} className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 font-semibold">
                                <TrashIcon className="w-4 h-4" />
                                Clear All History
                            </button>
                        )}
                    </div>
                    {allItems.length === 0 ? (
                         <div className="flex items-center justify-center min-h-[400px] text-center text-neutral-500 dark:text-neutral-400">
                             <div>
                                <p className="font-semibold">Your Generation History is Empty</p>
                                <p className="text-sm">Start generating content and it will appear here.</p>
                             </div>
                         </div>
                    ) : (
                        <div className="space-y-3 max-h-[calc(100vh-22rem)] overflow-y-auto pr-2 custom-scrollbar">
                            {allItems.map(item => {
                                const displayUrl = getDisplayUrl(item);
                                return (
                                <div key={item.id} className="bg-white dark:bg-neutral-900/50 p-3 rounded-lg flex items-center gap-4 shadow-sm border border-neutral-200 dark:border-neutral-800">
                                    <div className="text-neutral-500 dark:text-neutral-400">{getIconForType(item.type)}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-primary-600 dark:text-primary-400 text-sm">{item.type}</p>
                                        <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-1 truncate" title={item.prompt}>{item.prompt}</p>
                                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">{new Date(item.timestamp).toLocaleString()}</p>
                                    </div>
                                    <div className="w-20 h-20 bg-neutral-200 dark:bg-neutral-800 rounded-md flex-shrink-0 flex items-center justify-center">
                                        {item.type === 'Image' || item.type === 'Canvas' ? (
                                            <img src={displayUrl} alt="Generated content" className="w-full h-full object-cover rounded-md"/>
                                        ) : item.type === 'Video' || item.type === 'Audio' ? (
                                            <a href={displayUrl} target="_blank" rel="noopener noreferrer" className="text-primary-500">
                                                <PlayIcon className="w-8 h-8" />
                                            </a>
                                        ) : (
                                            <FileTextIcon className="w-8 h-8 text-neutral-500" />
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                         <button onClick={() => downloadAsset(item)} className="p-2 text-neutral-400 hover:text-primary-500" title="Download">
                                            <DownloadIcon className="w-4 h-4"/>
                                        </button>
                                        <button onClick={() => handleDelete(item.id)} className="p-2 text-neutral-400 hover:text-red-500" title="Delete">
                                            <TrashIcon className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </div>
                            )})}
                        </div>
                    )}
                </div>
            );
        }

        if (itemsToDisplay.length > 0) {
            return (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-h-[calc(100vh-20rem)] overflow-y-auto pr-2 custom-scrollbar">
                    {itemsToDisplay.map(renderGridItem)}
                </div>
            );
        }

        return (
            <div className="flex items-center justify-center min-h-[400px] text-center text-neutral-500 dark:text-neutral-400">
                <div>
                    <div className="inline-block p-4 bg-neutral-100 dark:bg-neutral-800/50 rounded-full mb-4">
                        {activeTab === 'images' ? <ImageIcon className="w-10 h-10" /> : <VideoIcon className="w-10 h-10" />}
                    </div>
                    <p className="font-semibold">Your {activeTab === 'images' ? 'Image' : 'Video'} Gallery is Empty</p>
                    <p className="text-sm">Start generating content and it will appear here.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold sm:text-3xl">Gallery & History</h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1">Browse, download, or reuse all the content you've generated.</p>
            </div>
            
            <div className="flex justify-center">
                <Tabs 
                    tabs={tabs}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />
            </div>

            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm">
                {renderContent()}
            </div>
        </div>
    );
};

export default GalleryView;