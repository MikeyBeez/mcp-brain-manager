/**
 * LIFO Reminder Queue for Brain Manager
 * Integrated reminder functionality - most recent reminders first
 */

import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

export interface Reminder {
  id: string;
  content: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  created: string;
  completed?: string;
  status: 'active' | 'completed' | 'archived';
  context?: {
    project?: string;
    mode?: string;
    tags?: string[];
  };
}

export class ReminderQueue {
  private remindersPath: string;
  private reminders: Map<string, Reminder> = new Map();
  private maxActiveReminders = 100; // Prevent unbounded growth
  
  constructor() {
    // Store in brain state directory
    this.remindersPath = path.join(homedir(), '.brain', 'reminders.json');
    this.ensureDirectoryExists();
    this.loadReminders();
  }

  private ensureDirectoryExists(): void {
    const dir = path.dirname(this.remindersPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadReminders(): void {
    try {
      if (fs.existsSync(this.remindersPath)) {
        const data = fs.readFileSync(this.remindersPath, 'utf-8');
        const parsed = JSON.parse(data);
        this.reminders = new Map(Object.entries(parsed));
      }
    } catch (e) {
      console.error('Error loading reminders:', e);
      this.reminders = new Map();
    }
  }

  private saveReminders(): void {
    try {
      const obj = Object.fromEntries(this.reminders);
      fs.writeFileSync(this.remindersPath, JSON.stringify(obj, null, 2));
    } catch (e) {
      console.error('Error saving reminders:', e);
    }
  }

  /**
   * Add a reminder (push to stack)
   */
  push(content: string, priority: 'critical' | 'high' | 'normal' | 'low' = 'normal', context?: any): string {
    const id = `rem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const reminder: Reminder = {
      id,
      content,
      priority,
      created: new Date().toISOString(),
      status: 'active',
      context
    };
    
    this.reminders.set(id, reminder);
    
    // Enforce max limit by archiving oldest active reminders
    this.enforceLimit();
    
    this.saveReminders();
    return id;
  }

  /**
   * Get reminders in LIFO order (most recent first)
   */
  peek(filter?: { 
    priority?: string; 
    project?: string; 
    limit?: number;
    includeArchived?: boolean 
  }): Reminder[] {
    let reminders = Array.from(this.reminders.values());
    
    // Filter by status
    if (!filter?.includeArchived) {
      reminders = reminders.filter(r => r.status === 'active');
    }
    
    // Filter by priority
    if (filter?.priority && filter.priority !== 'all') {
      reminders = reminders.filter(r => r.priority === filter.priority);
    }
    
    // Filter by project
    if (filter?.project) {
      reminders = reminders.filter(r => r.context?.project === filter.project);
    }
    
    // Sort LIFO: newest first
    reminders.sort((a, b) => {
      return new Date(b.created).getTime() - new Date(a.created).getTime();
    });
    
    // Apply limit
    if (filter?.limit) {
      reminders = reminders.slice(0, filter.limit);
    }
    
    return reminders;
  }

  /**
   * Get critical reminders that should be shown on startup
   */
  getStartupReminders(): Reminder[] {
    return this.peek({ priority: 'critical', limit: 5 });
  }

  /**
   * Pop a reminder (mark as completed and optionally remove)
   */
  pop(id: string, archive: boolean = true): Reminder | null {
    const reminder = this.reminders.get(id);
    if (!reminder || reminder.status !== 'active') return null;
    
    if (archive) {
      reminder.status = 'completed';
      reminder.completed = new Date().toISOString();
    } else {
      this.reminders.delete(id);
    }
    
    this.saveReminders();
    return reminder;
  }

  /**
   * Archive a reminder (keep for history but mark inactive)
   */
  archive(id: string): boolean {
    const reminder = this.reminders.get(id);
    if (!reminder || reminder.status !== 'active') return false;
    
    reminder.status = 'archived';
    reminder.completed = new Date().toISOString();
    this.saveReminders();
    return true;
  }

  /**
   * Move reminder to Obsidian notes
   */
  moveToNotes(id: string, additionalNote?: string): { success: boolean; message: string } {
    const reminder = this.reminders.get(id);
    if (!reminder) {
      return { success: false, message: 'Reminder not found' };
    }
    
    const noteContent = `# Reminder: ${reminder.content}

Created: ${reminder.created}
Priority: ${reminder.priority}
${reminder.context?.project ? `Project: ${reminder.context.project}` : ''}
${additionalNote ? `\nNote: ${additionalNote}` : ''}

Archived on: ${new Date().toISOString()}
`;
    
    try {
      const obsidianPath = path.join(homedir(), 'Documents/Obsidian/Brain/Reminders');
      if (!fs.existsSync(obsidianPath)) {
        fs.mkdirSync(obsidianPath, { recursive: true });
      }
      
      const filename = `reminder_${new Date().toISOString().split('T')[0]}_${id}.md`;
      fs.writeFileSync(path.join(obsidianPath, filename), noteContent);
      
      // Archive the reminder
      this.archive(id);
      
      return { success: true, message: `Moved to notes: ${filename}` };
    } catch (e) {
      return { success: false, message: `Error moving to notes: ${e}` };
    }
  }

  /**
   * Clean up old archived reminders
   */
  cleanup(daysToKeep: number = 30): number {
    const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    let count = 0;
    
    for (const [id, reminder] of this.reminders) {
      if (reminder.status === 'archived' && 
          new Date(reminder.completed || reminder.created).getTime() < cutoff) {
        this.reminders.delete(id);
        count++;
      }
    }
    
    if (count > 0) this.saveReminders();
    return count;
  }

  /**
   * Enforce maximum active reminders limit
   */
  private enforceLimit(): void {
    const activeReminders = Array.from(this.reminders.values())
      .filter(r => r.status === 'active')
      .sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());
    
    // Archive oldest reminders if we exceed limit
    if (activeReminders.length > this.maxActiveReminders) {
      const toArchive = activeReminders.slice(0, activeReminders.length - this.maxActiveReminders);
      for (const reminder of toArchive) {
        reminder.status = 'archived';
        reminder.completed = new Date().toISOString();
      }
    }
  }

  /**
   * Get statistics about reminders
   */
  getStats(): {
    total: number;
    active: number;
    completed: number;
    archived: number;
    byPriority: Record<string, number>;
    byProject: Record<string, number>;
  } {
    const stats = {
      total: this.reminders.size,
      active: 0,
      completed: 0,
      archived: 0,
      byPriority: { critical: 0, high: 0, normal: 0, low: 0 },
      byProject: {} as Record<string, number>
    };
    
    for (const reminder of this.reminders.values()) {
      if (reminder.status === 'active') stats.active++;
      else if (reminder.status === 'completed') stats.completed++;
      else if (reminder.status === 'archived') stats.archived++;
      
      if (reminder.status === 'active') {
        stats.byPriority[reminder.priority]++;
        if (reminder.context?.project) {
          stats.byProject[reminder.context.project] = 
            (stats.byProject[reminder.context.project] || 0) + 1;
        }
      }
    }
    
    return stats;
  }
}
