/**
 * Mercury Protocol Enhancement - Phase 2
 * Main export module for enhanced Brain Manager with context learning
 */

export { ContextWindowAnalyzer } from './ContextWindowAnalyzer.js';
export { MercuryProtocolBridge } from './MercuryProtocolBridge.js';
export { BrainManagerV2 } from './BrainManagerV2.js';

// Export all types
export type {
  ConversationMessage,
  ToolCall,
  SuccessMetrics,
  AnalysisInsight,
  ContextAnalysisResult,
  ToolPattern
} from './ContextWindowAnalyzer.js';

export type {
  MercurySession,
  BrainIntegrationConfig,
  LearningInsight
} from './MercuryProtocolBridge.js';

export type {
  BrainManagerConfig,
  ProjectContext,
  SessionAnalytics
} from './BrainManagerV2.js';

// Version and metadata
export const VERSION = '2.0.0';
export const PHASE = 'Phase 2 - Full Integration';
export const FEATURES = [
  'Advanced context window analysis',
  'Behavioral success detection',
  'Automatic learning integration',
  'Enhanced Brain Manager with Mercury insights',
  'Zero-overhead learning workflow',
  'Pattern recognition and recommendations'
] as const;
