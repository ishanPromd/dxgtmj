import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Type, Edit3 } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

interface TextCustomizationModalProps {
  currentTexts: {
    heroTitle: string;
    heroSubtitle: string;
    featuredSectionTitle: string;
  };
  onClose: () => void;
  onSave: (texts: typeof currentTexts) => void;
}

export const TextCustomizationModal: React.FC<TextCustomizationModalProps> = ({
  currentTexts,
  onClose,
  onSave,
}) => {
  const { user } = useAuth();
  const [texts, setTexts] = useState(currentTexts);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('app_texts')
        .insert({
          hero_title: texts.heroTitle,
          hero_subtitle: texts.heroSubtitle,
          featured_section_title: texts.featuredSectionTitle,
          created_by: user.id
        });

      if (error) {
        console.error('Error updating app texts:', error);
        toast.error('Failed to update app texts');
        return;
      }

      onSave(texts);
      toast.success('App texts updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error updating app texts:', error);
      toast.error('Failed to update app texts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Type className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Customize App Texts</h2>
                <p className="text-sm text-gray-600">Update the text content shown to users</p>
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

        <div className="p-6 space-y-6">
          {/* Hero Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Edit3 className="w-4 h-4 inline mr-1" />
              Hero Title
            </label>
            <input
              type="text"
              value={texts.heroTitle}
              onChange={(e) => setTexts({ ...texts, heroTitle: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter hero title"
            />
            <p className="text-xs text-gray-500 mt-1">
              This appears as the main title in the user dashboard hero section
            </p>
          </div>

          {/* Hero Subtitle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Edit3 className="w-4 h-4 inline mr-1" />
              Hero Subtitle
            </label>
            <input
              type="text"
              value={texts.heroSubtitle}
              onChange={(e) => setTexts({ ...texts, heroSubtitle: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter hero subtitle"
            />
            <p className="text-xs text-gray-500 mt-1">
              This appears as the subtitle below the hero title
            </p>
          </div>

          {/* Featured Section Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Edit3 className="w-4 h-4 inline mr-1" />
              Featured Section Title
            </label>
            <input
              type="text"
              value={texts.featuredSectionTitle}
              onChange={(e) => setTexts({ ...texts, featuredSectionTitle: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter featured section title"
            />
            <p className="text-xs text-gray-500 mt-1">
              This appears as the title above the subjects section
            </p>
          </div>

          {/* Preview */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h4 className="font-medium text-gray-900 mb-3">Preview</h4>
            <div className="space-y-3">
              <div className="bg-blue-500 text-white p-4 rounded-lg">
                <h3 className="font-bold text-lg">{texts.heroTitle || 'Hero Title'}</h3>
                <p className="text-blue-100 text-sm">{texts.heroSubtitle || 'Hero subtitle'}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border">
                <h4 className="font-semibold text-gray-900">
                  {texts.featuredSectionTitle || 'Featured Section Title'}
                </h4>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              loading={loading}
              disabled={!texts.heroTitle || !texts.heroSubtitle || !texts.featuredSectionTitle}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};