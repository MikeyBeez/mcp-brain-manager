/**
 * System State Manager
 * 
 * Implements automated system state tracking and documentation maintenance
 * to prevent architecture documentation from becoming stale.
 * 
 * Created: 2025-08-08
 * Part of: System State Management Protocol
 */

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

interface StateUpdate {
  category: string;
  data: any;
  timestamp: string;
}

interface SystemStateData {
  projects?: ProjectStateData;
  documentation?: DocumentationStateData;
  repositories?: RepositoryStateData;
  protocols?: ProtocolStateData;
  tools?: ToolStateData;
}

interface ProjectStateData {
  action: 'created' | 'switched' | 'completed' | 'archived';
  projectName: string;
  projectType?: string;
  location?: string;
  fromProject?: string;
  toProject?: string;
  totalProjects?: number;
  timestamp: string;
}

interface DocumentationStateData {
  action: 'created' | 'modified' | 'deleted' | 'validated';
  documentPath: string;
  documentType?: string;
  size?: number;
  timestamp: string;
}

interface RepositoryStateData {
  action: 'updated' | 'committed' | 'pushed' | 'pulled';
  projectName: string;
  changes?: string[];
  commitHash?: string;
  branch?: string;
  timestamp: string;
}

interface ProtocolStateData {
  action: 'started' | 'completed' | 'failed';
  protocolId: string;
  step?: string;
  status?: string;
  timestamp: string;
}

interface ToolStateData {
  action: 'used' | 'installed' | 'configured' | 'failed';
  toolName: string;
  operation?: string;
  performance?: number;
  timestamp: string;
}

// Constants
const SYSTEM_STATE_NOTE_PATH = 'process.env.OBSIDIAN_VAULT_PATH || /Users/bard/Code/Claude_Data/vault/systems/System_State_Note.md';
const BRAIN_STATE_COMMAND = 'brain';

/**
 * Main function to update system state across all tracking systems
 */
