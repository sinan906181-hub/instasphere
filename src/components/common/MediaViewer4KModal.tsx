import React from 'react';
import { X, Download, Sparkles } from 'lucide-react';

interface MediaViewer4KModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  resolution?: string;
  is4K?: boolean;
}

export const MediaViewer4KModal: React.FC<MediaViewer4KModalProps> = ({
  isOpen,
  onClose,
  mediaUrl,
  mediaType,
  resolution,
  is4K
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 animate-in fade-in">
      {/* Header controls */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          {is4K && (
            <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-linear-to-r from-amber-500 to-rose-500 text-white font-black text-xs tracking-wider shadow-lg">
              <Sparkles className="w-3.5 h-3.5" /> 4K ULTRA HD
            </span>
          )}
          {resolution && (
            <span className="px-2.5 py-1 rounded-full bg-zinc-800/80 text-zinc-300 text-xs font-mono">
              {resolution}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={mediaUrl}
            download
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-white transition-colors"
            title="Download original"
          >
            <Download className="w-5 h-5" />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl max-h-[90vh] w-full h-full flex items-center justify-center">
        {mediaType === 'video' ? (
          <video
            src={mediaUrl}
            controls
            autoPlay
            playsInline
            className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
          />
        ) : (
          <img
            src={mediaUrl}
            alt="Media viewer"
            className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
          />
        )}
      </div>
    </div>
  );
};

export default MediaViewer4KModal;
