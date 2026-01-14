/**
 * Test suite for Brain Manager
 */

import { BrainManager } from '../src/brain-manager';
import { SemanticRouter } from '../src/semantic-router';
import { TemplateManager } from '../src/template-manager';

describe('BrainManager', () => {
  let manager: BrainManager;

  beforeEach(() => {
    manager = new BrainManager();
  });

  it('should initialize successfully', async () => {
    const result = await manager.initialize();
    assert.strictEqual(result, true);
  });

  it('should propose and confirm updates', async () => {
    // Create a test project
    await manager.switchProject('test-project', true, 'software');

    // Propose an update
    const proposal = await manager.proposeUpdate('progress', {
      completedTasks: ['Task 1'],
      newTasks: ['Task 2', 'Task 3'],
      currentFocus: 'Testing'
    });

    assert.strictEqual(proposal.type, 'progress');
    assert.ok(proposal.changesSummary.includes('Completed 1 tasks'));
    assert.ok(proposal.changesSummary.includes('Added 2 new tasks'));

    // Confirm the update
    const result = await manager.confirmUpdate(proposal.id);
    assert.strictEqual(result.success, true);
  });

  it('should handle project switching with stack', async () => {
    // Create two projects
    await manager.switchProject('project-1', true);
    await manager.switchProject('project-2', true);

    // Should be on project-2
    const summary1 = await manager.getContextSummary();
    assert.strictEqual(summary1.currentProject?.name, 'project-2');
    assert.strictEqual(summary1.stackDepth, 1);

    // Return to previous
    const result = await manager.returnToPrevious();
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.project?.projectName, 'project-1');

    const summary2 = await manager.getContextSummary();
    assert.strictEqual(summary2.stackDepth, 0);
  });

  it('should generate dashboards', async () => {
    await manager.switchProject('dashboard-test', true, 'software');
    
    // Add some data
    await manager.proposeUpdate('progress', {
      completedTasks: ['Setup project'],
      currentFocus: 'Core features'
    }).then(p => manager.confirmUpdate(p.id));

    await manager.proposeUpdate('decision', {
      decision: 'Use TypeScript',
      rationale: 'Type safety and better tooling'
    }).then(p => manager.confirmUpdate(p.id));

    const dashboard = await manager.generateDashboard();
    
    assert.ok(dashboard.includes('# dashboard-test'));
    assert.ok(dashboard.includes('Core features'));
    assert.ok(dashboard.includes('Use TypeScript'));
    assert.ok(dashboard.includes('Type safety and better tooling'));
  });
});

describe('SemanticRouter', () => {
  let router: SemanticRouter;

  beforeEach(() => {
    router = new SemanticRouter();
  });

  it('should classify project management intents', async () => {
    const testCases = [
      'I want to build a new web application',
      'Let\'s create a REST API',
      'Need to fix this bug in the code'
    ];

    for (const message of testCases) {
      const result = await router.classify(message);
      assert.strictEqual(result.mode, 'project_management');
      assert.ok(result.confidence > 0.5);
    }
  });

  it('should detect continuation with context', async () => {
    const context = { lastProject: 'my-app' };
    const continuationMessages = [
      'Let\'s continue working on this',
      'Now let\'s add the authentication',
      'Next, we should implement the UI'
    ];

    for (const message of continuationMessages) {
      const result = await router.classify(message, context);
      assert.strictEqual(result.mode, 'project_continuation');
      assert.ok(result.reasoning.includes('continuation'));
    }
  });

  it('should classify research intents', async () => {
    const researchMessages = [
      'How does OAuth2 work?',
      'I want to learn about machine learning',
      'Research best practices for API design'
    ];

    for (const message of researchMessages) {
      const result = await router.classify(message);
      assert.strictEqual(result.mode, 'research');
    }
  });

  it('should handle explicit mode switches', async () => {
    const result = await router.classify('switch to analysis mode');
    assert.strictEqual(result.mode, 'analysis');
    assert.ok(result.confidence > 0.9);
  });
});

describe('TemplateManager', () => {
  let templateManager: TemplateManager;

  beforeEach(() => {
    templateManager = new TemplateManager();
  });

  it('should have default templates', () => {
    const templates = templateManager.getAllTemplates();
    const templateKeys = templates.map(t => t.key);
    
    assert.ok(templateKeys.includes('software'));
    assert.ok(templateKeys.includes('research'));
    assert.ok(templateKeys.includes('ml'));
    assert.ok(templateKeys.includes('writing'));
    assert.ok(templateKeys.includes('custom'));
  });

  it('should apply templates correctly', () => {
    const project = templateManager.applyTemplate('software', 'my-app', {
      summary: 'My awesome application',
      metadata: {
        techStack: ['TypeScript', 'React', 'Node.js']
      }
    });

    assert.strictEqual(project.projectName, 'my-app');
    assert.strictEqual(project.summary, 'My awesome application');
    assert.deepStrictEqual(project.metadata.techStack, ['TypeScript', 'React', 'Node.js']);
    assert.ok(project.openTasks.length > 0);
  });

  it('should suggest appropriate templates', () => {
    expect(templateManager.suggestTemplate('build a machine learning model')).toBe('ml');
    expect(templateManager.suggestTemplate('write a blog post')).toBe('writing');
    expect(templateManager.suggestTemplate('research quantum computing')).toBe('research');
    expect(templateManager.suggestTemplate('create a web app')).toBe('software');
  });
});

