import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Reel, Post } from '../../types';
import ReelItem from './ReelItem';
import PostCommentsModal from '../posts/PostCommentsModal';
import { Film, Video, Plus, Loader2 } from 'lucide-react';

export const ReelsFeed: React.FC = () => {
  const { user, setIsCreateReelOpen, setIsAuthModalOpen } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeCommentsReel, setActiveCommentsReel] = useState<Reel | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'reels'),
      orderBy('createdAt', 'desc'),
      limit(30)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Reel)
          .filter((r) => !r.isRemoved);
        setReels(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching reels:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  return (
    <div className="h-[calc(100vh-6rem)] max-w-sm mx-auto flex flex-col items-center justify-center relative">
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 text-zinc-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="text-xs">Loading authentic reels...</span>
        </div>
      ) : reels.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-10 text-center space-y-4 max-w-sm shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
            <Film className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No Reels Shared Yet</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Be the first creator to post an authentic high-resolution reel to the community!
            </p>
          </div>
          <button
            onClick={() => (user ? setIsCreateReelOpen(true) : setIsAuthModalOpen(true))}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-full text-xs font-semibold shadow-md shadow-purple-500/20 transition-transform active:scale-95"
          >
            <Video className="w-4 h-4" /> Create First Reel
          </button>
        </div>
      ) : (
        <div className="w-full h-full relative">
          <ReelItem
            reel={reels[activeIndex]}
            isActive={true}
            onOpenComments={(r) => setActiveCommentsReel(r)}
          />

          {/* Reel Slide Navigation */}
          {reels.length > 1 && (
            <div className="absolute -right-12 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-2 z-30">
              <button
                onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
                disabled={activeIndex === 0}
                className="p-2 rounded-full bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-30 transition-opacity"
              >
                ▲
              </button>
              <button
                onClick={() => setActiveIndex((prev) => Math.min(reels.length - 1, prev + 1))}
                disabled={activeIndex === reels.length - 1}
                className="p-2 rounded-full bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-30 transition-opacity"
              >
                ▼
              </button>
            </div>
          )}
        </div>
      )}

      {/* Convert Reel to Post modal interface for comments */}
      {activeCommentsReel && (
        <PostCommentsModal
          post={{
            id: activeCommentsReel.id,
            authorId: activeCommentsReel.authorId,
            authorUsername: activeCommentsReel.authorUsername,
            authorDisplayName: activeCommentsReel.authorDisplayName,
            authorPhotoURL: activeCommentsReel.authorPhotoURL,
            caption: activeCommentsReel.caption,
            mediaUrls: [activeCommentsReel.videoUrl],
            mediaType: 'video',
            likesCount: activeCommentsReel.likesCount,
            commentsCount: activeCommentsReel.commentsCount,
            sharesCount: activeCommentsReel.sharesCount,
            createdAt: activeCommentsReel.createdAt
          }}
          onClose={() => setActiveCommentsReel(null)}
        />
      )}
    </div>
  );
};

export default ReelsFeed;
