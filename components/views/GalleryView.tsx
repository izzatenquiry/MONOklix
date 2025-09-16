

import React, { useState, useEffect, useCallback } from 'react';
import { getHistory, deleteHistoryItem, clearHistory } from '../../services/historyService';
import { type HistoryItem } from '../../types';
import { ImageIcon, VideoIcon, DownloadIcon, TrashIcon, PlayIcon, FileTextIcon } from '../Icons';

interface VideoGenPreset {
  prompt: string;
  image: { base64: string; mimeType: string; };
}

interface GalleryViewProps {
  onCreateVideo: (preset: VideoGenPreset) => void;
}

const downloadAsset = (item: HistoryItem) => {
    const link = document.createElement('a');
    let fileName: string;
    let href: string;

    switch (item.type) {
        case 'Imej':
        case 'Kanvas':
            fileName = `1za7-ai-${item.type.toLowerCase()}-${item.id}.png`;
            href = `data:image/png;base64,${item.result}`;
            break;
        case 'Video':
            fileName = `1za7-ai-video-${item.id}.mp4`;
            href = item.result;
            break;
        default:
            return;
    }

    link.href = href;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


const GalleryView: React.FC<GalleryViewProps> = ({ onCreateVideo }) => {
    const [allItems, setAllItems] = useState<HistoryItem[]>([]);
    const [activeTab, setActiveTab] = useState<'images' | 'videos' | 'history'>('images');

    const refreshHistory = useCallback(async () => {
        const history = await getHistory();
        setAllItems(history);
    }, []);

    useEffect(() => {
        refreshHistory();
        const handleStorageChange = () => refreshHistory();
        // Although storage events are for other tabs, this can help sync state
        // if we decide to implement more complex cross-tab logic.
        // For now, it ensures consistency if another tab clears the history.
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [refreshHistory]);


    const handleDelete = async (id: string) => {
        if (window.confirm("Adakah anda pasti mahu memadamkan item ini dari sejarah?")) {
            await deleteHistoryItem(id);
            await refreshHistory();
        }
    };
    
    const handleClearHistory = async () => {
        if (window.confirm("Adakah anda pasti mahu memadamkan semua sejarah janaan? Tindakan ini tidak boleh diubah kembali.")) {
            await clearHistory();
            await refreshHistory();
        }
    };

    const getIconForType = (type: HistoryItem['type']) => {
        switch(type) {
            case 'Imej':
            case 'Kanvas':
                return <ImageIcon className="w-5 h-5"/>
            case 'Video':
                return <VideoIcon className="w-5 h-5"/>
            case 'Papan Cerita':
                return <FileTextIcon className="w-5 h-5"/>
            default:
                return <FileTextIcon className="w-5 h-5"/>
        }
    }
    
    const imageItems = allItems.filter(item => item.type === 'Imej' || item.type === 'Kanvas');
    const videoItems = allItems.filter(item => item.type === 'Video');

    const itemsToDisplay = activeTab === 'images' ? imageItems : videoItems;

    const renderGridItem = (item: HistoryItem) => {
        const isImage = item.type === 'Imej' || item.type === 'Kanvas';
        const isVideo = item.type === 'Video';

        return (
            <div key={item.id} className="group relative aspect-square bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden shadow-md">
                {isImage && <img src={`data:image/png;base64,${item.result}`} alt={item.prompt} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />}
                {isVideo && (
                    <div className="w-full h-full flex items-center justify-center">
                        <video src={item.result} className="w-full h-full object-cover" loop muted playsInline/>
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <PlayIcon className="w-12 h-12 text-white/80" />
                        </div>
                    </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                    <p className="text-white text-xs line-clamp-3 drop-shadow-md">{item.prompt}</p>
                    <div className="flex justify-end gap-2">
                        {isImage && (
                            <button
                                onClick={() => onCreateVideo({ prompt: item.prompt, image: { base64: item.result, mimeType: 'image/png' } })}
                                className="p-2 bg-primary-600/80 text-white rounded-full hover:bg-primary-600 transition-colors transform hover:scale-110"
                                title="Buat Video"
                            >
                                <VideoIcon className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={() => downloadAsset(item)}
                            className="p-2 bg-white/80 text-black rounded-full hover:bg-white transition-colors transform hover:scale-110"
                            title="Muat Turun"
                        >
                            <DownloadIcon className="w-4 h-4" />
                        </button>
                         <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 bg-red-500/80 text-white rounded-full hover:bg-red-500 transition-colors transform hover:scale-110"
                            title="Padam"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Galeri & Sejarah</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Semak imbas, muat turun, atau gunakan semula semua kandungan yang telah anda jana.</p>
            
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
                <TabButton 
                    label="Imej" 
                    count={imageItems.length} 
                    isActive={activeTab === 'images'} 
                    onClick={() => setActiveTab('images')}
                />
                <TabButton 
                    label="Video" 
                    count={videoItems.length} 
                    isActive={activeTab === 'videos'} 
                    onClick={() => setActiveTab('videos')}
                />
                 <TabButton 
                    label="Sejarah" 
                    count={allItems.length} 
                    isActive={activeTab === 'history'} 
                    onClick={() => setActiveTab('history')}
                />
            </div>

            {activeTab === 'history' ? (
                <div>
                    <div className="flex justify-end mb-4">
                        {allItems.length > 0 && (
                            <button onClick={handleClearHistory} className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 font-semibold">
                                <TrashIcon className="w-4 h-4" />
                                Padamkan Semua Sejarah
                            </button>
                        )}
                    </div>
                    {allItems.length === 0 ? (
                         <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                             <p className="font-semibold">Sejarah Janaan Anda Kosong</p>
                             <p className="text-sm">Mula menjana kandungan dan ia akan muncul di sini.</p>
                         </div>
                    ) : (
                        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                            {allItems.map(item => (
                                <div key={item.id} className="bg-white dark:bg-gray-900/50 p-3 rounded-lg flex items-center gap-4 shadow-sm">
                                    <div className="text-gray-500 dark:text-gray-400">{getIconForType(item.type)}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-primary-500 text-sm">{item.type}</p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 truncate" title={item.prompt}>{item.prompt}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{new Date(item.timestamp).toLocaleString()}</p>
                                    </div>
                                    <div className="w-20 h-20 bg-gray-200 dark:bg-gray-800 rounded-md flex-shrink-0 flex items-center justify-center">
                                        {item.type === 'Imej' || item.type === 'Kanvas' ? (
                                            <img src={`data:image/png;base64,${item.result}`} alt="Kandungan dijana" className="w-full h-full object-cover rounded-md"/>
                                        ) : item.type === 'Video' ? (
                                            <a href={item.result} target="_blank" rel="noopener noreferrer" className="text-primary-500">
                                                <PlayIcon className="w-8 h-8" />
                                            </a>
                                        ) : (
                                            <FileTextIcon className="w-8 h-8 text-gray-500" />
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                         <button onClick={() => downloadAsset(item)} className="p-2 text-gray-400 hover:text-primary-500" title="Muat Turun">
                                            <DownloadIcon className="w-4 h-4"/>
                                        </button>
                                        <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-500" title="Padam">
                                            <TrashIcon className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : itemsToDisplay.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {itemsToDisplay.map(renderGridItem)}
                </div>
            ) : (
                <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                    <div className="inline-block p-4 bg-gray-100 dark:bg-gray-800/50 rounded-full mb-4">
                        {activeTab === 'images' ? <ImageIcon className="w-10 h-10" /> : <VideoIcon className="w-10 h-10" />}
                    </div>
                    <p className="font-semibold">Galeri {activeTab === 'images' ? 'Imej' : 'Video'} Anda Kosong</p>
                    <p className="text-sm">Mula menjana kandungan dan ia akan muncul di sini.</p>
                </div>
            )}
        </div>
    );
};

const TabButton: React.FC<{ label: string; count: number; isActive: boolean; onClick: () => void }> = ({ label, count, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-semibold transition-colors relative ${
            isActive ? 'text-primary-500' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
        }`}
    >
        {label}
        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-primary-500/10 text-primary-500' : 'bg-gray-200 dark:bg-gray-700'}`}>{count}</span>
        {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />}
    </button>
);


export default GalleryView;