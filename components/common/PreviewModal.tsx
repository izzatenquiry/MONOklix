import React, { useEffect } from 'react';
import { type HistoryItem } from '../../types';
import { XIcon } from '../Icons';

interface PreviewModalProps {
  item: HistoryItem | null;
  onClose: () => void;
  getDisplayUrl: (item: HistoryItem) => string;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ item, onClose, getDisplayUrl }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (item) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [item, onClose]);

  if (!item) return null;

  const displayUrl = getDisplayUrl(item);
  const isImage = item.type === 'Image' || item.type === 'Canvas';
  const isVideo = item.type === 'Video';

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-zoomIn"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="relative bg-neutral-950 rounded-lg shadow-2xl p-4 w-full max-w-5xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the content
      >
        <button
          onClick={onClose}
          className="absolute -top-5 -right-5 bg-white text-black rounded-full p-2 hover:scale-110 transition-transform z-10 shadow-lg"
          aria-label="Close preview"
        >
          <XIcon className="w-6 h-6" />
        </button>

        <div className="flex-1 flex items-center justify-center min-h-0">
          {isImage && (
            <img src={displayUrl} alt={item.prompt} className="max-w-full max-h-full object-contain rounded-md" />
          )}
          {isVideo && displayUrl && (
            <video src={displayUrl} controls autoPlay className="max-w-full max-h-full object-contain rounded-md" />
          )}
        </div>
        
        <div className="flex-shrink-0 mt-4 text-center">
            <p className="text-white text-sm line-clamp-2">{item.prompt}</p>
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;
