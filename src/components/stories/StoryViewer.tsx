import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Story, StoryViewerRecord } from '../../types';
import {
  doc,
  updateDoc,
  increment,
  collection,
  addDoc,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatTimeAgo } from '../../utils/media';
import Avatar from '../common/Avatar';
import ReportModal from '../common/ReportModal';
import { X, ChevronLeft, ChevronRight, Eye, Heart, ShieldAlert, Users } from 'lucide-react';
import confetti from 'canvas-confetti';

interface StoryViewerProps {
  stories: Story[];
  initialIndex?: number;
  onClose: () => void;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({ stories, initialIndex = 0, onClose }) => {
  const { user, profile } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [viewers, setViewers] = useState<StoryViewerRecord[]>([]);
  const [showViewersList, setShowViewersList] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const currentStory = stories[currentIndex];
  const isOwner = user && currentStory && user.uid === currentStory.authorId;

  // Track unique real view
  useEffect(() => {
    if (!currentStory || !user) return;

    const recordView = async () => {
      try {
        // Prevent author from inflating their own view counts
        if (user.uid === currentStory.authorId) return;

        // Check if user already viewed this story
        const q = query(
          collection(db, 'storyViews'),
          where('storyId', '==', currentStory.id),
          where('viewerId', '==', user.uid)
        );
        const existingSnap = await getDocs(q);

        if (existingSnap.empty) {
          // Record view document
          await addDoc(collection(db, 'storyViews'), {
            storyId: currentStory.id,
            viewerId: user.uid,
            viewerUsername: profile?.username || 'user',
            viewerDisplayName: profile?.displayName || 'User',
            viewerPhotoURL: profile?.photoURL || '',
            viewedAt: Date.now()
          });

          // Increment story count
          await updateDoc(doc(db, 'stories', currentStory.id), {
            viewsCount: increment(1),
            viewersCount: increment(1)
          });
        }
      } catch (err) {
        console.error('Error tracking story view:', err);
      }
    };

    recordView();
  }, [currentStory, user, profile]);

  // Load viewers if owner
  useEffect(() => {
    if (!isOwner || !currentStory) return;

    const fetchViewers = async () => {
      try {
        const q = query(collection(db, 'storyViews'), where('storyId', '==', currentStory.id));
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StoryViewerRecord);
        setViewers(list);
      } catch (err) {
        console.error('Error loading story viewers:', err);
      }
    };

    fetchViewers();
  }, [isOwner, currentStory]);

