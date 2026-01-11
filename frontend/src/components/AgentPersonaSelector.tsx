import { useState } from 'react';
import type { AgentPersona, AgentPersonaId } from '../types';
import { agentPersonas } from '../data/personas';

interface AgentPersonaSelectorProps {
  selectedId: AgentPersonaId;
  onSelect: (persona: AgentPersona) => void;
}

function PersonaIcon({ icon, className }: { icon: AgentPersona['icon']; className?: string }) {
  const iconClass = className || 'w-4 h-4';
  
  switch (icon) {
    case 'sparkles':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      );
    case 'plane':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      );
    case 'chart':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case 'terminal':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case 'target':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
  }
}

const accentColorClasses: Record<AgentPersona['accentColor'], { bg: string; border: string; text: string; glow: string }> = {
  cyan: {
    bg: 'bg-neural-cyan/20',
    border: 'border-neural-cyan',
    text: 'text-neural-cyan',
    glow: 'shadow-[0_0_20px_rgba(0,240,255,0.3)]',
  },
  violet: {
    bg: 'bg-neural-violet/20',
    border: 'border-neural-violet',
    text: 'text-neural-violet',
    glow: 'shadow-[0_0_20px_rgba(139,92,246,0.3)]',
  },
  amber: {
    bg: 'bg-neural-amber/20',
    border: 'border-neural-amber',
    text: 'text-neural-amber',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]',
  },
  emerald: {
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500',
    text: 'text-emerald-400',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]',
  },
  rose: {
    bg: 'bg-rose-500/20',
    border: 'border-rose-500',
    text: 'text-rose-400',
    glow: 'shadow-[0_0_20px_rgba(244,63,94,0.3)]',
  },
};

export function AgentPersonaSelector({ selectedId, onSelect }: AgentPersonaSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const selectedPersona = agentPersonas.find(p => p.id === selectedId) || agentPersonas[0];
  const colors = accentColorClasses[selectedPersona.accentColor];

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2">
        {agentPersonas.map((persona) => {
          const isSelected = persona.id === selectedId;
          const personaColors = accentColorClasses[persona.accentColor];
          
          return (
            <button
              key={persona.id}
              onClick={() => {
                onSelect(persona);
                setIsExpanded(persona.id === selectedId ? !isExpanded : true);
              }}
              className={`
                group flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-300
                ${isSelected 
                  ? `${personaColors.bg} ${personaColors.border} ${personaColors.glow}` 
                  : 'bg-neural-dark border-neural-border hover:border-neural-muted'
                }
              `}
            >
              <div className={`
                w-6 h-6 rounded-md flex items-center justify-center transition-colors
                ${isSelected ? personaColors.bg : 'bg-neural-surface'}
              `}>
                <PersonaIcon 
                  icon={persona.icon} 
                  className={`w-3.5 h-3.5 ${isSelected ? personaColors.text : 'text-neural-muted group-hover:text-neural-text'}`}
                />
              </div>
              <span className={`
                text-xs font-medium transition-colors
                ${isSelected ? personaColors.text : 'text-neural-muted group-hover:text-neural-text'}
              `}>
                {persona.name}
              </span>
            </button>
          );
        })}
      </div>

      {isExpanded && (
        <div 
          className={`
            mt-3 p-4 rounded-lg border animate-slide-up
            ${colors.bg} ${colors.border}/30
          `}
        >
          <div className="flex items-start gap-3">
            <div className={`
              w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
              ${colors.bg} border ${colors.border}/50
            `}>
              <PersonaIcon icon={selectedPersona.icon} className={`w-5 h-5 ${colors.text}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`font-display font-semibold ${colors.text}`}>
                {selectedPersona.name}
              </h4>
              <p className="text-xs text-neural-muted mt-1 leading-relaxed">
                {selectedPersona.description}
              </p>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-neural-muted hover:text-neural-text transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { PersonaIcon };
