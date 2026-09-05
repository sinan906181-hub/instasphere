import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { uploadMultipleMediaFiles } from '../../utils/media';
import { X, UploadCloud, Image as ImageIcon, MapPin, Sparkles, Loader2, Tag } from 'lucide-react';

export const CreatePostModal: React.FC = () => {
  const { isCreatePostOpen, setIsCreatePostOpen, user, profile } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isCreatePostOpen || !user) return null;

  const handleFilesSelected = (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    const newFiles = Array.from(selectedFiles);
    setFiles((prev) => [...prev, ...newFiles]);

    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newPreviews]);
    setError(null);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      setError('Please choose at least one photo or video.');
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    setError(null);

    try {
      // 1. Real Upload to server storage
      const uploadResults = await uploadMultipleMediaFiles(files, 'posts', (progress) => {
        setUploadProgress(progress);
      });

      const mediaUrls = uploadResults.map((r) => r.url);
      const is4K = uploadResults.some((r) => r.is4K);
      const resolution = uploadResults[0]?.resolution || 'auto';
      const hasVideo = uploadResults.some((r) => r.mimetype?.startsWith('video/'));

      // 2. Parse tags
      const tags = (tagsInput || '')
        .split(/[ ,#]+/)
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      // 3. Save to Firestore
      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorUsername: profile?.username || 'user',
        authorDisplayName: profile?.displayName || 'User',
        authorPhotoURL: profile?.photoURL || '',
        caption: caption.trim(),
        mediaUrls,
        mediaType: hasVideo ? (mediaUrls.length > 1 ? 'mixed' : 'video') : 'image',
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        viewsCount: 0,
        is4K,
        resolution,
        tags,
        location: location.trim() || null,
        createdAt: Date.now()
      });

      // Cleanup
      setIsCreatePostOpen(false);
      setFiles([]);
      setPreviews([]);
      setCaption('');
      setLocation('');
      setTagsInput('');
    } catch (err: any) {
      console.error('Failed to create post:', err);
      setError(err?.message || 'Error publishing post');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">Create New Post</h3>
          <button
            onClick={() => setIsCreatePostOpen(false)}
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

          {/* Media Picker */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFilesSelected(e.target.files)}
            multiple
            accept="image/*,video/*"
            className="hidden"
          />

          {previews.length > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {previews.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-black group">
                    <img src={src} alt="preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(i)}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-90 hover:opacity-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {previews.length < 10 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl flex items-center justify-center text-zinc-400 hover:text-indigo-500 hover:border-indigo-500"
                  >
                    + Add More
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="h-52 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center p-4 cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all"
            >
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 mb-2">
                <UploadCloud className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Select photos and videos</p>
              <p className="text-xs text-zinc-400 mt-1">Supports HD & 4K media, MP4, WebM, PNG, JPG</p>
            </div>
          )}

          {/* Caption */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase mb-1">
              Caption
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption, mention friends..."
              rows={3}
              className="w-full px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Location & Tags */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase mb-1">
                Location
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Add location"
                  className="w-full pl-9 pr-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase mb-1">
                Hashtags
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="art, nature, tech"
                  className="w-full pl-9 pr-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Progress Bar during upload */}
          {uploading && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Uploading high fidelity media...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || files.length === 0}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 disabled:opacity-50 mt-2"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {uploading ? 'Publishing...' : 'Share to Feed'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreatePostModal;
