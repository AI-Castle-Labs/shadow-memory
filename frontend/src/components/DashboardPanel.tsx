import type { ConversationStats, MemoryActivation } from '../types';
import { MemoryActivationList } from './MemoryActivationList';

interface DashboardPanelProps {
  stats: ConversationStats;
  activations: MemoryActivation[];
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent: 'cyan' | 'violet' | 'amber';
}

function StatCard({ label, value, icon, accent }: StatCardProps) {
  const accentClasses = {
    cyan: 'text-neural-cyan border-neural-cyan/30',
    violet: 'text-neural-violet border-neural-violet/30',
    amber: 'text-neural-amber border-neural-amber/30',
  };

  return (
    <div className={`bg-neural-dark rounded-lg p-3 border ${accentClasses[accent]} transition-all hover:scale-[1.02]`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={accentClasses[accent]}>{icon}</span>
        <span className="text-[10px] font-medium text-neural-muted uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className={`text-2xl font-mono font-bold ${accentClasses[accent].split(' ')[0]}`}>
        {value}
      </p>
    </div>
  );
}

export function DashboardPanel({ stats, activations }: DashboardPanelProps) {
  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-y-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neural-cyan/20 to-neural-violet/20 flex items-center justify-center border border-neural-border">
          <svg className="w-5 h-5 text-neural-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-neural-text">Memory Core</h2>
          <p className="text-xs text-neural-muted">Neural activation monitor</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Total Memories"
          value={stats.totalMemories}
          accent="cyan"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />
        <StatCard
          label="Avg Activation"
          value={`${(stats.avgActivationScore * 100).toFixed(0)}%`}
          accent="amber"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <StatCard
          label="Retrieved"
          value={stats.memoriesRetrieved}
          accent="violet"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          }
        />
        <StatCard
          label="Turns"
          value={stats.conversationTurns}
          accent="cyan"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          }
        />
      </div>

      <div className="flex-1 min-h-0">
        <MemoryActivationList activations={activations} />
      </div>

      <div className="neural-card bg-gradient-to-r from-neural-surface to-neural-dark">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neural-cyan/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-neural-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-xs text-neural-muted">System latency</p>
            <p className="text-sm font-mono text-neural-text">
              <span className="text-neural-cyan">12ms</span>
              <span className="text-neural-muted mx-2">|</span>
              <span className="text-neural-muted">avg 18ms</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