export async function updateSystemState(category: string, data: any): Promise<void> {
  const stateUpdate: StateUpdate = {
    category,
    data: {
      ...data,
      timestamp: data.timestamp || new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  };
  
  try {
    // Update Brain state system
    await updateBrainState(category, stateUpdate);
    
    // Update System State Note file
    await updateSystemStateNote(category, stateUpdate.data);
    
    // Log successful state update
    console.log(`(ok) System state updated: ${category}`, stateUpdate.data);
    
  } catch (error) {
    console.error('(error) Failed to update system state:', error);
    // Don't throw - state updates should not break main operations
  }
}

/**
 * Update Brain state system using the brain CLI
 */
async function updateBrainState(category: string, stateUpdate: StateUpdate): Promise<void> {
  try {
    const stateKey = `last_${category}_update`;
    const stateJson = JSON.stringify(stateUpdate).replace(/'/g, "\\'");
    
    // Use brain state_set to store the update
    const command = `echo '${stateJson}' | ${BRAIN_STATE_COMMAND} state_set system "${stateKey}"`;
    execSync(command, { stdio: 'pipe' });
    
    // Also update the generic system health timestamp
    const healthUpdate = {
      lastUpdate: stateUpdate.timestamp,
      category: category,
      healthy: true
    };
    const healthJson = JSON.stringify(healthUpdate).replace(/'/g, "\\'");
    const healthCommand = `echo '${healthJson}' | ${BRAIN_STATE_COMMAND} state_set system "last_system_activity"`;
    execSync(healthCommand, { stdio: 'pipe' });
    
  } catch (error) {
    console.error('Failed to update Brain state:', error);
    throw error;
  }
}

/**
 * Update the live System State Note file
 */
async function updateSystemStateNote(category: string, data: any): Promise<void> {
  try {
    // Ensure the systems directory exists
    const systemsDir = path.dirname(SYSTEM_STATE_NOTE_PATH);
    await fs.mkdir(systemsDir, { recursive: true });
    
    // Check if System State Note exists, create if not
    let noteExists = false;
    try {
      await fs.access(SYSTEM_STATE_NOTE_PATH);
      noteExists = true;
    } catch {
      // File doesn't exist, will create
    }
    
    if (!noteExists) {
      await createSystemStateNote();
    }
    
    // Read current content
    const currentContent = await fs.readFile(SYSTEM_STATE_NOTE_PATH, 'utf-8');
    
    // Update the specific category section
    const updatedContent = updateCategorySection(currentContent, category, data);
    
    // Write back to file
    await fs.writeFile(SYSTEM_STATE_NOTE_PATH, updatedContent);
    
  } catch (error) {
    console.error('Failed to update System State Note:', error);
    throw error;
  }
}

/**
 * Create initial System State Note if it doesn't exist
 */
async function createSystemStateNote(): Promise<void> {
  const initialContent = `# (stats) System State Note - Live Status

**Last Updated**: ${new Date().toISOString()}  
**Status**: Automated tracking active  
**Purpose**: Real-time system state for architecture maintenance

## (target) Current System Health

**Overall Status**: (ok) Operational  
**Last Activity**: ${new Date().toISOString()}  
**Monitoring**: Active  

## 📂 Project Status

**Total Projects**: Calculating...  
**Active Project**: Unknown  
**Last Project Activity**: ${new Date().toISOString()}  

### Recent Project Activity
- *No recent activity tracked*

## 📚 Documentation Status

**Architecture Documents**: Scanning...  
**Documentation Currency**: Unknown  
**Last Doc Update**: ${new Date().toISOString()}  

### Recent Documentation Activity
- *No recent activity tracked*

## (workflow) Repository Status

**Last Repository Update**: ${new Date().toISOString()}  
**Active Repositories**: Scanning...  

### Recent Repository Activity
- *No recent activity tracked*

## (launch) Protocol Status

**Active Protocols**: Scanning...  
**Last Protocol Execution**: ${new Date().toISOString()}  

### Recent Protocol Activity
- *No recent activity tracked*

## (tools) Tool Status

**MCP Tools Active**: Scanning...  
**Last Tool Usage**: ${new Date().toISOString()}  

### Recent Tool Activity
- *No recent activity tracked*

---

*This note is automatically updated by the System State Management Protocol*  
*Manual edits will be preserved in dedicated sections*  
*System State Manager: Active (ok)*`;

  await fs.writeFile(SYSTEM_STATE_NOTE_PATH, initialContent);
}

/**
 * Update a specific category section in the System State Note
 */
function updateCategorySection(content: string, category: string, data: any): string {
  const timestamp = new Date().toISOString();
  
  // Update the last updated timestamp at the top
  content = content.replace(
    /\*\*Last Updated\*\*: [^\n]+/,
    `**Last Updated**: ${timestamp}`
  );
  
  // Update last activity
  content = content.replace(
    /\*\*Last Activity\*\*: [^\n]+/,
    `**Last Activity**: ${timestamp}`
  );
  
  switch (category) {
    case 'projects':
      content = updateProjectSection(content, data);
      break;
    case 'documentation':
      content = updateDocumentationSection(content, data);
      break;
    case 'repositories':
      content = updateRepositorySection(content, data);
      break;
    case 'protocols':
      content = updateProtocolSection(content, data);
      break;
    case 'tools':
      content = updateToolSection(content, data);
      break;
  }
  
  return content;
}

/**
 * Update project section with new project activity
 */
function updateProjectSection(content: string, data: ProjectStateData): string {
  // Update last project activity
  content = content.replace(
    /\*\*Last Project Activity\*\*: [^\n]+/,
    `**Last Project Activity**: ${data.timestamp}`
  );
  
  // Update active project if switching
  if (data.action === 'switched' && data.toProject) {
    content = content.replace(
      /\*\*Active Project\*\*: [^\n]+/,
      `**Active Project**: ${data.toProject}`
    );
  }
  
  // Update total projects if available
  if (data.totalProjects) {
    content = content.replace(
      /\*\*Total Projects\*\*: [^\n]+/,
      `**Total Projects**: ${data.totalProjects}`
    );
  }
  
  // Add to recent activity
  const activityLine = `- ${data.timestamp}: ${data.action} ${data.projectName || ''} ${data.toProject ? `→ ${data.toProject}` : ''}`;
  content = content.replace(
    /### Recent Project Activity\n- \*No recent activity tracked\*/,
    `### Recent Project Activity\n${activityLine}`
  );
  
  // If there's already activity, add to the top
  if (content.includes('### Recent Project Activity') && !content.includes('*No recent activity tracked*')) {
    content = content.replace(
      /### Recent Project Activity\n/,
      `### Recent Project Activity\n${activityLine}\n`
    );
  }
  
  return content;
}

/**
 * Update documentation section with new document activity
 */
function updateDocumentationSection(content: string, data: DocumentationStateData): string {
  // Update last doc update
  content = content.replace(
    /\*\*Last Doc Update\*\*: [^\n]+/,
    `**Last Doc Update**: ${data.timestamp}`
  );
  
  // Add to recent activity
  const activityLine = `- ${data.timestamp}: ${data.action} ${path.basename(data.documentPath)}`;
  content = content.replace(
    /### Recent Documentation Activity\n- \*No recent activity tracked\*/,
    `### Recent Documentation Activity\n${activityLine}`
  );
  
  // If there's already activity, add to the top
  if (content.includes('### Recent Documentation Activity') && !content.includes('*No recent activity tracked*')) {
    content = content.replace(
      /### Recent Documentation Activity\n/,
      `### Recent Documentation Activity\n${activityLine}\n`
    );
  }
  
  return content;
}

/**
 * Update repository section with new repository activity
 */
function updateRepositorySection(content: string, data: RepositoryStateData): string {
  // Update last repository update
  content = content.replace(
    /\*\*Last Repository Update\*\*: [^\n]+/,
    `**Last Repository Update**: ${data.timestamp}`
  );
  
  // Add to recent activity
  const activityLine = `- ${data.timestamp}: ${data.action} ${data.projectName}${data.commitHash ? ` (${data.commitHash.substring(0, 8)})` : ''}`;
  content = content.replace(
    /### Recent Repository Activity\n- \*No recent activity tracked\*/,
    `### Recent Repository Activity\n${activityLine}`
  );
  
  // If there's already activity, add to the top
  if (content.includes('### Recent Repository Activity') && !content.includes('*No recent activity tracked*')) {
    content = content.replace(
      /### Recent Repository Activity\n/,
      `### Recent Repository Activity\n${activityLine}\n`
    );
  }
  
  return content;
}

/**
 * Update protocol section with new protocol activity
 */
function updateProtocolSection(content: string, data: ProtocolStateData): string {
  // Update last protocol execution
  content = content.replace(
    /\*\*Last Protocol Execution\*\*: [^\n]+/,
    `**Last Protocol Execution**: ${data.timestamp}`
  );
  
  // Add to recent activity
  const activityLine = `- ${data.timestamp}: ${data.action} ${data.protocolId}${data.step ? ` (${data.step})` : ''}`;
  content = content.replace(
    /### Recent Protocol Activity\n- \*No recent activity tracked\*/,
    `### Recent Protocol Activity\n${activityLine}`
  );
  
  // If there's already activity, add to the top
  if (content.includes('### Recent Protocol Activity') && !content.includes('*No recent activity tracked*')) {
    content = content.replace(
      /### Recent Protocol Activity\n/,
      `### Recent Protocol Activity\n${activityLine}\n`
    );
  }
  
  return content;
}

/**
 * Update tool section with new tool activity
 */
function updateToolSection(content: string, data: ToolStateData): string {
  // Update last tool usage
  content = content.replace(
    /\*\*Last Tool Usage\*\*: [^\n]+/,
    `**Last Tool Usage**: ${data.timestamp}`
  );
  
  // Add to recent activity
  const activityLine = `- ${data.timestamp}: ${data.action} ${data.toolName}${data.operation ? ` (${data.operation})` : ''}`;
  content = content.replace(
    /### Recent Tool Activity\n- \*No recent activity tracked\*/,
    `### Recent Tool Activity\n${activityLine}`
  );
  
  // If there's already activity, add to the top
  if (content.includes('### Recent Tool Activity') && !content.includes('*No recent activity tracked*')) {
    content = content.replace(
      /### Recent Tool Activity\n/,
      `### Recent Tool Activity\n${activityLine}\n`
    );
  }
  
  return content;
}

/**
 * Verify system state consistency
 */
export async function verifySystemState(): Promise<boolean> {
  try {
    // Check if System State Note exists and is writable
    await fs.access(SYSTEM_STATE_NOTE_PATH, fs.constants.W_OK);
    
    // Verify Brain state system is accessible
    execSync(`${BRAIN_STATE_COMMAND} state_list`, { stdio: 'pipe' });
    
    return true;
  } catch (error) {
    console.error('System state verification failed:', error);
    return false;
  }
}

/**
 * Get current project count for state tracking
 */
export async function getProjectCount(): Promise<number> {
  try {
    const codeDir = '/Users/bard/Code';
    const entries = await fs.readdir(codeDir, { withFileTypes: true });
    const projects = entries.filter(entry => entry.isDirectory()).length;
    return projects;
  } catch (error) {
    console.error('Failed to get project count:', error);
    return 0;
  }
}

/**
 * Check documentation currency
 */
export async function checkDocumentationCurrency(): Promise<boolean> {
  try {
    const archDir = 'process.env.OBSIDIAN_VAULT_PATH || /Users/bard/Code/Claude_Data/vault/Architecture';
    const entries = await fs.readdir(archDir);
    
    let staleDocuments = 0;
    const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
    
    for (const entry of entries) {
      if (entry.endsWith('.md')) {
        const filePath = path.join(archDir, entry);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < threeDaysAgo) {
          staleDocuments++;
        }
      }
    }
    
    // Return true if less than 10% of docs are stale
    return staleDocuments < (entries.length * 0.1);
  } catch (error) {
    console.error('Failed to check documentation currency:', error);
    return false;
  }
}

// Helper functions for specific state updates
export const StateUpdaters = {
  projectCreated: (projectName: string, projectType: string, location: string) => 
    updateSystemState('projects', {
      action: 'created',
      projectName,
      projectType,
      location,
      totalProjects: getProjectCount()
    }),
    
  projectSwitched: (fromProject: string, toProject: string) => 
    updateSystemState('projects', {
      action: 'switched',
      fromProject,
      toProject
    }),
    
  documentModified: (documentPath: string, documentType: string = 'unknown') => 
    updateSystemState('documentation', {
      action: 'modified',
      documentPath,
      documentType
    }),
    
  repositoryUpdated: (projectName: string, commitHash?: string, changes?: string[]) => 
    updateSystemState('repositories', {
      action: 'updated',
      projectName,
      commitHash,
      changes
    }),
    
  protocolExecuted: (protocolId: string, status: string) => 
    updateSystemState('protocols', {
      action: 'completed',
      protocolId,
      status
    }),
    
  toolUsed: (toolName: string, operation: string) => 
    updateSystemState('tools', {
      action: 'used',
      toolName,
      operation
    })
};
