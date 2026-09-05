import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { uploadMediaFile } from '../../utils/media';
import { X, UploadCloud, Type, Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react';

const GRADIENTS = [
  'bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500',
  'bg-gradient-to-tr from-rose-500 via-amber-500 to-yellow-400',
  'bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-700',
  'bg-gradient-to-tr from-emerald-500 via-teal-600 to-cyan-700',
  'bg-gradient-to-tr from-fuchsia-600 via-rose-600 to-pink-500',
  'bg-zinc-900 border border-zinc-700'
];

export const CreateStoryModal: React.FC = () => {
  const { isCreateStoryOpen, setIsCreateStoryOpen, user, profile } = useAuth();
  const [mode, setMode] = useState<'media' | 'text'>('media');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[0]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isCreateStoryOpen || !user) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setError(null);
    }
  };

  const handlePublish = async () => {
    if (mode === 'media' && !file) {
      setError('Please select a photo or video for your story.');
      return;
    }
    if (mode === 'text' && !caption.trim()) {
      setError('Please type your story text.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      let mediaUrl = '';
      let mediaType: 'image' | 'video' | 'text' = mode === 'text' ? 'text' : 'image';

      if (file) {
        const uploadRes = await uploadMediaFile(file, 'stories');
        mediaUrl = uploadRes.url;
        mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      }

      const now = Date.now();
      const expiresAt = now + 24 * 60 * 60 * 1000; // 24 Hours

      await addDoc(collection(db, 'stories'), {
        authorId: user.uid,
        authorUsername: profile?.username || 'user',
        authorDisplayName: profile?.displayName || 'User',
        authorPhotoURL: profile?.photoURL || '',
        mediaUrl: mediaUrl || null,
        mediaType,
        caption: caption.trim() || null,
        bgGradient: mode === 'text' ? selectedGradient : null,
        viewsCount: 0,
        viewersCount: 0,
        createdAt: now,
        expiresAt
      });

      setIsCreateStoryOpen(false);
      setFile(null);
      setPreviewUrl(null);
      setCaption('');
    } catch (err: any) {
      console.error('Failed to create story:', err);
      setError(err?.message || 'Failed to post story');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-4">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">Create Story</h3>
          <button
            onClick={() => setIsCreateStoryOpen(false)}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl mb-4">
          <button
            onClick={() => setMode('media')}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              mode === 'media'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <ImageIcon className="w-4 h-4" /> Media Story
          </button>
          <button
            onClick={() => setMode('text')}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              mode === 'text'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Type className="w-4 h-4" /> Text Story
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs">
            {error}
          </div>
        )}

        {mode === 'media' ? (
          <div className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,video/*"
              className="hidden"
            />

            {previewUrl ? (
              <div className="relative h-64 rounded-2xl overflow-hidden bg-black flex items-center justify-center">
                {file?.type.startsWith('video/') ? (
                  <video src={previewUrl} className="h-full w-full object-cover" autoPlay muted loop playsInline />
                ) : (
                  <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                )}
                <button
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
                className="h-64 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center p-4 cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all"
              >
                <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 mb-3">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">Click to upload story media</p>
                <p className="text-xs text-zinc-400">Photos or vertical videos up to 100MB</p>
              </div>
            )}

            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add an optional caption..."
              className="w-full px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className={`h-64 rounded-2xl p-6 flex items-center justify-center text-center text-white text-lg font-bold shadow-inner ${selectedGradient}`}
            >
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="What's on your mind?..."
                className="w-full bg-transparent text-center text-white placeholder-white/60 focus:outline-hidden resize-none"
                rows={4}
                maxLength={200}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase mb-1.5">Choose Gradient</label>
              <div className="flex gap-2">
                {GRADIENTS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setSelectedGradient(g)}
                    className={`w-8 h-8 rounded-full ${g} ${
                      selectedGradient === g ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handlePublish}
          disabled={uploading}
          className="w-full mt-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {uploading ? 'Sharing Story...' : 'Share to Stories (24h)'}
        </button>
      </div>
    </div>
  );
};

export default CreateStoryModal;
