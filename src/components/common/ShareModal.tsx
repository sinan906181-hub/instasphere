import React, { useState } from 'react';
import { X, Copy, Check, Share2, Send } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url?: string;
  onSendDirect?: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, title, url = window.location.href, onSendDirect }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Share</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">{title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 mb-4">
          <input
            type="text"
            readOnly
            value={url}
            className="bg-transparent text-xs text-zinc-700 dark:text-zinc-300 w-full px-2 outline-hidden truncate"
          />
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {onSendDirect && (
          <button
            onClick={() => {
              onSendDirect();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-2xl text-xs font-semibold transition-colors"
          >
            <Send className="w-4 h-4" />
            Send in Direct Message
          </button>
        )}
      </div>
    </div>
  );
};

export default ShareModal;
