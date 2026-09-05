import React from 'react';

const COMMON_EMOJIS = [
  '❤️', '🔥', '👏', '😍', '😂', '✨', '🙌', '💯',
  '🎉', '🥳', '😎', '🤩', '👍', '🙏', '⚡', '🚀',
  '🌈', '💖', '🥰', '🥺', '🤯', '💪', '👑', '🌟'
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, onClose }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 shadow-xl z-50 w-64 animate-in fade-in zoom-in-95">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 mb-2">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Quick Reactions</span>
        {onClose && (
          <button onClick={onClose} className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            ✕
          </button>
        )}
      </div>
      <div className="grid grid-cols-6 gap-2">
        {COMMON_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className="text-xl p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-transform active:scale-125 flex items-center justify-center"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EmojiPicker;