  // Story playback timer
  useEffect(() => {
    if (isPaused || showViewersList) return;

    const duration = currentStory?.mediaType === 'video' ? 12000 : 6000;
    const interval = 50;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex((c) => c + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex, isPaused, showViewersList, stories.length, currentStory, onClose]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((c) => c + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((c) => c - 1);
      setProgress(0);
    }
  };

  const handleLike = () => {
    setHasLiked(!hasLiked);
    if (!hasLiked) {
      confetti({
        particleCount: 25,
        spread: 60,
        origin: { y: 0.8 }
      });
    }
  };

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center select-none backdrop-blur-md">
      {/* Navigation Buttons on Desktop */}
      {currentIndex > 0 && (
        <button
          onClick={handlePrev}
          className="hidden md:flex absolute left-8 p-3 rounded-full bg-zinc-900/80 text-white hover:bg-zinc-800 transition-transform active:scale-90 z-20"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {currentIndex < stories.length - 1 && (
        <button
          onClick={handleNext}
          className="hidden md:flex absolute right-8 p-3 rounded-full bg-zinc-900/80 text-white hover:bg-zinc-800 transition-transform active:scale-90 z-20"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Main Story Container */}
      <div
        className="relative w-full max-w-sm h-[90vh] max-h-[780px] rounded-3xl overflow-hidden shadow-2xl bg-zinc-950 flex flex-col justify-between"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Progress Bars */}
        <div className="absolute top-3 left-3 right-3 flex gap-1.5 z-30">
          {stories.map((s, idx) => (
            <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all ease-linear"
                style={{
                  width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Story Header */}
        <div className="absolute top-6 left-3 right-3 flex items-center justify-between z-30 pt-1">
          <div className="flex items-center gap-2.5">
            <Avatar src={currentStory.authorPhotoURL} alt={currentStory.authorDisplayName} size="sm" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white tracking-wide">{currentStory.authorDisplayName}</span>
                <span className="text-[10px] text-zinc-300">· {formatTimeAgo(currentStory.createdAt)}</span>
              </div>
              <span className="text-[10px] text-zinc-400">@{currentStory.authorUsername}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!isOwner && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReportModal(true);
                }}
                className="p-1.5 text-zinc-300 hover:text-rose-400 rounded-full hover:bg-black/30 transition-colors"
                title="Report story"
              >
                <ShieldAlert className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-white hover:text-zinc-300 rounded-full hover:bg-black/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Story Content Area */}
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          {currentStory.mediaType === 'image' && currentStory.mediaUrl && (
            <img src={currentStory.mediaUrl} alt="Story" className="w-full h-full object-cover" />
          )}

          {currentStory.mediaType === 'video' && currentStory.mediaUrl && (
            <video
              src={currentStory.mediaUrl}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              onEnded={handleNext}
            />
          )}

          {currentStory.mediaType === 'text' && (
            <div
              className={`w-full h-full flex items-center justify-center p-8 text-center text-white text-xl font-bold ${
                currentStory.bgGradient || 'bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500'
              }`}
            >
              <p className="leading-relaxed drop-shadow-md">{currentStory.caption}</p>
            </div>
          )}

          {/* Caption overlay for image/video */}
          {currentStory.mediaType !== 'text' && currentStory.caption && (
            <div className="absolute bottom-16 left-4 right-4 bg-black/40 backdrop-blur-md p-3 rounded-2xl text-xs text-white text-center">
              {currentStory.caption}
            </div>
          )}

          {/* Tap navigation zones */}
          <div
            className="absolute left-0 top-16 bottom-16 w-1/3 z-10"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
          />
          <div
            className="absolute right-0 top-16 bottom-16 w-1/3 z-10"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
          />
        </div>

        {/* Bottom Interaction Footer */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-30 pt-2">
          {isOwner ? (
            <button
              onClick={() => setShowViewersList(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-semibold hover:bg-black/80 transition-colors"
            >
              <Eye className="w-4 h-4 text-indigo-400" />
              <span>{currentStory.viewsCount || viewers.length} Viewers</span>
            </button>
          ) : (
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] text-white/80 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-xs">
                👁️ {currentStory.viewsCount || 0} real views
              </span>
              <button
                onClick={handleLike}
                className={`p-2.5 rounded-full bg-black/50 backdrop-blur-md transition-transform active:scale-125 ${
                  hasLiked ? 'text-rose-500' : 'text-white hover:text-rose-400'
                }`}
              >
                <Heart className={`w-5 h-5 ${hasLiked ? 'fill-current' : ''}`} />
              </button>
            </div>
          )}
        </div>

        {/* Real Viewers Tray for Owner */}
        {showViewersList && (
          <div className="absolute inset-0 bg-zinc-950/95 z-40 p-4 flex flex-col justify-between animate-in slide-in-from-bottom duration-200">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>Story Viewers ({viewers.length})</span>
                </div>
                <button onClick={() => setShowViewersList(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-3 space-y-2 overflow-y-auto max-h-[65vh]">
                {viewers.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-500">No views recorded yet.</div>
                ) : (
                  viewers.map((v) => (
                    <div key={v.id} className="flex items-center justify-between p-2 rounded-xl bg-zinc-900 border border-zinc-800/80">
                      <div className="flex items-center gap-2.5">
                        <Avatar src={v.viewerPhotoURL} alt={v.viewerDisplayName} size="sm" />
                        <div>
                          <div className="text-xs font-semibold text-white">{v.viewerDisplayName}</div>
                          <div className="text-[10px] text-zinc-400">@{v.viewerUsername}</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-zinc-500">{formatTimeAgo(v.viewedAt)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button
              onClick={() => setShowViewersList(false)}
              className="w-full py-2.5 bg-zinc-800 text-white rounded-xl text-xs font-semibold"
            >
              Close Viewers
            </button>
          </div>
        )}
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType="story"
        targetId={currentStory.id}
        targetAuthorId={currentStory.authorId}
        targetAuthorUsername={currentStory.authorUsername}
        targetContentPreview={currentStory.caption || 'Story media'}
      />
    </div>
  );
};

export default StoryViewer;
