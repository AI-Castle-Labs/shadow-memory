import { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveApiKey?: (apiKey: string) => void;
  currentApiKey?: string;
  hasApiKey?: boolean;
}

export function SettingsModal({ isOpen, onClose, onSaveApiKey, currentApiKey, hasApiKey }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (currentApiKey) {
      setApiKey(currentApiKey);
    }
  }, [currentApiKey]);

  const handleSave = () => {
    if (onSaveApiKey) {
      onSaveApiKey(apiKey);
    }
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div className="neural-card w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-semibold text-neural-text">Settings</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neural-border transition-colors"
          >
            <svg className="w-5 h-5 text-neural-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neural-muted mb-2">
              OpenAI API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="neural-input w-full font-mono text-sm"
            />
            <p className="mt-2 text-xs text-neural-muted">
              Your API key enables the AI agent to respond intelligently using memory context.
            </p>
          </div>
          
          <div className="pt-4 border-t border-neural-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-neural-muted">AI Agent</span>
              {hasApiKey ? (
                <span className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-neural-cyan animate-pulse"></span>
                  <span className="text-neural-cyan">Active</span>
                </span>
              ) : (
                <span className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-neural-amber"></span>
                  <span className="text-neural-amber">Needs API Key</span>
                </span>
              )}
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-neural-muted">Memory System</span>
              <span className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-neural-cyan animate-pulse"></span>
                <span className="text-neural-cyan">Active</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neural-muted">Version</span>
              <span className="text-xs font-mono text-neural-muted">v1.0.0</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="neural-button-secondary flex-1">
            Cancel
          </button>
          <button onClick={handleSave} className="neural-button flex-1">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
