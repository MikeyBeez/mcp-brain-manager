/**
 * Mercury Protocol Bridge - Integration between Brain Manager and Mercury Evolution
 * Handles automatic Mercury session completion with context analysis
 */

import { ContextAnalysis, ContextWindowAnalyzer } from './context-analyzer.js';

export interface MercurySessionResult {
  sessionId: string;
  successScore: number;
  effectivePatterns: ToolPattern[];
  learningInsights: string[];
  continuationRecommendations: string[];
  sessionDuration: number;
  completed: boolean;
}

export interface ToolPattern {
  sequence: string[];
  successRate: number;
  averageDuration: number;
  context: string;
  confidence: number;
}

export interface MercuryCompletionOptions {
  sessionId: string;
  analysis: ContextAnalysis;
  intent?: string;
  context?: string;
}

/**
 * Bridge class for integrating Brain Manager with Mercury Evolution
 */
export class MercuryProtocolBridge {
  private analyzer: ContextWindowAnalyzer;

  constructor() {
    this.analyzer = new ContextWindowAnalyzer();
  }

  /**
   * Complete a Mercury session using context analysis
   */
  async completeMercurySession(options: MercuryCompletionOptions): Promise<MercurySessionResult> {
    const { sessionId, analysis, intent, context } = options;

    try {
      // Generate tool patterns from analysis
      const effectivePatterns = this.generateToolPatterns(analysis);
      
      // Create learning insights
      const learningInsights = this.enhanceLearningInsights(analysis, intent);
      
      // Generate continuation recommendations
      const continuationRecommendations = this.generateContinuationRecommendations(analysis);

      // Build Mercury session result
      const result: MercurySessionResult = {
        sessionId,
        successScore: analysis.successScore,
        effectivePatterns,
        learningInsights,
        continuationRecommendations,
        sessionDuration: analysis.sessionDuration,
        completed: true
      };

      return result;
    } catch (error) {
      console.error('Error completing Mercury session:', error);
      
      // Return minimal result on error
      return {
        sessionId,
        successScore: 0.5,
        effectivePatterns: [],
        learningInsights: ['Session analysis failed'],
        continuationRecommendations: [],
        sessionDuration: analysis.sessionDuration,
        completed: false
      };
    }
  }

  /**
   * Analyze context window and complete Mercury session in one step
   */
  async analyzeAndCompleteMercurySession(
    conversationContext: any,
    sessionId: string,
    intent?: string
  ): Promise<MercurySessionResult> {
    // Create simplified context for analysis
    const analysisContext = this.convertToAnalysisContext(conversationContext);
    
    // Perform context analysis
    const analysis = this.analyzer.analyzeToolPatterns(analysisContext, sessionId);
    
    // Complete Mercury session
    return this.completeMercurySession({
      sessionId,
      analysis,
      intent
    });
  }

  /**
   * Generate tool patterns from context analysis
   */
  private generateToolPatterns(analysis: ContextAnalysis): ToolPattern[] {
    const patterns: ToolPattern[] = [];

    // Convert successful progression patterns to tool patterns
    analysis.progressionPatterns
      .filter(pattern => pattern.transitionType === 'success' || pattern.transitionType === 'resolution')
      .forEach(pattern => {
        patterns.push({
          sequence: pattern.toolSequence,
          successRate: pattern.confidence,
          averageDuration: pattern.timespan,
          context: pattern.description,
          confidence: pattern.confidence
        });
      });

    // Add effective single tools as patterns
    analysis.effectiveTools.forEach(toolName => {
      const toolCalls = analysis.toolSequence.filter(call => call.name === toolName);
      if (toolCalls.length > 0) {
        const successRate = toolCalls.filter(call => call.result === 'success').length / toolCalls.length;
        const avgDuration = toolCalls.reduce((sum, call) => sum + (call.timeToNext || 0), 0) / toolCalls.length;
        
        patterns.push({
          sequence: [toolName],
          successRate,
          averageDuration: avgDuration,
          context: `Effective single tool usage`,
          confidence: successRate
        });
      }
    });

    // Sort by confidence and return top patterns
    return patterns
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Return top 5 patterns
  }

