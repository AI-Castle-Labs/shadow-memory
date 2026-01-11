import { MemoryId } from '../types/core';

/**
 * Configuration for different decay functions
 */
export interface DecayConfig {
  type: 'exponential' | 'linear' | 'logarithmic' | 'step';
  halfLife?: number; // For exponential decay (in days)
  rate?: number; // For linear decay (per day)
  base?: number; // For logarithmic decay
  steps?: Array<{ age: number; factor: number }>; // For step decay
}

/**
 * Interface for temporal decay management
 */
export interface ITemporalDecay {
  /**
   * Configure decay function for a specific memory type or globally
   */
  configureDecay(contextType: string | 'global', config: DecayConfig): void;

  /**
   * Apply decay to an activation score based on memory age
   */
  applyDecay(activationScore: number, memoryAge: number, contextType?: string): number;

  /**
   * Get the decay factor for a given age and context type
   */
  getDecayFactor(memoryAge: number, contextType?: string): number;

  /**
   * Batch apply decay to multiple memories
   */
  batchApplyDecay(memories: Array<{
    memoryId: MemoryId;
    activationScore: number;
    age: number;
    contextType?: string;
  }>): Array<{
    memoryId: MemoryId;
    originalScore: number;
    decayedScore: number;
    decayFactor: number;
  }>;

  /**
   * Get current decay configuration
   */
  getDecayConfig(contextType?: string): DecayConfig;
}