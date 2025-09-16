import React, { useState, useEffect, useRef } from 'react';
import { getHistory } from '../../services/historyService';
import { type HistoryItem } from '../../types';
import Spinner from '../common/Spinner';
import { FilmIcon, DownloadIcon, CheckCircleIcon } from '../Icons';

// FFmpeg dimuatkan melalui tag skrip, jadi kita boleh mengisytiharkannya pada window
declare global {
    interface Window {
        FFmpeg: any;
        FFmpegUtil: any;
    }
}

const VideoCombinerView: React.FC = () => {
    const [allVideos, setAllVideos] = useState<HistoryItem[]>([]);
    const [selectedVideos, setSelectedVideos] = useState<string[]>([]); // Simpan mengikut ID
    const [isLoading, setIsLoading] = useState(false);
    const [progressMessage, setProgressMessage] = useState('');
    const [outputUrl, setOutputUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const ffmpegRef = useRef<any>(null);

    useEffect(() => {
        // FIX: The `getHistory` function is async, so we must await its result
        // before we can call array methods like `filter` on it.
        const fetchVideos = async () => {
            const history = await getHistory();
            const videoItems = history.filter(item => item.type === 'Video');
            setAllVideos(videoItems);
        };
        fetchVideos();
    }, []);
    
    const loadFfmpeg = async () => {
        if (ffmpegRef.current) return;
        
        if (!window.FFmpeg || !window.FFmpegUtil) {
            const errorMessage = "Pustaka FFmpeg gagal dimuatkan. Sila pastikan anda mempunyai sambungan internet dan muat semula halaman.";
            setError(errorMessage);
            throw new Error(errorMessage);
        }
        
        const ffmpeg = window.FFmpeg.createFFmpeg({
            log: true,
            corePath: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js",
        });

        ffmpeg.setLogger(({ message }: { message: string }) => {
            console.log(message);
            // Hanya tunjukkan mesej yang relevan kepada pengguna
            if (message.includes('Input') || message.includes('Output') || message.includes('size=')) {
                setProgressMessage(message);
            }
        });

        await ffmpeg.load();
        ffmpegRef.current = ffmpeg;
    };

    const handleToggleSelect = (videoId: string) => {
        setSelectedVideos(prev =>
            prev.includes(videoId)
                ? prev.filter(id => id !== videoId)
                : [...prev, videoId]
        );
        setError(null);
    };

    const handleCombine = async () => {
        if (selectedVideos.length < 2) {
            setError("Sila pilih sekurang-kurangnya 2 video untuk digabungkan.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setOutputUrl(null);

        try {
            setProgressMessage("Memuatkan enjin FFmpeg...");
            await loadFfmpeg();
            const ffmpeg = ffmpegRef.current;
            
            setProgressMessage("Memuat turun dan menulis fail video...");
            const fileListContent: string[] = [];
            // Ensure videos are added in the order they were selected
            const orderedVideos = selectedVideos.map(id => allVideos.find(v => v.id === id)).filter(Boolean) as HistoryItem[];

            for (let i = 0; i < orderedVideos.length; i++) {
                const videoItem = orderedVideos[i];
                const fileName = `input${i}.mp4`;
                const videoData = await window.FFmpegUtil.fetchFile(videoItem.result);
                ffmpeg.FS('writeFile', fileName, videoData);
                fileListContent.push(`file '${fileName}'`);
            }

            ffmpeg.FS('writeFile', 'filelist.txt', fileListContent.join('\n'));

            setProgressMessage("Menggabungkan video... ini mungkin mengambil sedikit masa.");
            await ffmpeg.run('-f', 'concat', '-safe', '0', '-i', 'filelist.txt', '-c', 'copy', 'output.mp4');

            setProgressMessage("Memproses output...");
            const data = ffmpeg.FS('readFile', 'output.mp4');

            const blob = new Blob([data.buffer], { type: 'video/mp4' });
            const url = URL.createObjectURL(blob);
            setOutputUrl(url);

            setProgressMessage("Selesai!");

        } catch (err) {
            console.error(err);
            setError("Gagal menggabungkan video. Sila cuba lagi atau semak konsol untuk butiran.");
        } finally {
            setIsLoading(false);
        }
    };
    
     const handleDownload = () => {
        if (!outputUrl) return;
        const link = document.createElement('a');
        link.href = outputUrl;
        link.download = `1za7-ai-combined-video-${Date.now()}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold">Gabung Video</h1>
            <p className="text-gray-500 dark:text-gray-400">Pilih video dari galeri anda untuk dicantumkan menjadi satu fail yang lebih panjang.</p>
            
            <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">1. Pilih Video Anda (mengikut urutan)</h2>
                {allVideos.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                        {allVideos.map(video => {
                            const selectionIndex = selectedVideos.indexOf(video.id);
                            const isSelected = selectionIndex !== -1;
                            return (
                                <button key={video.id} onClick={() => handleToggleSelect(video.id)} className={`relative group aspect-square rounded-lg overflow-hidden transition-all duration-200 ${isSelected ? 'ring-4 ring-primary-500 scale-95' : 'ring-2 ring-transparent hover:ring-primary-300'}`}>
                                    <video src={video.result} className="w-full h-full object-cover" muted loop playsInline title={video.prompt}/>
                                    {isSelected && (
                                        <div className="absolute inset-0 bg-primary-500/50 flex items-center justify-center">
                                            <span className="text-white text-4xl font-bold drop-shadow-lg">{selectionIndex + 1}</span>
                                        </div>
                                    )}
                                     <div className="absolute top-0 left-0 right-0 p-1 bg-gradient-to-b from-black/60 to-transparent">
                                        <p className="text-white text-xs line-clamp-2 drop-shadow-sm">{video.prompt}</p>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">Tiada video ditemui dalam galeri anda. Jana beberapa video terlebih dahulu!</p>
                )}
            </div>

            <div className="text-center">
                <button
                    onClick={handleCombine}
                    disabled={isLoading || selectedVideos.length < 2}
                    className="w-full max-w-sm flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
                >
                    {isLoading ? <Spinner /> : <FilmIcon className="w-5 h-5"/>}
                    Gabung {selectedVideos.length > 0 ? selectedVideos.length : ''} Video
                </button>
                {error && <p className="text-red-500 dark:text-red-400 mt-2 text-center text-sm">{error}</p>}
            </div>

            {(isLoading || outputUrl) && (
                <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">Hasil</h2>
                    {isLoading ? (
                        <div className="text-center space-y-3">
                            <Spinner />
                            <p className="font-semibold text-primary-500 dark:text-primary-400">Memproses...</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto truncate" title={progressMessage}>{progressMessage}</p>
                        </div>
                    ) : (
                        outputUrl && (
                            <div className="space-y-4">
                                <video src={outputUrl} controls autoPlay className="w-full max-w-2xl mx-auto rounded-lg bg-black" />
                                <div className="text-center">
                                     <button onClick={handleDownload} className="flex items-center justify-center gap-2 bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors mx-auto">
                                        <DownloadIcon className="w-5 h-5" />
                                        Muat Turun Video Gabungan
                                    </button>
                                </div>
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
};

export default VideoCombinerView;