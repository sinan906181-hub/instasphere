import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Post, Story } from '../../types';
import PostCard from './PostCard';
import PostCommentsModal from './PostCommentsModal';
import StoryBar from '../stories/StoryBar';
import StoryViewer from '../stories/StoryViewer';
import { ImagePlus, Sparkles, Loader2 } from 'lucide-react';

export const PostFeed: React.FC = () => {
  const { user, setIsCreatePostOpen, setIsAuthModalOpen } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCommentsPost, setActiveCommentsPost] = useState<Post | null>(null);

  // Story Viewer state
  const [viewerStories, setViewerStories] = useState<Story[] | null>(null);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);

  useEffect(() => {
    const q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(40)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Post)
          .filter((p) => !p.isRemoved);
        setPosts(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching feed posts:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const handleOpenStories = (stories: Story[], startIndex: number = 0) => {
    setViewerStories(stories);
    setViewerStartIndex(startIndex);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20">
      {/* 24-Hour Stories Bar */}
      <StoryBar onOpenStory={handleOpenStories} />

      {/* Posts Stream */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-zinc-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs">Loading authentic updates...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-10 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Welcome to MediaSphere</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
              A real community with authentic registered users. No fake bots, no artificial vanity metrics.
            </p>
          </div>
          <button
            onClick={() => (user ? setIsCreatePostOpen(true) : setIsAuthModalOpen(true))}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-full text-xs font-semibold shadow-md shadow-indigo-500/20 transition-transform active:scale-95"
          >
            <ImagePlus className="w-4 h-4" />
            <span>Create First Post</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onOpenComments={(p) => setActiveCommentsPost(p)}
            />
          ))}
        </div>
      )}

      {/* Active Post Comments Modal */}
      <PostCommentsModal
        post={activeCommentsPost}
        onClose={() => setActiveCommentsPost(null)}
      />

      {/* Story Viewer Modal */}
      {viewerStories && (
        <StoryViewer
          stories={viewerStories}
          initialIndex={viewerStartIndex}
          onClose={() => setViewerStories(null)}
        />
      )}
    </div>
  );
};

export default PostFeed;
