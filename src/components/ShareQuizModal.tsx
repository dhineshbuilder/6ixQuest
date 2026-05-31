import React, { useState } from 'react';
import { Quiz } from '../types/database';
import { supabase } from '../lib/supabase';
import { X, Copy, Check, Calendar, Clock, Globe, Lock } from 'lucide-react';

interface ShareQuizModalProps {
  quiz: Quiz;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (quiz: Quiz) => void;
}

const ShareQuizModal: React.FC<ShareQuizModalProps> = ({ quiz, isOpen, onClose, onUpdate }) => {
  const [copied, setCopied] = useState(false);
  const [validFrom, setValidFrom] = useState(
    quiz.valid_from ? new Date(quiz.valid_from).toISOString().slice(0, 16) : ''
  );
  const [validUntil, setValidUntil] = useState(
    quiz.valid_until ? new Date(quiz.valid_until).toISOString().slice(0, 16) : ''
  );
  const [isActive, setIsActive] = useState(quiz.is_active);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const quizUrl = `${window.location.origin}/quiz/${quiz.id}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(quizUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = quizUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Partial<Quiz> = {
        is_active: isActive,
        valid_from: validFrom ? new Date(validFrom).toISOString() : null,
        valid_until: validUntil ? new Date(validUntil).toISOString() : null,
      };

      const { data, error } = await supabase
        .from('quizzes')
        .update(updates)
        .eq('id', quiz.id)
        .select()
        .single();

      if (error) throw error;

      onUpdate(data);
      onClose();
    } catch (error) {
      console.error('Error updating quiz:', error);
      alert('Failed to update quiz settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isCurrentlyAccessible = () => {
    if (!isActive) return false;
    
    const now = new Date();
    const fromDate = validFrom ? new Date(validFrom) : null;
    const untilDate = validUntil ? new Date(validUntil) : null;
    
    if (fromDate && now < fromDate) return false;
    if (untilDate && now > untilDate) return false;
    
    return true;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Share Quiz</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Quiz Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isCurrentlyAccessible() ? (
                <Globe className="h-5 w-5 text-green-600" />
              ) : (
                <Lock className="h-5 w-5 text-red-600" />
              )}
              <span className="text-sm font-medium text-gray-700">
                Quiz Status
              </span>
            </div>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
              isCurrentlyAccessible()
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {isCurrentlyAccessible() ? 'Accessible' : 'Not Accessible'}
            </span>
          </div>

          {/* Quiz URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quiz Link
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={quizUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
              />
              <button
                onClick={copyToClipboard}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center space-x-1"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span className="text-sm">{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Active Status */}
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Quiz is active and can be accessed
              </span>
            </label>
          </div>

          {/* Time Validity */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700 flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Time Restrictions (Optional)</span>
            </h3>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Available From
              </label>
              <input
                type="datetime-local"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Available Until
              </label>
              <input
                type="datetime-local"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            <p className="text-xs text-gray-500">
              Leave empty for no time restrictions. Students can only access the quiz within the specified time window.
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">How to share:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Copy the quiz link and share it with your students</li>
              <li>• Students don't need to create accounts to take the quiz</li>
              <li>• You can set time restrictions to control when the quiz is available</li>
              <li>• Deactivate the quiz to prevent new submissions</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareQuizModal;