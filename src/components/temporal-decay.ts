import { ITemporalDecay, DecayConfig } from '../interfaces/temporal-decay';
import { MemoryId } from '../types/core';

/**
 * Temporal decay system for aging memories
 * Implements configurable decay functions to reduce activation scores over time
 */
export class TemporalDecay implements ITemporalDecay {
  private decayConfigs: Map<string, DecayConfig> = new Map();
  private defaultConfig: DecayConfig = {
    type: 'exponential',
    halfLife: 30 // 30 days default half-life
  };

  constructor() {
    // Set global default configuration
    this.decayConfigs.set('global', this.defaultConfig);
  }

  /**
   * Configure decay function for a specific memory type or globally
   */
  configureDecay(contextType: string | 'global', config: DecayConfig): void {
    // Validate configuration
    this.validateDecayConfig(config);
    this.decayConfigs.set(contextType, config);
  }

  /**
   * Apply decay to an activation score based on memory age
   */
  applyDecay(activationScore: number, memoryAge: number, contextType?: string): number {
    const decayFactor = this.getDecayFactor(memoryAge, contextType);
    return activationScore * decayFactor;
  }

  /**
   * Get the decay factor for a given age and context type
   */
  getDecayFactor(memoryAge: number, contextType?: string): number {
    const config = this.getDecayConfig(contextType);
    
    // Memory age is expected in days
    if (memoryAge < 0) {
      throw new Error('Memory age cannot be negative');
    }

    switch (config.type) {
      case 'exponential':
        return this.calculateExponentialDecay(memoryAge, config.halfLife || 30);
      
      case 'linear':
        return this.calculateLinearDecay(memoryAge, config.rate || 0.01);
      
      case 'logarithmic':
        return this.calculateLogarithmicDecay(memoryAge, config.base || 2);
      
      case 'step':
        return this.calculateStepDecay(memoryAge, config.steps || []);
      
      default:
        throw new Error(`Unknown decay type: ${config.type}`);
    }
  }

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
  }> {
    return memories.map(memory => {
      const decayFactor = this.getDecayFactor(memory.age, memory.contextType);
      const decayedScore = memory.activationScore * decayFactor;
      
      return {
        memoryId: memory.memoryId,
        originalScore: memory.activationScore,
        decayedScore,
        decayFactor
      };
    });
  }

  /**
   * Get current decay configuration
   */
  getDecayConfig(contextType?: string): DecayConfig {
    // Try specific context type first, then fall back to global
    if (contextType && this.decayConfigs.has(contextType)) {
      return this.decayConfigs.get(contextType)!;
    }
    return this.decayConfigs.get('global') || this.defaultConfig;
  }

  /**
   * Calculate exponential decay factor
   * Formula: factor = 0.5^(age / halfLife)
   */
  private calculateExponentialDecay(age: number, halfLife: number): number {
    if (halfLife <= 0) {
      throw new Error('Half-life must be positive');
    }
    return Math.pow(0.5, age / halfLife);
  }

  /**
   * Calculate linear decay factor
   * Formula: factor = max(0, 1 - (age * rate))
   */
  private calculateLinearDecay(age: number, rate: number): number {
    if (rate < 0) {
      throw new Error('Decay rate cannot be negative');
    }
    return Math.max(0, 1 - (age * rate));
  }

  /**
   * Calculate logarithmic decay factor
   * Formula: factor = 1 / (1 + log_base(age + 1))
   */
  private calculateLogarithmicDecay(age: number, base: number): number {
    if (base <= 1) {
      throw new Error('Logarithmic base must be greater than 1');
    }
    if (age === 0) {
      return 1; // No decay for age 0
    }
    return 1 / (1 + Math.log(age + 1) / Math.log(base));
  }

  /**
   * Calculate step decay factor based on age thresholds
   */
  private calculateStepDecay(age: number, steps: Array<{ age: number; factor: number }>): number {
    if (steps.length === 0) {
      return 1; // No decay if no steps defined
    }

    // Sort steps by age to ensure correct application
    const sortedSteps = [...steps].sort((a, b) => a.age - b.age);
    
    // Find the appropriate step
    for (let i = sortedSteps.length - 1; i >= 0; i--) {
      if (age >= sortedSteps[i].age) {
        return Math.max(0, Math.min(1, sortedSteps[i].factor));
      }
    }
    
    // If age is less than the first step, no decay
    return 1;
  }

  /**
   * Validate decay configuration
   */
  private validateDecayConfig(config: DecayConfig): void {
    switch (config.type) {
      case 'exponential':
        if (config.halfLife !== undefined && config.halfLife <= 0) {
          throw new Error('Half-life must be positive for exponential decay');
        }
        break;
      
      case 'linear':
        if (config.rate !== undefined && config.rate < 0) {
          throw new Error('Rate cannot be negative for linear decay');
        }
        break;
      
      case 'logarithmic':
        if (config.base !== undefined && config.base <= 1) {
          throw new Error('Base must be greater than 1 for logarithmic decay');
        }
        break;
      
      case 'step':
        if (config.steps) {
          for (const step of config.steps) {
            if (step.age < 0) {
              throw new Error('Step age cannot be negative');
            }
            if (step.factor < 0 || step.factor > 1) {
              throw new Error('Step factor must be between 0 and 1');
            }
          }
        }
        break;
      
      default:
        throw new Error(`Unknown decay type: ${config.type}`);
    }
  }
}