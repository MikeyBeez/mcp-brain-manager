/**
 * Research Project Creator - Specialized project creation for investigation, documentation, and analysis
 */

import { BrainToolInstruction } from '../brain-instructions.js';
import { randomUUID } from 'crypto';

export interface ResearchProjectOptions {
  projectName: string;
  description: string;
  researchType: 'investigation' | 'documentation' | 'audit' | 'analysis' | 'case-study';
  methodology?: string;
  timeframe?: string;
  phases?: string[];
  deliverables?: string[];
  location?: string; // Default: BrainVault/projects or BrainVault/research
}

export interface ResearchProjectResult {
  success: boolean;
  projectPath: string;
  projectType: 'research';
  structure: ResearchProjectStructure;
  brainInstructions: BrainToolInstruction[];
  nextSteps: string[];
  sessionId: string;
}

export interface ResearchProjectStructure {
  baseDirectory: string;
  directories: string[];
  files: Array<{
    path: string;
    purpose: string;
    template: string;
  }>;
  brainIntegration: {
    vaultPath: string;
    obsidianNotes: string[];
    stateKeys: string[];
  };
}

export class ResearchProjectCreator {
  private readonly defaultLocation = 'process.env.OBSIDIAN_VAULT_PATH || /Users/bard/Code/Claude_Data/vault/projects';
  
  async createResearchProject(options: ResearchProjectOptions): Promise<ResearchProjectResult> {
    const sessionId = randomUUID();
    const projectPath = options.location || `${this.defaultLocation}/${options.projectName}`;
    
    try {
      // Generate project structure
      const structure = this.generateProjectStructure(options, projectPath);
      
      // Generate Brain tool instructions
      const instructions = this.generateBrainInstructions(options, structure);
      
      return {
        success: true,
        projectPath,
        projectType: 'research',
        structure,
        brainInstructions: instructions,
        nextSteps: this.generateNextSteps(options),
        sessionId
      };
    } catch (error) {
      return {
        success: false,
        projectPath,
        projectType: 'research',
        structure: {} as ResearchProjectStructure,
        brainInstructions: [],
        nextSteps: [`Error creating project: ${error}`],
        sessionId
      };
    }
  }
  
  private generateProjectStructure(options: ResearchProjectOptions, projectPath: string): ResearchProjectStructure {
    const baseDirectories = [
      'methodology',
      'findings',
      'findings/evidence',
      'findings/sessions',
      'reports',
      'references',
      'templates',
      'analysis',
      'deliverables'
    ];
    
    // Add phase-specific directories if phases are specified
    const phaseDirectories = options.phases?.map(phase => `phases/${phase}`) || [];
    
    const allDirectories = [...baseDirectories, ...phaseDirectories];
    
    const coreFiles = [
      {
        path: '00-project-overview.md',
        purpose: 'Project overview and objectives',
        template: 'research-overview'
      },
      {
        path: 'methodology/01-research-methodology.md',
        purpose: 'Research methodology and approach',
        template: 'research-methodology'
      },
      {
        path: 'methodology/02-investigation-plan.md',
        purpose: 'Detailed investigation plan',
        template: 'investigation-plan'
      },
      {
        path: 'findings/session-tracking.md',
        purpose: 'Cross-session findings tracker',
        template: 'session-tracker'
      },
      {
        path: 'templates/session-template.md',
        purpose: 'Template for investigation sessions',
        template: 'session-template'
      },
      {
        path: 'templates/finding-template.md',
        purpose: 'Template for documenting findings',
        template: 'finding-template'
      },
      {
        path: 'templates/evidence-template.md',
        purpose: 'Template for evidence documentation',
        template: 'evidence-template'
      },
      {
        path: 'reports/progress-tracker.md',
        purpose: 'Overall progress tracking',
        template: 'progress-tracker'
      }
    ];
    
    // Add deliverable-specific files
    const deliverableFiles = options.deliverables?.map(deliverable => ({
      path: `deliverables/${deliverable.toLowerCase().replace(/\\s+/g, '-')}.md`,
      purpose: `Deliverable: ${deliverable}`,
      template: 'deliverable-template'
    })) || [];
    
    return {
      baseDirectory: projectPath,
      directories: allDirectories,
      files: [...coreFiles, ...deliverableFiles],
      brainIntegration: {
        vaultPath: projectPath,
        obsidianNotes: [
          `${options.projectName} - Project Overview`,
          `${options.projectName} - Progress Tracker`,
          `${options.projectName} - Findings Summary`
        ],
        stateKeys: [
          `research_project_${options.projectName}`,
          `${options.projectName}_progress`,
          `${options.projectName}_findings`
        ]
      }
    };
  }
  
