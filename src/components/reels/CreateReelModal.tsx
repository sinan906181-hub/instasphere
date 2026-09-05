import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { uploadMediaFile } from '../../utils/media';
import { X, UploadCloud, Video, Sparkles, Loader2, Music2 } from 'lucide-react';

export const CreateReelModal: React.FC = () => {
  const { isCreateReelOpen, setIsCreateReelOpen, user, profile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [audioTitle, setAudioTitle] = useState('Original Audio');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isCreateReelOpen || !user) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selected = e.target.files[0];
      if (!selected.type.startsWith('video/')) {
        setError('Please select a valid video file (MP4, WebM, MOV).');
        return;
      }
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setError(null);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please choose a video file.');
      return;
    }

    setUploading(true);
    setUploadProgress(15);
    setError(null);

    try {
      // 1. Upload video file to server
      const uploadRes = await uploadMediaFile(file, 'reels', (progress) => {
        setUploadProgress(progress);
      });

      // 2. Add Reel to Firestore
      await addDoc(collection(db, 'reels'), {
        authorId: user.uid,
        authorUsername: profile?.username || 'user',
        authorDisplayName: profile?.displayName || 'User',
        authorPhotoURL: profile?.photoURL || '',
        videoUrl: uploadRes.url,
        caption: caption.trim(),
        audioTitle: audioTitle.trim() || 'Original Audio',
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        viewsCount: 0,
        is4K: uploadRes.is4K,
        resolution: uploadRes.resolution || '1080x1920',
        createdAt: Date.now()
      });

      setIsCreateReelOpen(false);
      setFile(null);
      setPreviewUrl(null);
      setCaption('');
      setAudioTitle('Original Audio');
    } catch (err: any) {
      console.error('Failed to create reel:', err);
      setError(err?.message || 'Failed to upload reel');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">Create New Reel</h3>
          <button
            onClick={() => setIsCreateReelOpen(false)}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handlePublish} className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs">
              {error}
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="video/*"
            className="hidden"
          />

          {previewUrl ? (
            <div className="relative h-64 rounded-2xl overflow-hidden bg-black flex items-center justify-center">
              <video src={previewUrl} className="h-full w-full object-cover" autoPlay muted loop playsInline />
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPreviewUrl(null);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="h-56 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center p-4 cursor-pointer hover:border-purple-500 hover:bg-purple-50/20 dark:hover:bg-purple-950/20 transition-all"
            >
              <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 mb-2">
                <Video className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Select short-form video</p>
              <p className="text-xs text-zinc-400 mt-1">Vertical 9:16 videos up to 100MB</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase mb-1">
              Caption
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's this reel about? Add hashtags..."
              rows={3}
              className="w-full px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase mb-1">
              Audio Title
            </label>
            <div className="relative">
              <Music2 className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                value={audioTitle}
                onChange={(e) => setAudioTitle(e.target.value)}
                placeholder="e.g. Original Audio - Sunset Beats"
                className="w-full pl-9 pr-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {uploading && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Processing video...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || !file}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-purple-500/20 disabled:opacity-50 mt-2"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {uploading ? 'Publishing Reel...' : 'Share Reel'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateReelModal;
