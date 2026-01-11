import { useState, useEffect } from 'react';
import { validateApiKeyFormat } from '../services/api';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSubmit: (apiKey: string) => void;
  onSkip?: () => void;
  allowSkip?: boolean;
}

export function ApiKeyModal({ isOpen, onSubmit, onSkip, allowSkip = false }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    setIsValidating(true);
    
    const validation = validateApiKeyFormat(apiKey.trim());
    
    if (!validation.valid) {
      setError(validation.error || 'Invalid API key format');
      setIsValidating(false);
      return;
    }

    setIsValidating(false);
    onSubmit(apiKey.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neural-cyan/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neural-violet/5 rounded-full blur-3xl" />
      </div>
      
      <div className="relative w-full max-w-lg animate-slide-up">
        <div className="absolute inset-0 bg-gradient-to-r from-neural-cyan/20 via-neural-violet/20 to-neural-cyan/20 rounded-2xl blur-xl opacity-50" />
        
        <div className="relative bg-neural-surface border border-neural-border rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neural-cyan to-transparent" />
          
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-neural-cyan/20 to-neural-violet/20 flex items-center justify-center border border-neural-border animate-pulse-glow">
                <svg className="w-8 h-8 text-neural-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              
              <h2 className="font-display text-2xl font-bold text-neural-text mb-2">
                API Key Required
              </h2>
              <p className="text-neural-muted text-sm leading-relaxed max-w-sm mx-auto">
                An OpenAI API key is required to use this app. Your key is stored locally and never sent to our servers.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neural-muted uppercase tracking-wider mb-2">
                  OpenAI API Key
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setError(null);
                    }}
                    placeholder="sk-..."
                    className={`
                      neural-input w-full font-mono text-sm pl-10 pr-4 py-3
                      ${error ? 'border-red-500 focus:border-red-500' : ''}
                    `}
                    autoFocus
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <svg className="w-4 h-4 text-neural-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
                
                {error && (
                  <div className="mt-2 flex items-center gap-2 text-red-400 text-xs animate-slide-up">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <div className="bg-neural-dark/50 rounded-lg p-3 border border-neural-border">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-neural-amber mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-xs text-neural-muted leading-relaxed">
                    <p className="mb-1">Get your API key from:</p>
                    <a 
                      href="https://platform.openai.com/api-keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-neural-cyan hover:underline inline-flex items-center gap-1"
                    >
                      platform.openai.com/api-keys
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                {allowSkip && onSkip && (
                  <button
                    type="button"
                    onClick={onSkip}
                    className="neural-button-secondary flex-1 py-3"
                  >
                    Skip for now
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isValidating || !apiKey.trim()}
                  className={`
                    neural-button py-3 flex items-center justify-center gap-2
                    ${allowSkip ? 'flex-1' : 'w-full'}
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {isValidating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-neural-dark/30 border-t-neural-dark rounded-full animate-spin" />
                      <span>Validating...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="px-8 py-4 bg-neural-dark/30 border-t border-neural-border">
            <div className="flex items-center justify-center gap-4 text-[10px] text-neural-muted">
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Stored locally
              </span>
              <span className="w-px h-3 bg-neural-border" />
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Never shared
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