  private generateBrainInstructions(options: ResearchProjectOptions, structure: ResearchProjectStructure): BrainToolInstruction[] {
    const instructions: BrainToolInstruction[] = [];
    
    // Create directories
    structure.directories.forEach(dir => {
      instructions.push({
        tool: 'filesystem:create_directory',
        args: { path: `${structure.baseDirectory}/${dir}` },
        description: `Create directory: ${dir}`
      });
    });
    
    // Create files from templates
    structure.files.forEach(file => {
      const content = this.generateFileContent(file.template, options);
      instructions.push({
        tool: 'filesystem:write_file',
        args: {
          path: `${structure.baseDirectory}/${file.path}`,
          content
        },
        description: `Create ${file.purpose}`
      });
    });
    
    // Set up Brain state
    instructions.push({
      tool: 'brain:state_set',
      args: {
        category: 'project',
        key: `research_${options.projectName}`,
        value: {
          projectName: options.projectName,
          projectType: 'research',
          researchType: options.researchType,
          status: 'active',
          created: new Date().toISOString(),
          methodology: options.methodology,
          timeframe: options.timeframe,
          phases: options.phases,
          deliverables: options.deliverables,
          location: structure.baseDirectory
        }
      },
      description: `Set Brain state for research project`
    });
    
    // Create Obsidian notes
    structure.brainIntegration.obsidianNotes.forEach(noteTitle => {
      instructions.push({
        tool: 'brain:obsidian_note',
        args: {
          action: 'create',
          title: noteTitle,
          content: this.generateObsidianNoteContent(noteTitle, options),
          folder: `projects/${options.projectName}`
        },
        description: `Create Obsidian note: ${noteTitle}`
      });
    });
    
    return instructions;
  }
  
  private generateFileContent(template: string, options: ResearchProjectOptions): string {
    const timestamp = new Date().toISOString().split('T')[0];
    
    switch (template) {
      case 'research-overview':
        return `# ${options.projectName} - Project Overview

**Project Type**: ${options.researchType}
**Created**: ${timestamp}
**Timeframe**: ${options.timeframe || 'TBD'}
**Status**: Active

## Objectives

${options.description}

## Research Type
${options.researchType}

## Methodology
${options.methodology || 'To be defined'}

## Timeline
${options.timeframe || 'To be planned'}

## Phases
${options.phases?.map(phase => `- [ ] ${phase}`).join('\\n') || '- [ ] To be defined'}

## Deliverables
${options.deliverables?.map(deliverable => `- [ ] ${deliverable}`).join('\\n') || '- [ ] To be defined'}

## Progress Tracking
- **Current Phase**: ${options.phases?.[0] || 'Planning'}
- **Completion**: 0%
- **Next Session**: Initial planning

## Related Resources
- [Methodology Documentation](methodology/01-research-methodology.md)
- [Investigation Plan](methodology/02-investigation-plan.md)
- [Session Tracker](findings/session-tracking.md)
- [Progress Tracker](reports/progress-tracker.md)

---
*This document is updated automatically during research sessions*
`;

      case 'session-tracker':
        return `# Session Tracking - ${options.projectName}

**Last Updated**: ${timestamp}
**Total Sessions**: 0
**Current Phase**: ${options.phases?.[0] || 'Planning'}

## Session Log

### Session Template
\`\`\`markdown
## Session [NUMBER] - [DATE]
**Phase**: [Current Phase]
**Duration**: [Time spent]
**Objectives**: 
- [ ] Objective 1
- [ ] Objective 2

**Activities**:
- Activity 1
- Activity 2

**Findings**:
- Finding 1 ([Evidence Link])
- Finding 2 ([Evidence Link])

**Next Session**:
- [ ] Action 1
- [ ] Action 2

**Notes**:
- Any additional observations
\`\`\`

---

## Session Summary

| Session | Date | Phase | Objectives Met | Key Findings | Status |
|---------|------|-------|----------------|--------------|--------|
| 1 | | | | | |

## Cross-Session Continuity

### Active Context
- Current investigation focus: 
- Outstanding questions:
- Next priority actions:

### Knowledge Accumulation
- Key insights discovered:
- Patterns identified:
- Validation needed:

---
*Updated automatically each session*
`;

      default:
        return `# ${template} - ${options.projectName}

**Created**: ${timestamp}
**Type**: ${template}

## Content

This is a template file for ${template}.

Add your content here.

---
*Template created automatically*
`;
    }
  }
  
  private generateObsidianNoteContent(noteTitle: string, options: ResearchProjectOptions): string {
    const timestamp = new Date().toISOString().split('T')[0];
    
    return `# ${noteTitle}

**Project**: ${options.projectName}
**Created**: ${timestamp}

[Note content will be populated during research]

#research #${options.projectName.replace(/[^a-zA-Z0-9]/g, '')}
`;
  }
  
  private generateNextSteps(options: ResearchProjectOptions): string[] {
    return [
      `Review project structure at: ${this.defaultLocation}/${options.projectName}`,
      'Update methodology document with specific research methods',
      'Define detailed investigation plan and phase breakdown',
      'Set up first investigation session using session template',
      'Configure Brain state tracking for cross-session continuity',
      'Begin Phase 1 investigation activities'
    ];
  }
}

export async function createResearchProject(options: ResearchProjectOptions): Promise<ResearchProjectResult> {
  const creator = new ResearchProjectCreator();
  return creator.createResearchProject(options);
}