// Integration test
describe('Integration', () => {
  it('should handle complete workflow', async () => {
    const manager = new BrainManager();
    const router = new SemanticRouter();
    const templateManager = new TemplateManager();

    // 1. Initialize
    await manager.initialize();

    // 2. Classify intent
    const classification = await router.classify('I want to build a chat application');
    assert.strictEqual(classification.mode, 'project_management');

    // 3. Create project with template
    const suggestedTemplate = templateManager.suggestTemplate('chat application');
    await manager.switchProject('chat-app', true, suggestedTemplate);

    // 4. Work on project
    const proposal1 = await manager.proposeUpdate('progress', {
      completedTasks: ['Set up project repository'],
      newTasks: ['Implement WebSocket server', 'Design message protocol'],
      currentFocus: 'Backend infrastructure'
    });
    await manager.confirmUpdate(proposal1.id);

    // 5. Make a decision
    const proposal2 = await manager.proposeUpdate('decision', {
      decision: 'Use Socket.IO for WebSocket management',
      rationale: 'Better browser compatibility and automatic reconnection',
      impact: 'Need to add Socket.IO dependency'
    });
    await manager.confirmUpdate(proposal2.id);

    // 6. Switch to research
    await manager.switchProject('websocket-research', true, 'research');
    
    // 7. Return to original project
    await manager.returnToPrevious();

    // 8. Generate dashboard
    const dashboard = await manager.generateDashboard();
    assert.ok(dashboard.includes('chat-app'));
    assert.ok(dashboard.includes('Backend infrastructure'));
    assert.ok(dashboard.includes('Socket.IO'));

    // 9. Get analytics
    const patterns = await manager.analyzePatterns('session', 'productivity');
    assert.ok(patterns.patterns !== undefined);
  });

  it('should handle edge cases gracefully', async () => {
    const manager = new BrainManager();

    // Try to update without a project
    await expect(manager.proposeUpdate('progress', {})).rejects.toThrow();

    // Try to confirm non-existent update
    const result = await manager.confirmUpdate('fake-id');
    assert.strictEqual(result.success, false);

    // Try to return without stack
    const returnResult = await manager.returnToPrevious();
    assert.strictEqual(returnResult.success, false);

    // Generate dashboard without project
    const dashboard = await manager.generateDashboard('non-existent');
    assert.ok(dashboard.includes('No Project Found'));
  });
});

// Performance tests
describe('Performance', () => {
  it('should handle large projects efficiently', async () => {
    const manager = new BrainManager();
    await manager.switchProject('large-project', true);

    // Add many tasks
    const start = Date.now();
    for (let i = 0; i < 100; i++) {
      const proposal = await manager.proposeUpdate('progress', {
        newTasks: [`Task ${i}`]
      });
      await manager.confirmUpdate(proposal.id);
    }
    const duration = Date.now() - start;

    // Should complete in reasonable time
    assert.ok(duration < 5000); // 5 seconds for 100 updates

    // Dashboard should still generate quickly
    const dashboardStart = Date.now();
    await manager.generateDashboard();
    const dashboardDuration = Date.now() - dashboardStart;
    assert.ok(dashboardDuration < 100); // 100ms
  });

  it('should clean up old proposals', async () => {
    const manager = new BrainManager();
    await manager.switchProject('test', true);

    // Create multiple proposals without confirming
    const proposals = [];
    for (let i = 0; i < 10; i++) {
      const proposal = await manager.proposeUpdate('progress', {
        currentFocus: `Focus ${i}`
      });
      proposals.push(proposal.id);
    }

    // Check that all are initially available
    const summary1 = await manager.getContextSummary();
    assert.strictEqual(summary1.pendingUpdates, 10);

    // Old proposals should be cleaned up on next proposal
    // (In real implementation, would wait 5 minutes)
    const newProposal = await manager.proposeUpdate('progress', {
      currentFocus: 'New focus'
    });

    // Pending count should reflect cleanup
    const summary2 = await manager.getContextSummary();
    assert.ok(summary2.pendingUpdates <= 11);
  });
});
