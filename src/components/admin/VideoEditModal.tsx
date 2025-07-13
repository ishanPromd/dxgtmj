import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Youtube, Link, Tag, FileText, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';

interface LessonVideo {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  thumbnail_url: string;
  duration: string;
  lessonId: string;
  subjectId: string;
  created_at: string;
}

interface VideoEditModalProps {
  video: LessonVideo;
  onClose: () => void;
  onSubmit: (video: {
    title: string;
    description: string;
    youtubeUrl: string;
    thumbnailUrl: string;
    duration: string;
  }) => void;
}

export const VideoEditModal: React.FC<VideoEditModalProps> = ({ video, onClose, onSubmit }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: video.title,
    description: video.description,
    youtubeUrl: video.youtube_url,
    thumbnailUrl: video.thumbnail_url,
    duration: video.duration,
  });

  const extractVideoId = (url: string): string => {
    // Support both regular YouTube videos and live streams
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/live\/([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return '';
  };

  const generateThumbnailUrl = (url: string): string => {
    const videoId = extractVideoId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
  };

  // Auto-generate thumbnail when YouTube URL changes
  React.useEffect(() => {
    if (formData.youtubeUrl && formData.youtubeUrl !== video.youtube_url) {
      const thumbnailUrl = generateThumbnailUrl(formData.youtubeUrl);
      if (thumbnailUrl) {
        setFormData(prev => ({ ...prev, thumbnailUrl }));
      }
    }
  }, [formData.youtubeUrl, video.youtube_url]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.youtubeUrl) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!extractVideoId(formData.youtubeUrl)) {
      toast.error('Please enter a valid YouTube URL (supports videos and live streams)');
      return;
    }

    setLoading(true);
    try {
      const videoData = {
        title: formData.title,
        description: formData.description,
        youtubeUrl: formData.youtubeUrl,
        thumbnailUrl: formData.thumbnailUrl || generateThumbnailUrl(formData.youtubeUrl),
        duration: formData.duration || '0:00',
      };

      onSubmit(videoData);
    } catch (error) {
      console.error('Error updating video:', error);
      toast.error('Failed to update video');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Youtube className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Edit Video</h2>
                <p className="text-sm text-gray-600">Update video information and settings</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Video Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter video title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Link className="w-4 h-4 inline mr-1" />
              YouTube URL *
            </label>
            <input
              type="url"
              value={formData.youtubeUrl}
              onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Supports YouTube videos, live streams, and shorts
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Thumbnail URL (Optional)
            </label>
            <input
              type="url"
              value={formData.thumbnailUrl}
              onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/custom-thumbnail.jpg"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to use YouTube's default thumbnail
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Describe what this video covers"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Duration (optional)
            </label>
            <input
              type="text"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 15:30 or LIVE"
            />
          </div>

          {/* Preview */}
          {formData.youtubeUrl && extractVideoId(formData.youtubeUrl) && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-2">Preview</h4>
              <div className="flex items-start space-x-3">
                <img
                  src={formData.thumbnailUrl || generateThumbnailUrl(formData.youtubeUrl)}
                  alt="Video thumbnail"
                  className="w-24 h-16 object-cover rounded"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/120x90?text=Video';
                  }}
                />
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-900">
                    {formData.title || 'Video Title'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {formData.description || 'Video description will appear here...'}
                  </p>
                  {formData.duration && (
                    <span className="text-xs text-gray-500 mt-2 inline-block">
                      Duration: {formData.duration}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={!formData.title || !formData.description || !formData.youtubeUrl}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Update Video
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};