  /**
   * Enhance learning insights with additional context
   */
  private enhanceLearningInsights(analysis: ContextAnalysis, intent?: string): string[] {
    const insights = [...analysis.learningInsights];

    // Add intent-specific insights
    if (intent) {
      insights.push(`Session intent: ${intent} (success score: ${(analysis.successScore * 100).toFixed(1)}%)`);
    }

    // Add session efficiency insights
    if (analysis.errorRate > 0.2) {
      insights.push(`High error rate (${(analysis.errorRate * 100).toFixed(1)}%) suggests need for better tool selection`);
    }

    if (analysis.uniqueTools / analysis.totalToolCalls > 0.8) {
      insights.push('Good tool diversity - minimal repetition detected');
    }

    // Add time-based insights
    const avgTimePerTool = analysis.sessionDuration / analysis.totalToolCalls;
    if (avgTimePerTool > 60000) { // More than 1 minute per tool
      insights.push('Session had long intervals between tool calls - consider tool chaining');
    }

    return insights;
  }

  /**
   * Generate recommendations for continuation or future sessions
   */
  private generateContinuationRecommendations(analysis: ContextAnalysis): string[] {
    const recommendations: string[] = [];

    // Recommendations based on failed approaches
    if (analysis.failedApproaches.length > 0) {
      recommendations.push(`Avoid repeating: ${analysis.failedApproaches.join(', ')}`);
    }

    // Recommendations based on effective tools
    if (analysis.effectiveTools.length > 0) {
      recommendations.push(`Effective tools for similar tasks: ${analysis.effectiveTools.slice(0, 3).join(', ')}`);
    }

    // Recommendations based on success score
    if (analysis.successScore < 0.4) {
      recommendations.push('Consider alternative approaches - current session had low success indicators');
    } else if (analysis.successScore > 0.8) {
      recommendations.push('Session patterns were highly effective - similar approaches recommended');
    }

    // Recommendations based on progression patterns
    const successfulProgressions = analysis.progressionPatterns.filter(
      p => p.transitionType === 'success' || p.transitionType === 'resolution'
    );
    
    if (successfulProgressions.length > 0) {
      const topProgression = successfulProgressions[0];
      recommendations.push(`Successful pattern to replicate: ${topProgression.toolSequence.join(' → ')}`);
    }

    return recommendations;
  }

  /**
   * Convert conversation context to analysis format
   */
  private convertToAnalysisContext(conversationContext: any): any {
    // This is a simplified conversion - in practice, this would extract
    // tool calls from the actual conversation context
    
    if (!conversationContext) {
      return {
        messages: [],
        sessionStart: Date.now() - 300000, // 5 minutes ago
        sessionEnd: Date.now()
      };
    }

    // Extract tool calls from conversation
    const messages: any[] = [];
    const toolCalls: any[] = [];
    
    // This would need to be adapted based on the actual structure
    // of the conversation context passed from brain-manager
    
    return {
      messages,
      sessionStart: conversationContext.sessionStart || Date.now() - 300000,
      sessionEnd: conversationContext.sessionEnd || Date.now()
    };
  }

  /**
   * Create a mock analysis for testing purposes
   */
  createMockAnalysis(sessionId: string, successScore: number = 0.7): ContextAnalysis {
    return {
      sessionId,
      toolSequence: [
        {
          name: 'search_files',
          timestamp: Date.now() - 300000,
          parameters: { pattern: 'test' },
          result: 'success'
        },
        {
          name: 'read_text_file',
          timestamp: Date.now() - 240000,
          parameters: { path: 'test.txt' },
          result: 'success'
        }
      ],
      repetitionPatterns: [],
      progressionPatterns: [
        {
          toolSequence: ['search_files', 'read_text_file'],
          transitionType: 'success',
          confidence: 0.8,
          timespan: 60000,
          description: 'Successful file discovery and reading'
        }
      ],
      successScore,
      effectiveTools: ['search_files', 'read_text_file'],
      failedApproaches: [],
      sessionDuration: 300000,
      totalToolCalls: 2,
      uniqueTools: 2,
      errorRate: 0.0,
      resolutionRate: 1.0,
      userSatisfactionIndicators: ['great', 'exactly'],
      learningInsights: ['File search followed by reading is effective pattern']
    };
  }
}

/**
 * Utility function to format analysis results for brain-manager
 */
export function formatAnalysisForBrainManager(result: MercurySessionResult): string {
  const sections = [
    `## Mercury Learning Analysis`,
    `**Session Success Score**: ${(result.successScore * 100).toFixed(1)}%`,
    `**Duration**: ${Math.round(result.sessionDuration / 1000)} seconds`,
    ``,
    `### Effective Patterns:`,
    ...result.effectivePatterns.map(pattern => 
      `- ${pattern.sequence.join(' → ')} (${(pattern.successRate * 100).toFixed(1)}% success rate)`
    ),
    ``,
    `### Learning Insights:`,
    ...result.learningInsights.map(insight => `- ${insight}`),
    ``,
    `### Recommendations:`,
    ...result.continuationRecommendations.map(rec => `- ${rec}`)
  ];

  return sections.join('\\n');
}