/**
 * Context Window Analyzer - Mercury Protocol Enhancement
 * Analyzes conversation context and tool call patterns for intelligent session completion
 */

export interface ToolCall {
  name: string;
  timestamp: number;
  parameters: Record<string, any>;
  result: 'success' | 'error' | 'partial';
  resultData?: any;
  followedBy?: string;
  timeToNext?: number;
}

export interface RepetitionPattern {
  toolName: string;
  callCount: number;
  parameterVariations: number;
  timeSpan: number;
  likelyFailure: boolean;
  confidence: number;
}

export interface ProgressionPattern {
  toolSequence: string[];
  transitionType: 'success' | 'exploration' | 'failure' | 'resolution';
  confidence: number;
  timespan: number;
  description: string;
}

export interface ContextAnalysis {
  sessionId: string;
  toolSequence: ToolCall[];
  repetitionPatterns: RepetitionPattern[];
  progressionPatterns: ProgressionPattern[];
  successScore: number;
  effectiveTools: string[];
  failedApproaches: string[];
  sessionDuration: number;
  totalToolCalls: number;
  uniqueTools: number;
  errorRate: number;
  resolutionRate: number;
  userSatisfactionIndicators: string[];
  learningInsights: string[];
}

export interface ConversationContext {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    toolCalls?: ToolCall[];
  }>;
  sessionStart: number;
  sessionEnd?: number;
}

export class ContextWindowAnalyzer {
  
  /**
   * Main analysis function - analyzes conversation context for tool patterns
   */
  analyzeToolPatterns(
    contextWindow: ConversationContext, 
    sessionId: string = 'unknown'
  ): ContextAnalysis {
    const toolCalls = this.extractToolCalls(contextWindow);
    const repetitionPatterns = this.detectRepetitionPatterns(toolCalls);
    const progressionPatterns = this.detectProgressionPatterns(toolCalls);
    const successScore = this.calculateSuccessScore(toolCalls, repetitionPatterns, progressionPatterns);
    
    const analysis: ContextAnalysis = {
      sessionId,
      toolSequence: toolCalls,
      repetitionPatterns,
      progressionPatterns,
      successScore,
      effectiveTools: this.identifyEffectiveTools(toolCalls, progressionPatterns),
      failedApproaches: this.identifyFailedApproaches(repetitionPatterns),
      sessionDuration: this.calculateSessionDuration(contextWindow),
      totalToolCalls: toolCalls.length,
      uniqueTools: new Set(toolCalls.map(t => t.name)).size,
      errorRate: this.calculateErrorRate(toolCalls),
      resolutionRate: this.calculateResolutionRate(progressionPatterns),
      userSatisfactionIndicators: this.detectSatisfactionIndicators(contextWindow),
      learningInsights: this.generateLearningInsights(toolCalls, repetitionPatterns, progressionPatterns)
    };
    
    return analysis;
  }

  /**
   * Extract tool calls from conversation messages
   */
  private extractToolCalls(contextWindow: ConversationContext): ToolCall[] {
    const toolCalls: ToolCall[] = [];
    
    contextWindow.messages.forEach(message => {
      if (message.toolCalls) {
        toolCalls.push(...message.toolCalls);
      }
    });
    
    // Sort by timestamp and add followedBy information
    toolCalls.sort((a, b) => a.timestamp - b.timestamp);
    
    for (let i = 0; i < toolCalls.length - 1; i++) {
      toolCalls[i].followedBy = toolCalls[i + 1].name;
      toolCalls[i].timeToNext = toolCalls[i + 1].timestamp - toolCalls[i].timestamp;
    }
    
    return toolCalls;
  }

