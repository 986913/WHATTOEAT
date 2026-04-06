import '../styles/components/AiGenerateModal.css';
import { useState } from 'react';
import { Spinner } from 'react-bootstrap';

interface AiGenerateModalProps {
  isLoading: boolean;
  onGenerate: (preference: string) => void;
  onClose: () => void;
}

export default function AiGenerateModal({
  isLoading,
  onGenerate,
  onClose,
}: AiGenerateModalProps) {
  const [preference, setPreference] = useState('');

  const handleGenerate = () => {
    if (!preference.trim() || isLoading) return;
    onGenerate(preference.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleGenerate();
    }
  };

  return (
    <div className='ai-modal-backdrop' onClick={onClose}>
      <div className='ai-modal' onClick={(e) => e.stopPropagation()}>
        <div className='ai-modal-header'>
          <span style={{ fontSize: 22 }}>✨</span>
          <h2 className='ai-modal-title'>AI Meal Plan</h2>
        </div>
        <p className='ai-modal-subtitle'>
          Describe what you're in the mood for — any language is fine
        </p>

        <textarea
          className='ai-modal-textarea'
          placeholder="e.g. light meals this week, no red meat"
          value={preference}
          onChange={(e) => setPreference(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          disabled={isLoading}
        />

        <div className='ai-modal-footer'>
          <button className='ai-modal-btn-cancel' onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button
            className='ai-modal-btn-generate'
            onClick={handleGenerate}
            disabled={!preference.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <Spinner animation='border' size='sm' /> Starting...
              </>
            ) : (
              <>✨ Generate</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
