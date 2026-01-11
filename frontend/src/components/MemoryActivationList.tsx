import type { MemoryActivation } from '../types';

interface MemoryActivationListProps {
  activations: MemoryActivation[];
}

const categoryColors: Record<MemoryActivation['category'], string> = {
  conversation: 'bg-neural-cyan',
  knowledge: 'bg-neural-violet',
  context: 'bg-neural-amber',
  preference: 'bg-emerald-400',
};

const categoryLabels: Record<MemoryActivation['category'], string> = {
  conversation: 'CONV',
  knowledge: 'KNOW',
  context: 'CTX',
  preference: 'PREF',
};

export function MemoryActivationList({ activations }: MemoryActivationListProps) {
  const selectedCount = activations.filter(a => a.selected).length;
  
  return (
    <div className="neural-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm font-semibold text-neural-text uppercase tracking-wider">
          Memory Candidates
        </h3>
        <span className="text-xs font-mono text-neural-muted">
          {selectedCount}/{activations.length} selected
        </span>
      </div>
      
      <div className="space-y-3">
        {activations.map((memory, index) => (
          <div
            key={memory.id}
            className={`group relative rounded-lg p-3 border transition-all duration-300 animate-slide-up ${
              memory.selected 
                ? 'bg-neural-dark border-neural-cyan/50' 
                : 'bg-neural-dark/50 border-neural-border opacity-60'
            }`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {memory.selected && (
                    <span className="w-4 h-4 rounded-full bg-neural-cyan flex items-center justify-center flex-shrink-0">
                      <svg className="w-2.5 h-2.5 text-neural-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                  {!memory.selected && (
                    <span className="w-4 h-4 rounded-full border border-neural-border flex-shrink-0" />
                  )}
                  <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${categoryColors[memory.category]} text-neural-dark`}>
                    {categoryLabels[memory.category]}
                  </span>
                  <h4 className="text-sm font-medium text-neural-text truncate">
                    {memory.title}
                  </h4>
                </div>
                <p className="text-xs text-neural-muted line-clamp-2 leading-relaxed pl-6">
                  {memory.summary}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 pl-6">
              <div className="flex-1 h-1.5 bg-neural-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    memory.selected
                      ? memory.score > 0.8
                        ? 'bg-neural-cyan glow-cyan'
                        : memory.score > 0.5
                        ? 'bg-neural-amber'
                        : 'bg-neural-violet'
                      : 'bg-neural-muted'
                  }`}
                  style={{ width: `${memory.score * 100}%` }}
                />
              </div>
              <span className={`text-xs font-mono font-semibold min-w-[3rem] text-right ${
                memory.selected ? 'text-neural-amber' : 'text-neural-muted'
              }`}>
                {(memory.score * 100).toFixed(0)}%
              </span>
            </div>
            
            {memory.selected && (
              <div
                className="absolute inset-0 rounded-lg pointer-events-none"
                style={{
                  boxShadow: `0 0 15px rgba(0, 240, 255, ${memory.score * 0.2})`,
                }}
              />
            )}
          </div>
        ))}
        
        {activations.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-neural-border flex items-center justify-center">
              <svg className="w-6 h-6 text-neural-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <p className="text-sm text-neural-muted">No memories yet</p>
            <p className="text-xs text-neural-muted/60 mt-1">Start a conversation to build memory</p>
          </div>
        )}
      </div>
    </div>
  );
}
