import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ShieldAlert, X, CheckCircle, AlertTriangle } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'post' | 'reel' | 'story' | 'user' | 'comment';
  targetId: string;
  targetAuthorId?: string;
  targetAuthorUsername?: string;
  targetContentPreview?: string;
}

const REPORT_REASONS = [
  'Spam or misleading content',
  'Hate speech or harassment',
  'Violence or dangerous content',
  'Nudity or sexual content',
  'Intellectual property violation',
  'Scam or fraudulent activity',
  'Other community guidelines violation'
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetAuthorId,
  targetAuthorUsername,
  targetContentPreview
}) => {
  const { user, profile } = useAuth();
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: user.uid,
        reporterUsername: profile?.username || 'anonymous',
        targetType,
        targetId,
        targetAuthorId: targetAuthorId || null,
        targetAuthorUsername: targetAuthorUsername || null,
        targetContentPreview: targetContentPreview || null,
        reason: selectedReason,
        details: details.trim(),
        status: 'pending',
        createdAt: Date.now()
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to submit report:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl overflow-hidden relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="py-8 text-center flex flex-col items-center">
            <CheckCircle className="w-14 h-14 text-emerald-500 mb-3 animate-bounce" />
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Report Submitted</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
              Thank you for keeping MediaSphere safe. Our administrative moderation team will review this promptly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-500">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Report {targetType}</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Help protect the community</p>
              </div>
            </div>

            {targetAuthorUsername && (
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300">
                Reporting item by <span className="font-semibold text-zinc-900 dark:text-white">@{targetAuthorUsername}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase">
                Reason for report
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {REPORT_REASONS.map((r) => (
                  <label
                    key={r}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border text-sm cursor-pointer transition-colors ${
                      selectedReason === r
                        ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-medium'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={r}
                      checked={selectedReason === r}
                      onChange={() => setSelectedReason(r)}
                      className="accent-indigo-600"
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase">
                Additional Details (Optional)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={2}
                placeholder="Provide context for our moderators..."
                className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 text-sm font-semibold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-rose-500/20"
              >
                <AlertTriangle className="w-4 h-4" />
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReportModal;