  /**
   * Detect repetition patterns that indicate failure or inefficiency
   */
  detectRepetitionPatterns(toolCalls: ToolCall[]): RepetitionPattern[] {
    const toolGroups = new Map<string, ToolCall[]>();
    
    // Group tool calls by name
    toolCalls.forEach(call => {
      if (!toolGroups.has(call.name)) {
        toolGroups.set(call.name, []);
      }
      toolGroups.get(call.name)!.push(call);
    });
    
    const patterns: RepetitionPattern[] = [];
    
    toolGroups.forEach((calls, toolName) => {
      if (calls.length > 1) {
        const timeSpan = calls[calls.length - 1].timestamp - calls[0].timestamp;
        const parameterVariations = this.countParameterVariations(calls);
        const hasErrors = calls.some(call => call.result === 'error');
        const rapidRepetition = timeSpan < 300000; // 5 minutes
        
        // Consider it likely failure if repeated rapidly with errors or many parameter variations
        const likelyFailure = (rapidRepetition && hasErrors) || parameterVariations > calls.length / 2;
        
        patterns.push({
          toolName,
          callCount: calls.length,
          parameterVariations,
          timeSpan,
          likelyFailure,
          confidence: this.calculateRepetitionConfidence(calls, hasErrors, rapidRepetition)
        });
      }
    });
    
    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Detect progression patterns that indicate success or exploration
   */
  detectProgressionPatterns(toolCalls: ToolCall[]): ProgressionPattern[] {
    const patterns: ProgressionPattern[] = [];
    
    // Look for sequences of different tools (progression indicators)
    for (let i = 0; i < toolCalls.length - 2; i++) {
      const sequence = toolCalls.slice(i, i + 3);
      const toolNames = sequence.map(call => call.name);
      
      // Skip if all same tool (that's repetition, not progression)
      if (new Set(toolNames).size === 1) continue;
      
      const hasErrors = sequence.some(call => call.result === 'error');
      const timespan = sequence[sequence.length - 1].timestamp - sequence[0].timestamp;
      
      let transitionType: ProgressionPattern['transitionType'] = 'exploration';
      let confidence = 0.5;
      let description = 'Tool sequence';
      
      // Analyze transition patterns
      if (!hasErrors && new Set(toolNames).size === toolNames.length) {
        // All different tools, no errors = likely success
        transitionType = 'success';
        confidence = 0.8;
        description = 'Successful tool progression';
      } else if (hasErrors && sequence[sequence.length - 1].result === 'success') {
        // Errors followed by success = resolution
        transitionType = 'resolution';
        confidence = 0.9;
        description = 'Problem resolution sequence';
      } else if (hasErrors) {
        // Multiple errors = failure pattern
        transitionType = 'failure';
        confidence = 0.7;
        description = 'Failed tool sequence';
      }
      
      patterns.push({
        toolSequence: toolNames,
        transitionType,
        confidence,
        timespan,
        description
      });
    }
    
    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate overall success score based on behavioral patterns
   */
  calculateSuccessScore(
    toolCalls: ToolCall[], 
    repetitionPatterns: RepetitionPattern[], 
    progressionPatterns: ProgressionPattern[]
  ): number {
    let score = 0.5; // Baseline neutral score
    
    // Penalize excessive repetition
    repetitionPatterns.forEach(pattern => {
      if (pattern.likelyFailure) {
        score -= 0.1 * pattern.confidence;
      }
    });
    
    // Reward successful progressions
    progressionPatterns.forEach(pattern => {
      if (pattern.transitionType === 'success') {
        score += 0.15 * pattern.confidence;
      } else if (pattern.transitionType === 'resolution') {
        score += 0.2 * pattern.confidence;
      } else if (pattern.transitionType === 'failure') {
        score -= 0.1 * pattern.confidence;
      }
    });
    
    // Penalize high error rate
    const errorRate = this.calculateErrorRate(toolCalls);
    if (errorRate > 0.3) {
      score -= 0.2 * (errorRate - 0.3);
    }
    
    // Reward if session ended without recent repetition
    const recentCalls = toolCalls.slice(-3);
    if (recentCalls.length > 1) {
      const recentTools = new Set(recentCalls.map(call => call.name));
      if (recentTools.size === recentCalls.length) {
        score += 0.1; // Bonus for clean ending
      }
    }
    
    // Ensure score stays in valid range
    return Math.max(0.0, Math.min(1.0, score));
  }

  /**
   * Identify tools that were part of successful sequences
   */
  private identifyEffectiveTools(toolCalls: ToolCall[], progressionPatterns: ProgressionPattern[]): string[] {
    const effectiveTools = new Set<string>();
    
    // Tools in successful progression patterns
    progressionPatterns
      .filter(pattern => pattern.transitionType === 'success' || pattern.transitionType === 'resolution')
      .forEach(pattern => {
        pattern.toolSequence.forEach(tool => effectiveTools.add(tool));
      });
    
    // Tools that completed without errors
    toolCalls
      .filter(call => call.result === 'success' && !call.followedBy?.includes(call.name))
      .forEach(call => effectiveTools.add(call.name));
    
    return Array.from(effectiveTools);
  }

  /**
   * Identify failed approaches from repetition patterns
   */
  private identifyFailedApproaches(repetitionPatterns: RepetitionPattern[]): string[] {
    return repetitionPatterns
      .filter(pattern => pattern.likelyFailure)
      .map(pattern => pattern.toolName);
  }

  /**
   * Calculate session duration in milliseconds
   */
  private calculateSessionDuration(contextWindow: ConversationContext): number {
    const end = contextWindow.sessionEnd || Date.now();
    return end - contextWindow.sessionStart;
  }

  /**
   * Calculate error rate as percentage of failed tool calls
   */
  private calculateErrorRate(toolCalls: ToolCall[]): number {
    if (toolCalls.length === 0) return 0;
    const errorCount = toolCalls.filter(call => call.result === 'error').length;
    return errorCount / toolCalls.length;
  }

  /**
   * Calculate resolution rate from progression patterns
   */
  private calculateResolutionRate(progressionPatterns: ProgressionPattern[]): number {
    if (progressionPatterns.length === 0) return 0;
    const resolutionCount = progressionPatterns.filter(
      pattern => pattern.transitionType === 'resolution' || pattern.transitionType === 'success'
    ).length;
    return resolutionCount / progressionPatterns.length;
  }

  /**
   * Detect user satisfaction indicators from conversation
   */
  private detectSatisfactionIndicators(contextWindow: ConversationContext): string[] {
    const indicators: string[] = [];
    const satisfactionPhrases = [
      'perfect', 'exactly', 'great', 'thanks', 'excellent', 'that works',
      'solved', 'fixed', 'got it', 'that\'s it', 'exactly what i needed'
    ];
    
    contextWindow.messages
      .filter(msg => msg.role === 'user')
      .forEach(msg => {
        const content = msg.content.toLowerCase();
        satisfactionPhrases.forEach(phrase => {
          if (content.includes(phrase)) {
            indicators.push(phrase);
          }
        });
      });
    
    return [...new Set(indicators)]; // Remove duplicates
  }

  /**
   * Generate learning insights from the analysis
   */
  private generateLearningInsights(
    toolCalls: ToolCall[], 
    repetitionPatterns: RepetitionPattern[], 
    progressionPatterns: ProgressionPattern[]
  ): string[] {
    const insights: string[] = [];
    
    // Insights about repetition
    const failedRepetitions = repetitionPatterns.filter(p => p.likelyFailure);
    if (failedRepetitions.length > 0) {
      insights.push(`Avoid repeating ${failedRepetitions[0].toolName} when initial attempts fail`);
    }
    
    // Insights about successful patterns
    const successfulPatterns = progressionPatterns.filter(p => p.transitionType === 'success');
    if (successfulPatterns.length > 0) {
      const commonSequence = successfulPatterns[0].toolSequence;
      insights.push(`Successful pattern: ${commonSequence.join(' → ')}`);
    }
    
    // Insights about tool effectiveness
    const lowErrorTools = toolCalls
      .filter(call => call.result === 'success')
      .reduce((acc, call) => {
        acc[call.name] = (acc[call.name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    const mostReliable = Object.entries(lowErrorTools)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (mostReliable && mostReliable[1] > 1) {
      insights.push(`${mostReliable[0]} proved most reliable (${mostReliable[1]} successful uses)`);
    }
    
    return insights;
  }

  /**
   * Count parameter variations in tool calls
   */
  private countParameterVariations(calls: ToolCall[]): number {
    const paramSets = calls.map(call => JSON.stringify(call.parameters));
    return new Set(paramSets).size;
  }

  /**
   * Calculate confidence score for repetition pattern
   */
  private calculateRepetitionConfidence(calls: ToolCall[], hasErrors: boolean, rapidRepetition: boolean): number {
    let confidence = 0.5;
    
    if (calls.length > 3) confidence += 0.2;
    if (hasErrors) confidence += 0.2;
    if (rapidRepetition) confidence += 0.1;
    
    return Math.min(1.0, confidence);
  }
}

/**
 * Utility function to create a context window from tool call history
 */
export function createContextWindow(
  toolCalls: ToolCall[],
  sessionStart: number,
  sessionEnd?: number
): ConversationContext {
  // Group tool calls by approximate message timing
  const messages = [];
  let currentTimestamp = sessionStart;
  let currentToolCalls: ToolCall[] = [];
  
  toolCalls.forEach(call => {
    // If significant time gap (>2 minutes), create new message
    if (call.timestamp - currentTimestamp > 120000 && currentToolCalls.length > 0) {
      messages.push({
        role: 'assistant' as const,
        content: `Executed ${currentToolCalls.length} tool(s)`,
        timestamp: currentTimestamp,
        toolCalls: [...currentToolCalls]
      });
      currentToolCalls = [];
    }
    
    currentToolCalls.push(call);
    currentTimestamp = call.timestamp;
  });
  
  // Add final message if there are remaining tool calls
  if (currentToolCalls.length > 0) {
    messages.push({
      role: 'assistant' as const,
      content: `Executed ${currentToolCalls.length} tool(s)`,
      timestamp: currentTimestamp,
      toolCalls: currentToolCalls
    });
  }
  
  return {
    messages,
    sessionStart,
    sessionEnd
  };
}