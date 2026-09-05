import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Post, Comment } from '../../types';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  increment
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatTimeAgo } from '../../utils/media';
import Avatar from '../common/Avatar';
import EmojiPicker from '../common/EmojiPicker';
import { X, Send, Smile, Heart } from 'lucide-react';

interface PostCommentsModalProps {
  post: Post | null;
  onClose: () => void;
}

export const PostCommentsModal: React.FC<PostCommentsModalProps> = ({ post, onClose }) => {
  const { user, profile, setIsAuthModalOpen, navigateToProfile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!post) return;

    const q = query(
      collection(db, 'comments'),
      where('postId', '==', post.id),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Comment);
      setComments(list.filter((c) => !c.isRemoved));
    });

    return () => unsub();
  }, [post]);

  if (!post) return null;

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'comments'), {
        postId: post.id,
        authorId: user.uid,
        authorUsername: profile?.username || 'user',
        authorDisplayName: profile?.displayName || 'User',
        authorPhotoURL: profile?.photoURL || '',
        text: newComment.trim(),
        likesCount: 0,
        replyToId: replyingTo?.id || null,
        replyToUsername: replyingTo?.username || null,
        createdAt: Date.now()
      });

      // Increment post comment counter
      await updateDoc(doc(db, 'posts', post.id), {
        commentsCount: increment(1)
      });

      setNewComment('');
      setReplyingTo(null);
      setShowEmoji(false);
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full h-[75vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-zinc-900 dark:text-white">Comments</span>
            <span className="text-xs text-zinc-500">({comments.length})</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Post Caption as first item */}
          <div className="flex gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/60">
            <Avatar src={post.authorPhotoURL} alt={post.authorDisplayName} size="sm" />
            <div className="text-xs">
              <span
                onClick={() => {
                  navigateToProfile(post.authorId);
                  onClose();
                }}
                className="font-bold text-zinc-900 dark:text-white mr-1.5 cursor-pointer hover:underline"
              >
                @{post.authorUsername}
              </span>
              <span className="text-zinc-700 dark:text-zinc-300">{post.caption}</span>
              <div className="text-[10px] text-zinc-400 mt-1">{formatTimeAgo(post.createdAt)}</div>
            </div>
          </div>

          {comments.length === 0 ? (
            <div className="py-16 text-center text-xs text-zinc-400">
              No comments yet. Start the conversation!
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3 group">
                <Avatar src={c.authorPhotoURL} alt={c.authorDisplayName} size="sm" />
                <div className="flex-1 text-xs space-y-1">
                  <div>
                    <span
                      onClick={() => {
                        navigateToProfile(c.authorId);
                        onClose();
                      }}
                      className="font-bold text-zinc-900 dark:text-white mr-1.5 cursor-pointer hover:underline"
                    >
                      @{c.authorUsername}
                    </span>
                    {c.replyToUsername && (
                      <span className="text-indigo-500 mr-1.5 font-medium">@{c.replyToUsername}</span>
                    )}
                    <span className="text-zinc-700 dark:text-zinc-300">{c.text}</span>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-zinc-400">
                    <span>{formatTimeAgo(c.createdAt)}</span>
                    <button
                      onClick={() => setReplyingTo({ id: c.id, username: c.authorUsername })}
                      className="hover:text-zinc-600 dark:hover:text-zinc-200 font-semibold"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Reply To Banner */}
        {replyingTo && (
          <div className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-xs text-indigo-600 dark:text-indigo-400 flex items-center justify-between border-t border-indigo-100 dark:border-indigo-900/30">
            <span>Replying to @{replyingTo.username}</span>
            <button onClick={() => setReplyingTo(null)} className="font-bold">
              ✕
            </button>
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleAddComment} className="p-3 border-t border-zinc-100 dark:border-zinc-800 relative bg-zinc-50 dark:bg-zinc-900">
          {showEmoji && (
            <div className="absolute bottom-16 left-4 z-20">
              <EmojiPicker
                onSelect={(emoji) => {
                  setNewComment((prev) => prev + emoji);
                  setShowEmoji(false);
                }}
                onClose={() => setShowEmoji(false)}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEmoji(!showEmoji)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-full"
            >
              <Smile className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={user ? 'Add a thoughtful comment...' : 'Sign in to comment...'}
              disabled={!user}
              className="flex-1 py-2 px-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />

            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition-colors disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostCommentsModal;
