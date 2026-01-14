/**
 * Multi-Project Manager
 * Provides instructions for managing foreground, background, and recent projects
 */

export interface ProjectState {
  project: string;
  since: string;
  context: string;
}

export interface BackgroundProject {
  project: string;
  status: 'processing' | 'monitoring' | 'waiting' | 'scheduled';
  since: string;
  lastUpdate?: string;
  note?: string;
  metrics?: any;
}

export interface RecentProject {
  project: string;
  lastActive: string;
  exitContext: string;
  exitStatus: 'switched' | 'paused' | 'completed' | 'checked';
}

export interface MultiProjectState {
  version: string;
  updated: string;
  foreground: ProjectState | null;
  background: BackgroundProject[];
  recent: RecentProject[];
}

export interface ProjectActivityState {
  status: 'active' | 'background' | 'paused' | 'archived';
  lastActive: string;
  context?: any;
  priority: 'high' | 'normal' | 'low' | 'monitoring';
}

export class MultiProjectManager {
  /**
   * Get instructions for checking project status
   */
  async getProjectStatus(verbose: boolean = false): Promise<string> {
    return `To get project status, I need to:
1. Read the multi-project state: brain:state_get('system', 'active_projects_state')
2. Parse and display the current status

The status will show:
- (target) Foreground project (currently active)
- (stats) Background projects (ongoing tasks)
- 🕐 Recent projects (quick resume)
${verbose ? '\nWith verbose mode, I\'ll include detailed context and notes.' : ''}`;
  }

  /**
   * Get instructions for switching projects
   */
  async switchProject(
    projectName: string, 
    mode: 'foreground' | 'background' | 'check' = 'foreground'
  ): Promise<any> {
    const instructions = [];
    
    switch (mode) {
      case 'foreground':
        instructions.push(
          `1. Get current state: brain:state_get('system', 'active_projects_state')`,
          `2. Move current foreground to recent`,
          `3. Set ${projectName} as new foreground`,
          `4. Remove ${projectName} from background if present`,
          `5. Update state: brain:state_set('system', 'active_projects_state', updatedState)`,
          `6. Update project activity: brain:state_set('project', '${projectName}/activity_state', {status: 'active'})`
        );
        break;
      
      case 'background':
        instructions.push(
          `1. Get current state: brain:state_get('system', 'active_projects_state')`,
          `2. Add ${projectName} to background with status 'monitoring'`,
          `3. Update state: brain:state_set('system', 'active_projects_state', updatedState)`,
          `4. Update project activity: brain:state_set('project', '${projectName}/activity_state', {status: 'background'})`
        );
        break;
      
      case 'check':
        instructions.push(
          `1. Get current state: brain:state_get('system', 'active_projects_state')`,
          `2. Add ${projectName} to recent with status 'checked'`,
          `3. Update state: brain:state_set('system', 'active_projects_state', updatedState)`
        );
        break;
    }

    return {
      success: true,
      mode,
      project: projectName,
      instructions: instructions.join('\n'),
      message: `Instructions for switching ${projectName} to ${mode} mode`
    };
  }

  /**
   * Get instructions for updating a background project
   */
  async updateBackground(
    projectName: string, 
    update: { status?: string; note?: string; metrics?: any }
  ): Promise<any> {
    return {
      success: true,
      project: projectName,
      instructions: [
        `1. Get current state: brain:state_get('system', 'active_projects_state')`,
        `2. Find ${projectName} in background array`,
        `3. Update with: ${JSON.stringify(update)}`,
        `4. Set lastUpdate to current timestamp`,
        `5. Save state: brain:state_set('system', 'active_projects_state', updatedState)`
      ].join('\n')
    };
  }

  /**
   * Get instructions for listing all active projects
   */
  async listActiveProjects(includeArchived: boolean = false): Promise<string> {
    return `To list all active projects:
1. Get state: brain:state_get('system', 'active_projects_state')
2. Format and display:
   - Foreground project with active time
   - Background projects with status and notes
   - Recent projects with last active time
${includeArchived ? '3. Also check for archived projects in project states' : ''}`;
  }

  /**
   * Get instructions for promoting to foreground
   */
  async promoteToForeground(projectName: string): Promise<any> {
    return {
      success: true,
      project: projectName,
      instructions: [
        `1. Get current state: brain:state_get('system', 'active_projects_state')`,
        `2. Check if ${projectName} is in background or recent`,
        `3. If found, remove from current location`,
        `4. Follow foreground switch procedure`,
        `5. Update both state and project activity`
      ].join('\n'),
      message: `Instructions for promoting ${projectName} to foreground`
    };
  }

  /**
   * Get instructions for demoting to background
   */
  async demoteToBackground(
    status: 'processing' | 'monitoring' | 'waiting' | 'scheduled' = 'monitoring'
  ): Promise<any> {
    return {
      success: true,
      status,
      instructions: [
        `1. Get current state: brain:state_get('system', 'active_projects_state')`,
        `2. Check if there's a foreground project`,
        `3. Move foreground to background with status: ${status}`,
        `4. Clear foreground`,
        `5. Update state and project activity`
      ].join('\n'),
      message: `Instructions for demoting current project to background`
    };
  }

  /**
   * Helper: Get time since a timestamp
   */
  getTimeSince(timestamp: string): string {
    const now = new Date();
    const then = new Date(timestamp);
    const diff = now.getTime() - then.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  }

  /**
   * Helper: Create default state structure
   */
  createDefaultState(): MultiProjectState {
    return {
      version: "1.0.0",
      updated: new Date().toISOString(),
      foreground: null,
      background: [],
      recent: []
    };
  }
}
