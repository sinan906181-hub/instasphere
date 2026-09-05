import React from 'react';

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  hasStory?: boolean;
  storyUnread?: boolean;
  isOnline?: boolean;
  className?: string;
  onClick?: () => void;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'User',
  size = 'md',
  hasStory = false,
  storyUnread = false,
  isOnline = false,
  className = '',
  onClick
}) => {
  const sizeMap = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
    '2xl': 'w-28 h-28 text-2xl'
  };

  const ringPadMap = {
    xs: 'p-0.5',
    sm: 'p-0.5',
    md: 'p-0.5',
    lg: 'p-1',
    xl: 'p-1',
    '2xl': 'p-1.5'
  };

  const initial = alt ? alt.charAt(0).toUpperCase() : 'U';

  const avatarContent = (
    <div className={`relative inline-block ${className}`} onClick={onClick}>
      <div
        className={`rounded-full flex items-center justify-center transition-transform active:scale-95 ${
          hasStory
            ? storyUnread
              ? `story-ring-gradient ${ringPadMap[size]}`
              : `bg-zinc-300 dark:bg-zinc-700 ${ringPadMap[size]}`
            : ''
        }`}
      >
        <div className={`overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800 ${sizeMap[size]} border-2 border-white dark:border-zinc-950 flex items-center justify-center font-semibold text-zinc-700 dark:text-zinc-200`}>
          {src ? (
            <img
              src={src}
              alt={alt}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <span>{initial}</span>
          )}
        </div>
      </div>

      {isOnline && (
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950 shadow-sm" />
      )}
    </div>
  );

  return avatarContent;
};

export default Avatar;
