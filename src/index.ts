#!/usr/bin/env node
/**
 * MCP Brain Manager Server
 * Provides intelligent context management and semantic routing
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { BrainManagerV2, SessionContext, ProjectContext } from './brain-manager-v2.js';
import { SemanticRouter } from './semantic-router.js';
import { ProjectTemplate, TemplateManager } from './template-manager.js';
import { BrainToolInstruction } from './brain-instructions.js';
import { ReminderQueue } from './reminder-queue.js';
import { MultiProjectManager } from './multi-project-manager.js';

// Initialize server
const server = new Server(
  {
    name: 'mcp-brain-manager',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize components
const brainManager = new BrainManagerV2();
const semanticRouter = new SemanticRouter();
const templateManager = new TemplateManager();
const reminderQueue = new ReminderQueue();
const multiProjectManager = new MultiProjectManager();

// Error handling helper
function createError(code: ErrorCode, message: string) {
  return new McpError(code, message);
}

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'manager_init',
        description: 'Initialize Brain Manager with enhanced context loading and semantic routing',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Initial user message to determine mode'
            },
            sessionData: {
              type: 'object',
              description: 'Session data from brain:state_get("system", "last_session_context")',
              nullable: true
            },
            projectData: {
              type: 'object',
              description: 'Project data from brain:state_get("project", projectName)',
              nullable: true
            }
          },
          required: ['message']
        }
      },
      {
        name: 'semantic_classify',
        description: 'Classify user intent using semantic analysis',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Message to classify'
            },
            context: {
              type: 'object',
              description: 'Optional context for classification',
              properties: {
                lastProject: { type: 'string' },
                conversationHistory: { type: 'array' }
              },
              nullable: true
            }
          },
          required: ['message']
        }
      },
      {
        name: 'propose_update',
        description: 'Propose a context update for review before saving',
        inputSchema: {
          type: 'object',
          properties: {
            updateType: {
              type: 'string',
              enum: ['progress', 'decision', 'milestone', 'insight'],
              description: 'Type of update'
            },
            updates: {
              type: 'object',
              description: 'Update content'
            },
            projectName: {
              type: 'string',
              description: 'Project to update (optional, uses current if not specified)',
              nullable: true
            }
          },
          required: ['updateType', 'updates']
        }
      },
      {
        name: 'confirm_update',
        description: 'Confirm and save a proposed update',
        inputSchema: {
          type: 'object',
          properties: {
            updateId: {
              type: 'string',
              description: 'ID of the proposed update'
            },
            modifications: {
              type: 'object',
              description: 'Optional modifications to the proposed update',
              nullable: true
            }
          },
          required: ['updateId']
        }
      },
      {
        name: 'switch_project',
        description: 'Switch to a different project, saving current context to stack',
        inputSchema: {
          type: 'object',
          properties: {
            projectName: {
              type: 'string',
              description: 'Name of project to switch to'
            },
            projectData: {
              type: 'object',
              description: 'Existing project data if available from brain:state_get',
              nullable: true
            },
            createIfNotExists: {
              type: 'boolean',
              description: 'Create project if it doesn\'t exist',
              default: false
            },
            template: {
              type: 'string',
              enum: ['software', 'research', 'ml', 'writing', 'custom'],
              description: 'Template to use if creating new project',
              nullable: true
            }
          },
          required: ['projectName']
        }
      },
      {
        name: 'return_to_previous',
        description: 'Return to the previous project from the stack',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'generate_dashboard',
        description: 'Generate an Obsidian dashboard for a project',
        inputSchema: {
          type: 'object',
          properties: {
            projectName: {
              type: 'string',
              description: 'Project name (uses current if not specified)',
              nullable: true
            },
            includeAnalytics: {
              type: 'boolean',
              description: 'Include productivity analytics',
              default: false
            }
          }
        }
      },
      {
        name: 'analyze_patterns',
        description: 'Analyze conversation and work patterns for insights',
        inputSchema: {
          type: 'object',
          properties: {
            timeframe: {
              type: 'string',
              enum: ['session', 'day', 'week', 'month', 'all'],
              default: 'session'
            },
            focusArea: {
              type: 'string',
              enum: ['productivity', 'decisions', 'blockers', 'progress'],
              description: 'Specific area to analyze',
              nullable: true
            }
          }
        }
      },
      {
        name: 'get_context_summary',
        description: 'Get a summary of current context and available actions',
        inputSchema: {
          type: 'object',
          properties: {
            verbose: {
              type: 'boolean',
              description: 'Include detailed context information',
              default: false
            }
          }
        }
      },
      {
        name: 'update_repository',
        description: 'Execute the repository update protocol (git commit, build, test, document)',
        inputSchema: {
          type: 'object',
          properties: {
            commitMessage: {
              type: 'string',
              description: 'Commit message for the update',
              nullable: true
            },
            includeTests: {
              type: 'boolean',
              description: 'Run tests as part of update',
              default: true
            },
            versionBump: {
              type: 'string',
              enum: ['major', 'minor', 'patch'],
              description: 'Version bump type if needed',
              nullable: true
            },
            createSummary: {
              type: 'boolean',
              description: 'Create Obsidian summary note',
              default: true
            }
          }
        }
      },
      {
        name: 'generate_summary',
        description: 'Generate a project summary note',
        inputSchema: {
          type: 'object',
          properties: {
            changes: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of changes made',
              nullable: true
            },
            notes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Additional notes to include',
              nullable: true
            }
          }
        }
      },
      {
        name: 'handle_workflow',
        description: 'Handle natural language workflow commands like "update repo", "summarize", etc.',
        inputSchema: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'Natural language command'
            }
          },
          required: ['command']
        }
      },
      {
        name: 'create_project',
        description: 'Create a new project with full setup including Git, GitHub, testing, and Brain integration',
        inputSchema: {
          type: 'object',
          properties: {
            projectName: {
              type: 'string',
              description: 'Name of the project to create'
            },
            projectType: {
              type: 'string',
              enum: ['mcp-tool', 'web-app', 'cli-tool', 'library', 'api', 'general'],
              description: 'Type of project to create'
            },
            description: {
              type: 'string',
              description: 'Project description'
            },
            visibility: {
              type: 'string',
              enum: ['public', 'private'],
              default: 'public',
              description: 'GitHub repository visibility'
            },
            language: {
              type: 'string',
              enum: ['typescript', 'javascript'],
              default: 'typescript',
              description: 'Programming language'
            },
            features: {
              type: 'object',
              properties: {
                typescript: { type: 'boolean', default: true },
                testing: { type: 'boolean', default: true },
                linting: { type: 'boolean', default: true },
                docker: { type: 'boolean', default: false },
                cicd: { type: 'boolean', default: true },
                vscode: { type: 'boolean', default: true }
              },
              description: 'Optional features to include'
            },
            license: {
              type: 'string',
              enum: ['MIT', 'Apache-2.0', 'GPL-3.0', 'ISC', 'None'],
              default: 'MIT',
              description: 'License type'
            }
          },
          required: ['projectName', 'projectType']
        }
      },
      {
        name: 'brain_manager_help',
        description: 'Get help on using the Brain Manager',
        inputSchema: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'Specific command to get help for (or "all" for overview)'
            }
          }
        }
      },
      // Reminder tools - LIFO queue for session continuity
      {
        name: 'remind_me',
        description: 'Add a reminder to the LIFO queue (most recent shown first)',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'What to remember'
            },
            priority: {
              type: 'string',
              enum: ['critical', 'high', 'normal', 'low'],
              description: 'Priority level (default: normal)',
              default: 'normal'
            }
          },
          required: ['content']
        }
      },
      {
        name: 'check_reminders',
        description: 'Check reminders in LIFO order (newest first)',
        inputSchema: {
          type: 'object',
          properties: {
            priority: {
              type: 'string',
              enum: ['all', 'critical', 'high', 'normal', 'low'],
              description: 'Filter by priority (default: all)',
              default: 'all'
            },
            project: {
              type: 'string',
              description: 'Filter by project',
              nullable: true
            },
            limit: {
              type: 'number',
              description: 'Maximum number to show',
              default: 10
            }
          }
        }
      },
      {
        name: 'complete_reminder',
        description: 'Mark a reminder as completed',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Reminder ID'
            }
          },
          required: ['id']
        }
      },
      {
        name: 'archive_reminder',
        description: 'Archive a reminder (keeps history)',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Reminder ID'
            }
          },
          required: ['id']
        }
      },
      {
        name: 'move_reminder_to_notes',
        description: 'Move reminder to permanent Obsidian notes',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Reminder ID'
            },
            additionalNote: {
              type: 'string',
              description: 'Additional note to include',
              nullable: true
            }
          },
          required: ['id']
        }
      },
      {
        name: 'reminder_stats',
        description: 'Get statistics about reminders',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'cleanup_reminders',
        description: 'Clean up old archived reminders',
        inputSchema: {
          type: 'object',
          properties: {
            daysToKeep: {
              type: 'number',
              description: 'Keep reminders newer than N days (default: 30)',
              default: 30
            }
          }
        }
      },
      // Multi-project management tools
      {
        name: 'project_status',
        description: 'Get status of all active projects (foreground, background, recent)',
        inputSchema: {
          type: 'object',
          properties: {
            verbose: {
              type: 'boolean',
              description: 'Include detailed status information',
              default: false
            }
          }
        }
      },
      {
        name: 'switch_project_mode',
        description: 'Switch between projects with different modes',
        inputSchema: {
          type: 'object',
          properties: {
            projectName: {
              type: 'string',
              description: 'Name of project to switch to'
            },
            mode: {
              type: 'string',
              enum: ['foreground', 'background', 'check'],
              description: 'How to switch: foreground (full switch), background (add to background), check (quick look)',
              default: 'foreground'
            }
          },
          required: ['projectName']
        }
      },
      {
        name: 'update_background',
        description: 'Update a background project status',
        inputSchema: {
          type: 'object',
          properties: {
            projectName: {
              type: 'string',
              description: 'Name of background project'
            },
            update: {
              type: 'object',
              description: 'Update details',
              properties: {
                status: { type: 'string' },
                note: { type: 'string' },
                metrics: { type: 'object' }
              }
            }
          },
          required: ['projectName', 'update']
        }
      },
      {
        name: 'list_active_projects',
        description: 'List all projects by status with activity metrics',
        inputSchema: {
          type: 'object',
          properties: {
            includeArchived: {
              type: 'boolean',
              description: 'Include archived projects',
              default: false
            }
          }
        }
      },
      {
        name: 'promote_to_foreground',
        description: 'Promote a background project to foreground',
        inputSchema: {
          type: 'object',
          properties: {
            projectName: {
              type: 'string',
              description: 'Project to promote'
            }
          },
          required: ['projectName']
        }
      },
      {
        name: 'demote_to_background',
        description: 'Move current foreground project to background',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Background status',
              enum: ['processing', 'monitoring', 'waiting', 'scheduled'],
              default: 'monitoring'
            }
          }
        }
      }
    ]
  };
});

// Tool implementation handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (!args) {
    throw createError(ErrorCode.InvalidParams, "Missing arguments");
  }

  try {
    switch (name) {
      case 'manager_init': {
        // Always check for critical reminders first (awakening protocol)
        const startupReminders = reminderQueue.getStartupReminders();
        let criticalReminders = [];
        
        if (startupReminders.length > 0) {
          for (const reminder of startupReminders) {
            criticalReminders.push({
              priority: reminder.priority,
              id: reminder.id,
              content: reminder.content,
              created: reminder.created,
              project: reminder.context?.project
            });
          }
        }
        
        const result = await brainManager.initialize(
          (args.sessionData as SessionContext | undefined) || undefined,
          (args.projectData as ProjectContext | undefined) || undefined
        );
        
        // Load the data if provided
        if (args.sessionData || args.projectData) {
          brainManager.loadSessionData(args.sessionData as SessionContext | null, args.projectData as ProjectContext | null);
        }
        
        // Classify the message
        const classification = await semanticRouter.classify(
          (args.message as string),
          {
            lastProject: (args.sessionData as SessionContext | undefined)?.lastProject,
            conversationHistory: []
          }
        );
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                initialized: result.initialized,
                mode: classification.mode,
                confidence: classification.confidence,
                reasoning: classification.reasoning,
                instructions: result.instructions,
                suggestedActions: result.suggestedActions,
                lastSession: args.sessionData || null,
                currentProject: args.projectData || null,
                criticalReminders: criticalReminders.length > 0 ? criticalReminders : null,
                reminderMessage: criticalReminders.length > 0 ? 
                  `🚨 AWAKENING PROTOCOL: ${criticalReminders.length} critical reminder(s) found. Please check reminders for important context!` : null
              }, null, 2)
            }
          ]
        };
      }

      case 'semantic_classify': {
        const result = await semanticRouter.classify(
          (args.message as string),
          (args.context as any) || {}
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'propose_update': {
        const proposal = await brainManager.proposeUpdate(
          (args.updateType as string),
          args.updates,
          args.projectName as string
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(proposal, null, 2)
            }
          ]
        };
      }

      case 'confirm_update': {
        const result = await brainManager.confirmUpdate(
          (args.updateId as string),
          args.modifications
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'switch_project': {
        const result = await brainManager.switchProject(
          args.projectName as string,
          (args.createIfNotExists as boolean) || false,
          args.template as string,
          args.projectData as ProjectContext | undefined
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'return_to_previous': {
        const result = await brainManager.returnToPrevious();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'generate_dashboard': {
        const result = await brainManager.generateDashboard(
          args.projectName as string,
          (args.includeAnalytics as boolean) || false
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'analyze_patterns': {
        const result = await brainManager.analyzePatterns(
          (args.timeframe as string),
          args.focusArea as string | undefined
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'get_context_summary': {
        const result = await brainManager.getContextSummary((args.verbose as boolean));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'update_repository': {
        const result = await brainManager.updateRepository(
          args.commitMessage as string | undefined,
          {
            includeTests: (args.includeTests as boolean) ?? true,
            versionBump: args.versionBump as 'major' | 'minor' | 'patch' | undefined,
            createSummary: (args.createSummary as boolean) ?? true
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'generate_summary': {
        const result = await brainManager.generateProjectSummary(
          args.changes as string[] | undefined,
          args.notes as string[] | undefined
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'handle_workflow': {
        const result = await brainManager.handleWorkflowCommand(
          args.command as string
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'create_project': {
        const result = await brainManager.createProject(args as any);
        return {
          content: [
            {
              type: 'text',
              text: result.summary
            },
            {
              type: 'text',
              text: '\n### Instructions to execute:\n' + JSON.stringify(result.instructions, null, 2)
            }
          ]
        };
      }

      case 'brain_manager_help': {
        let helpText = '';
        const command = args.command as string | undefined;
        
        if (!command || command === 'all') {
          helpText = `🧠 Brain Manager Help
====================

The Brain Manager provides intelligent context management and semantic routing for your projects.

Available commands:

🚀 manager_init - Initialize session and load context
   Required: message
   Optional: sessionData, projectData

🎯 semantic_classify - Classify user intent
   Required: message
   Optional: context

📝 propose_update - Propose context changes for review
   Required: updateType, updates
   Optional: projectName

✅ confirm_update - Confirm and save proposed update
   Required: updateId
   Optional: modifications

🔄 switch_project - Switch to different project
   Required: projectName
   Optional: createIfNotExists, template, projectData

↩️  return_to_previous - Return to previous project

📊 generate_dashboard - Create Obsidian dashboard
   Optional: projectName, includeAnalytics

🔍 analyze_patterns - Analyze work patterns
   Optional: timeframe, focusArea

📋 get_context_summary - Get current context summary
   Optional: verbose

🔧 update_repository - Execute repository update protocol
   Optional: commitMessage, includeTests, versionBump, createSummary

📄 generate_summary - Generate project summary note
   Optional: changes, notes

🤖 handle_workflow - Handle natural language commands
   Required: command

➕ create_project - Create new project with full setup
   Required: projectName, projectType
   Optional: description, visibility, language, features, license

❓ brain_manager_help - Show this help
   Optional: command (specific command for details)

== REMINDER TOOLS (LIFO Queue) ==

🔔 remind_me - Add a reminder to the queue
   Required: content
   Optional: priority (critical/high/normal/low)

📋 check_reminders - Check reminders (newest first)
   Optional: priority, project, limit

✅ complete_reminder - Mark reminder as completed
   Required: id

📦 archive_reminder - Archive a reminder
   Required: id

📝 move_reminder_to_notes - Move to Obsidian notes
   Required: id
   Optional: additionalNote

📊 reminder_stats - Get reminder statistics

🧹 cleanup_reminders - Clean old archived reminders
   Optional: daysToKeep

Use 'brain_manager_help' with a specific command for detailed information.`;
        } else {
          switch (command) {
            case 'manager_init':
              helpText = `🚀 manager_init - Initialize Brain Manager session

This is typically the first command to run in a session.

⚠️  IMPORTANT: This command now ALWAYS checks reminders first!
The awakening protocol and critical instructions are stored in reminders.

Parameters:
- message (required): Your initial message to determine mode
- sessionData: Result from brain:state_get("system", "last_session_context")
- projectData: Result from brain:state_get("project", projectName)

Usage pattern:
1. First call without data - returns brain tool instructions
2. Execute the brain tools (check_reminders, brain_init, state_get)
3. Call again with sessionData/projectData filled in

Example flow:
// First call
manager_init { "message": "Let's continue the API project" }
// Returns instructions including reminders check

// After executing brain tools, second call
manager_init {
  "message": "Let's continue the API project",
  "sessionData": { ...result from state_get... },
  "projectData": { ...if project was loaded... }
}
// Returns classified intent and loaded context`;
              break;
              
            case 'propose_update':
              helpText = `📝 propose_update - Propose context changes for review

Creates a proposal that can be reviewed before saving.

Parameters:
- updateType (required): Type of update
  Options: "progress", "decision", "milestone", "insight"
- updates (required): Update content object
- projectName: Project to update (uses current if not specified)

Example:
propose_update {
  "updateType": "progress",
  "updates": {
    "completedTasks": ["Implement authentication"],
    "newTasks": ["Add error handling"],
    "currentFocus": "Testing auth flow"
  }
}

Returns a proposal with:
- id: Use this to confirm the update
- confirmationPrompt: Review text
- proposedContext: Preview of changes`;
              break;
              
            case 'switch_project':
              helpText = `🔄 switch_project - Switch to a different project

Saves current context to stack and loads new project.

Parameters:
- projectName (required): Name of project to switch to
- createIfNotExists: Create if doesn't exist (default: false)
- template: Template for new project
  Options: "software", "research", "ml", "writing", "custom"
- projectData: Existing data from brain:state_get

Example:
switch_project {
  "projectName": "my-api-project",
  "createIfNotExists": true,
  "template": "software"
}`;
              break;
              
            case 'create_project':
              helpText = `➕ create_project - Create new project with full setup

Creates a complete project with Git, GitHub, testing, and Brain integration.

Parameters:
- projectName (required): Name of the project
- projectType (required): Type of project
  Options: "mcp-tool", "web-app", "cli-tool", "library", "api", "general"
- description: Project description
- visibility: "public" or "private" (default: public)
- language: "typescript" or "javascript" (default: typescript)
- license: "MIT", "Apache-2.0", "GPL-3.0", "ISC", "None" (default: MIT)
- features: Object with boolean flags:
  - typescript (default: true)
  - testing (default: true)
  - linting (default: true)
  - docker (default: false)
  - cicd (default: true)
  - vscode (default: true)

Example:
create_project {
  "projectName": "my-awesome-tool",
  "projectType": "mcp-tool",
  "description": "A tool that does awesome things",
  "features": {
    "docker": true
  }
}`;
              break;
              
            default:
              helpText = `Command '${command}' not found. Use 'brain_manager_help' without arguments to see all commands.`;
          }
        }
        
        return {
          content: [
            {
              type: 'text',
              text: helpText
            }
          ]
        };
      }

      // Reminder tool implementations
      case 'remind_me': {
        const { content, priority } = args as { content: string; priority?: 'critical' | 'high' | 'normal' | 'low' };
        const currentProject = brainManager.getCurrentProject();
        const context = currentProject ? { project: currentProject.projectName } : undefined;
        
        const id = reminderQueue.push(content, priority || 'normal', context);
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ Reminder added: ${id}\nPriority: ${priority || 'normal'}${context ? `\nProject: ${context.project}` : ''}`
            }
          ]
        };
      }

      case 'check_reminders': {
        const { priority, project, limit } = args as { 
          priority?: string; 
          project?: string; 
          limit?: number 
        };
        
        // Always show critical reminders on startup
        const startupReminders = reminderQueue.getStartupReminders();
        const reminders = reminderQueue.peek({ priority, project, limit });
        
        if (reminders.length === 0 && startupReminders.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: '📭 No active reminders.'
              }
            ]
          };
        }
        
        let output = '';
        
        // Show critical startup reminders first
        if (startupReminders.length > 0 && priority !== 'low' && priority !== 'normal') {
          output += '🚨 CRITICAL REMINDERS (Always shown on startup):\n\n';
          for (const reminder of startupReminders) {
            output += `[${reminder.priority.toUpperCase()}] ${reminder.id}\n`;
            output += `📝 ${reminder.content}\n`;
            output += `⏰ Created: ${new Date(reminder.created).toLocaleString()}\n`;
            if (reminder.context?.project) {
              output += `📁 Project: ${reminder.context.project}\n`;
            }
            output += '\n';
          }
          output += '---\n\n';
        }
        
        // Show filtered reminders
        if (reminders.length > 0) {
          output += '📋 Active Reminders (LIFO - newest first):\n\n';
          for (const reminder of reminders) {
            const age = Date.now() - new Date(reminder.created).getTime();
            const ageStr = age < 3600000 ? `${Math.floor(age / 60000)}m ago` :
                          age < 86400000 ? `${Math.floor(age / 3600000)}h ago` :
                          `${Math.floor(age / 86400000)}d ago`;
            
            output += `[${reminder.priority.toUpperCase()}] ${reminder.id} (${ageStr})\n`;
            output += `📝 ${reminder.content}\n`;
            if (reminder.context?.project) {
              output += `📁 Project: ${reminder.context.project}\n`;
            }
            output += '\n';
          }
        }
        
        return {
          content: [
            {
              type: 'text',
              text: output.trim()
            }
          ]
        };
      }

      case 'complete_reminder': {
        const { id } = args as { id: string };
        const reminder = reminderQueue.pop(id, true);
        
        if (!reminder) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Reminder ${id} not found or already completed.`
              }
            ]
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ Completed reminder ${id}: "${reminder.content}"`
            }
          ]
        };
      }

      case 'archive_reminder': {
        const { id } = args as { id: string };
        const success = reminderQueue.archive(id);
        
        return {
          content: [
            {
              type: 'text',
              text: success ? 
                `📦 Archived reminder ${id}` : 
                `❌ Reminder ${id} not found or already archived.`
            }
          ]
        };
      }

      case 'move_reminder_to_notes': {
        const { id, additionalNote } = args as { id: string; additionalNote?: string };
        const result = reminderQueue.moveToNotes(id, additionalNote);
        
        return {
          content: [
            {
              type: 'text',
              text: result.success ? 
                `📝 ${result.message}` : 
                `❌ ${result.message}`
            }
          ]
        };
      }

      case 'reminder_stats': {
        const stats = reminderQueue.getStats();
        
        let output = '📊 Reminder Statistics:\n\n';
        output += `Total reminders: ${stats.total}\n`;
        output += `Active: ${stats.active}\n`;
        output += `Completed: ${stats.completed}\n`;
        output += `Archived: ${stats.archived}\n\n`;
        
        if (stats.active > 0) {
          output += 'Active by priority:\n';
          output += `  Critical: ${stats.byPriority.critical}\n`;
          output += `  High: ${stats.byPriority.high}\n`;
          output += `  Normal: ${stats.byPriority.normal}\n`;
          output += `  Low: ${stats.byPriority.low}\n\n`;
          
          if (Object.keys(stats.byProject).length > 0) {
            output += 'Active by project:\n';
            for (const [project, count] of Object.entries(stats.byProject)) {
              output += `  ${project}: ${count}\n`;
            }
          }
        }
        
        return {
          content: [
            {
              type: 'text',
              text: output.trim()
            }
          ]
        };
      }

      case 'cleanup_reminders': {
        const { daysToKeep } = args as { daysToKeep?: number };
        const count = reminderQueue.cleanup(daysToKeep || 30);
        
        return {
          content: [
            {
              type: 'text',
              text: `🧹 Cleaned up ${count} old archived reminders.`
            }
          ]
        };
      }

      // Multi-project management tool implementations
      case 'project_status': {
        const { verbose } = args as { verbose?: boolean };
        const status = await multiProjectManager.getProjectStatus(verbose || false);
        
        return {
          content: [
            {
              type: 'text',
              text: status
            }
          ]
        };
      }

      case 'switch_project_mode': {
        const { projectName, mode } = args as { projectName: string; mode?: 'foreground' | 'background' | 'check' };
        const result = await multiProjectManager.switchProject(projectName, mode || 'foreground');
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ ${result.message}`
            }
          ]
        };
      }

      case 'update_background': {
        const { projectName, update } = args as { projectName: string; update: any };
        const result = await multiProjectManager.updateBackground(projectName, update);
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ Updated background project ${projectName}`
            }
          ]
        };
      }

      case 'list_active_projects': {
        const { includeArchived } = args as { includeArchived?: boolean };
        const list = await multiProjectManager.listActiveProjects(includeArchived || false);
        
        return {
          content: [
            {
              type: 'text',
              text: list
            }
          ]
        };
      }

      case 'promote_to_foreground': {
        const { projectName } = args as { projectName: string };
        const result = await multiProjectManager.promoteToForeground(projectName);
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ ${result.message}`
            }
          ]
        };
      }

      case 'demote_to_background': {
        const { status } = args as { status?: 'processing' | 'monitoring' | 'waiting' | 'scheduled' };
        const result = await multiProjectManager.demoteToBackground(status || 'monitoring');
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ ${result.message}`
            }
          ]
        };
      }

      default:
        throw createError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    throw createError(
      ErrorCode.InternalError,
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Brain Manager Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
