import { useState, useRef, useEffect } from 'react';
import type { Message, AgentPersona } from '../types';

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  disabled?: boolean;
  selectedPersona?: AgentPersona;
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  
  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}
    >
      <div className={`flex gap-3 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div
          className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${
            isUser
              ? 'bg-neural-cyan/20 border border-neural-cyan/30'
              : 'bg-neural-violet/20 border border-neural-violet/30'
          }`}
        >
          {isUser ? (
            <svg className="w-4 h-4 text-neural-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-neural-violet" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          )}
        </div>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-neural-cyan text-neural-dark rounded-tr-sm'
              : 'bg-neural-surface border border-neural-border text-neural-text rounded-tl-sm'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          <p
            className={`text-[10px] mt-1.5 ${
              isUser ? 'text-neural-dark/60' : 'text-neural-muted'
            }`}
          >
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ChatPanel({ messages, onSendMessage, disabled, selectedPersona }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-neural-cyan/20 to-neural-violet/20 flex items-center justify-center mb-6 border border-neural-border">
              <svg className="w-10 h-10 text-neural-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="font-display text-xl font-semibold text-neural-text mb-2">
              {selectedPersona ? `${selectedPersona.name} Ready` : 'Shadow Memory Active'}
            </h3>
            <p className="text-neural-muted text-sm max-w-md leading-relaxed">
              {selectedPersona?.description || 'Your conversation history persists in the neural substrate. Ask anything and watch relevant memories surface in real-time.'}
            </p>
            <div className="flex gap-2 mt-6">
              <span className="px-3 py-1.5 rounded-full bg-neural-surface border border-neural-border text-xs text-neural-muted">
                Memory retrieval
              </span>
              <span className="px-3 py-1.5 rounded-full bg-neural-surface border border-neural-border text-xs text-neural-muted">
                Context awareness
              </span>
              <span className="px-3 py-1.5 rounded-full bg-neural-surface border border-neural-border text-xs text-neural-muted">
                Semantic search
              </span>
            </div>
            {disabled && (
              <div className="mt-6 px-4 py-3 rounded-lg bg-neural-amber/10 border border-neural-amber/30">
                <div className="flex items-center gap-2 text-neural-amber text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Add an API key to start chatting</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="p-4 border-t border-neural-border bg-neural-dark/50 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={disabled ? "Add an API key to start chatting..." : "Enter your message..."}
              disabled={disabled}
              rows={1}
              className={`neural-input w-full resize-none pr-12 min-h-[44px] max-h-[120px] ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{
                height: 'auto',
                minHeight: '44px',
              }}
            />
            <div className="absolute right-3 bottom-2.5 text-[10px] text-neural-muted font-mono">
              {input.length > 0 && `${input.length}`}
            </div>
          </div>
          <button
            type="submit"
            disabled={!input.trim() || disabled}
            className="neural-button px-4 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 self-end h-[44px]"
          >
            <span>Send</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </form>
        <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-neural-muted">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-neural-surface border border-neural-border font-mono">Enter</kbd>
            <span>to send</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-neural-surface border border-neural-border font-mono">Shift + Enter</kbd>
            <span>for new line</span>
          </span>
        </div>
      </div>
    </div>
  );
}
