import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Story } from '../../types';
import Avatar from '../common/Avatar';
import { Plus } from 'lucide-react';

interface StoryGroup {
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorPhotoURL?: string;
  stories: Story[];
}

interface StoryBarProps {
  onOpenStory: (stories: Story[], startIndex?: number) => void;
}

export const StoryBar: React.FC<StoryBarProps> = ({ onOpenStory }) => {
  const { user, profile, setIsCreateStoryOpen, setIsAuthModalOpen } = useAuth();
  const [groupedStories, setGroupedStories] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = Date.now();
    // Query active stories within 24 hours
    const q = query(
      collection(db, 'stories'),
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const stories = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }) as Story)
          .filter((s) => !s.isRemoved);

        // Group by authorId
        const groupMap: Record<string, StoryGroup> = {};
        stories.forEach((story) => {
          const authorId = story.authorId || 'unknown';
          if (!groupMap[authorId]) {
            groupMap[authorId] = {
              authorId,
              authorUsername: story.authorUsername || 'user',
              authorDisplayName: story.authorDisplayName || story.authorUsername || 'User',
              authorPhotoURL: story.authorPhotoURL || '',
              stories: []
            };
          }
          groupMap[authorId].stories.push(story);
        });

        setGroupedStories(Object.values(groupMap));
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching stories:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const myGroup = user ? groupedStories.find((g) => g.authorId === user.uid) : null;
  const otherGroups = user ? groupedStories.filter((g) => g.authorId !== user.uid) : groupedStories;

  return (
    <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-3xl p-4 shadow-xs">
      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1">
        {/* Your Story Slot */}
        <div className="flex flex-col items-center shrink-0 w-18">
          <div className="relative cursor-pointer" onClick={() => (user ? (myGroup ? onOpenStory(myGroup.stories) : setIsCreateStoryOpen(true)) : setIsAuthModalOpen(true))}>
            <Avatar
              src={profile?.photoURL}
              alt={profile?.displayName || 'You'}
              size="lg"
              hasStory={!!myGroup}
              storyUnread={true}
            />
            {!myGroup && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  user ? setIsCreateStoryOpen(true) : setIsAuthModalOpen(true);
                }}
                className="absolute bottom-0 right-0 p-1 rounded-full bg-indigo-600 text-white border-2 border-white dark:border-zinc-900 shadow-md hover:bg-indigo-700 transition-transform active:scale-95"
              >
                <Plus className="w-3 h-3 stroke-[3]" />
              </button>
            )}
          </div>
          <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mt-2 truncate w-full text-center">
            {myGroup ? 'Your Story' : 'Add Story'}
          </span>
        </div>

        {/* Real User Active Stories */}
        {otherGroups.map((group) => {
          const displayName = group.authorDisplayName || group.authorUsername || 'User';
          const firstName = displayName.split(' ')[0] || displayName;
          return (
            <div
              key={group.authorId}
              onClick={() => onOpenStory(group.stories)}
              className="flex flex-col items-center shrink-0 w-18 cursor-pointer group"
            >
              <Avatar
                src={group.authorPhotoURL}
                alt={displayName}
                size="lg"
                hasStory={true}
                storyUnread={true}
                className="group-hover:scale-105 transition-transform"
              />
              <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mt-2 truncate w-full text-center group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                {firstName}
              </span>
            </div>
          );
        })}

        {!loading && otherGroups.length === 0 && !myGroup && (
          <div className="flex items-center text-xs text-zinc-400 dark:text-zinc-500 pl-2">
            No active stories right now. Tap "Add Story" to be the first!
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryBar;
