// Core interfaces for the Shadow Memory System
export { IContextProcessor } from './context-processor';
export { IMemoryStore } from './memory-store';
export { ISimilarityEngine } from './similarity-engine';
export { IActivationScorer } from './activation-scorer';
export { IThresholdManager } from './threshold-manager';
export { IMemoryAwarenessInterface } from './memory-awareness';
export { IBenchmarkManager } from './benchmark-manager';
export { IShadowMemorySystem } from './shadow-memory-system';
export { ITemporalDecay } from './temporal-decay';
export { IMemoryArchival } from './memory-archival';
export { ICleanupRecommendation } from './cleanup-recommendation';
export { IMemoryLifecycleManager } from './memory-lifecycle-manager';
export { IConversationSimulator, IConversationScenarioGenerator } from './conversation-simulation';
export { IMemoryAwarenessEvaluator, IResponseQualityAssessor } from './memory-evaluation';
export { IPerformanceDashboard, IPerformanceMonitor, IReportGenerator } from './performance-dashboard';