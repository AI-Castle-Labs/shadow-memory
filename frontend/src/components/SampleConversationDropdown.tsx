import { useState, useRef, useEffect } from 'react';
import type { Message, SampleConversation } from '../types';
import { sampleConversations } from '../data/sampleConversations';

interface SampleConversationDropdownProps {
  onLoadConversation: (messages: Message[]) => void;
  disabled?: boolean;
}

export function SampleConversationDropdown({ onLoadConversation, disabled }: SampleConversationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<SampleConversation | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (conversation: SampleConversation) => {
    setSelectedConversation(conversation);
  };

  const handleLoad = () => {
    if (!selectedConversation) return;
    
    const messages: Message[] = selectedConversation.messages.map((msg, idx) => ({
      ...msg,
      id: `sample-${selectedConversation.id}-${idx}-${Date.now()}`,
      timestamp: new Date(Date.now() - (selectedConversation.messages.length - idx) * 60000),
    }));
    
    onLoadConversation(messages);
    setIsOpen(false);
    setSelectedConversation(null);
  };

  const getConversationIcon = (id: string) => {
    switch (id) {
      case 'travel':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'finance':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'tech':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        );
    }
  };

  const getConversationAccent = (id: string) => {
    switch (id) {
      case 'travel': return 'violet';
      case 'finance': return 'emerald';
      case 'tech': return 'amber';
      default: return 'cyan';
    }
  };

  const accentClasses: Record<string, { bg: string; border: string; text: string }> = {
    violet: { bg: 'bg-neural-violet/20', border: 'border-neural-violet/50', text: 'text-neural-violet' },
    emerald: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-400' },
    amber: { bg: 'bg-neural-amber/20', border: 'border-neural-amber/50', text: 'text-neural-amber' },
    cyan: { bg: 'bg-neural-cyan/20', border: 'border-neural-cyan/50', text: 'text-neural-cyan' },
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200
          ${disabled 
            ? 'bg-neural-dark/50 border-neural-border/50 text-neural-muted/50 cursor-not-allowed' 
            : isOpen 
              ? 'bg-neural-cyan/10 border-neural-cyan text-neural-cyan' 
              : 'bg-neural-dark border-neural-border text-neural-muted hover:border-neural-cyan/50 hover:text-neural-text'
          }
        `}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <span className="text-xs font-medium">Load Sample</span>
        <svg 
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-80 bg-neural-surface border border-neural-border rounded-xl overflow-hidden shadow-2xl shadow-black/50 z-50 animate-slide-up">
          <div className="p-3 border-b border-neural-border">
            <h3 className="font-display text-sm font-semibold text-neural-text">
              Sample Conversations
            </h3>
            <p className="text-[10px] text-neural-muted mt-0.5">
              Load a pre-built conversation to explore
            </p>
          </div>
          
          <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
            {sampleConversations.map((conversation) => {
              const isSelected = selectedConversation?.id === conversation.id;
              const accent = getConversationAccent(conversation.id);
              const colors = accentClasses[accent];
              
              return (
                <button
                  key={conversation.id}
                  onClick={() => handleSelect(conversation)}
                  className={`
                    w-full flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 text-left
                    ${isSelected 
                      ? `${colors.bg} ${colors.border}` 
                      : 'bg-neural-dark/50 border-transparent hover:border-neural-border hover:bg-neural-dark'
                    }
                  `}
                >
                  <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                    ${isSelected ? colors.bg : 'bg-neural-surface'}
                    border ${isSelected ? colors.border : 'border-neural-border'}
                  `}>
                    <span className={isSelected ? colors.text : 'text-neural-muted'}>
                      {getConversationIcon(conversation.id)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-medium ${isSelected ? colors.text : 'text-neural-text'}`}>
                      {conversation.name}
                    </h4>
                    <p className="text-[10px] text-neural-muted mt-0.5 line-clamp-2">
                      {conversation.description}
                    </p>
                    <span className="text-[10px] text-neural-muted/60 mt-1 block">
                      {conversation.messages.length} messages
                    </span>
                  </div>
                  {isSelected && (
                    <div className={`w-5 h-5 rounded-full ${colors.bg} border ${colors.border} flex items-center justify-center`}>
                      <svg className={`w-3 h-3 ${colors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-3 border-t border-neural-border bg-neural-dark/30">
            <button
              onClick={handleLoad}
              disabled={!selectedConversation}
              className={`
                w-full py-2.5 rounded-lg font-medium text-sm transition-all duration-200
                ${selectedConversation 
                  ? 'bg-neural-cyan text-neural-dark hover:opacity-90 active:scale-[0.98]' 
                  : 'bg-neural-surface border border-neural-border text-neural-muted cursor-not-allowed'
                }
              `}
            >
              {selectedConversation ? `Load "${selectedConversation.name}"` : 'Select a conversation'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
