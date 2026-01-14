/**
 * Brain Tool Client - Interface to call actual brain tools
 * This will be injected into the BrainManager
 */

export interface BrainToolClient {
  brainInit(): Promise<boolean>;
  brainRemember(key: string, value: any, type?: string): Promise<boolean>;
  brainRecall(query: string, limit?: number): Promise<any[]>;
  stateSet(category: string, key: string, value: any): Promise<boolean>;
  stateGet(category: string, key: string): Promise<any>;
  stateList(category: string, limit?: number): Promise<any[]>;
  obsidianNote(action: string, params: any): Promise<any>;
}

/**
 * Mock implementation for testing
 * In production, this will be replaced with actual tool calls
 */
export class MockBrainToolClient implements BrainToolClient {
  private mockStorage = new Map<string, any>();

  async brainInit(): Promise<boolean> {
    console.log('(brain) Mock: Initializing Brain...');
    return true;
  }

  async brainRemember(key: string, value: any, type: string = 'general'): Promise<boolean> {
    console.log(`💾 Mock: Storing ${type} memory: ${key}`);
    this.mockStorage.set(`brain:${key}`, value);
    return true;
  }

  async brainRecall(query: string, limit: number = 10): Promise<any[]> {
    console.log(`(search) Mock: Searching for: ${query}`);
    // Return empty for now
    return [];
  }

  async stateSet(category: string, key: string, value: any): Promise<boolean> {
    console.log(`(stats) Mock: Setting ${category}/${key}`);
    this.mockStorage.set(`state:${category}:${key}`, value);
    return true;
  }

  async stateGet(category: string, key: string): Promise<any> {
    console.log(`(stats) Mock: Getting ${category}/${key}`);
    return this.mockStorage.get(`state:${category}:${key}`) || null;
  }

  async stateList(category: string, limit: number = 20): Promise<any[]> {
    console.log(`(stats) Mock: Listing ${category} (limit: ${limit})`);
    const results = [];
    for (const [k, v] of this.mockStorage.entries()) {
      if (k.startsWith(`state:${category}:`)) {
        results.push({ key: k.replace(`state:${category}:`, ''), value: v });
      }
    }
    return results.slice(0, limit);
  }

  async obsidianNote(action: string, params: any): Promise<any> {
    console.log(`(note) Mock: Obsidian ${action}`, params);
    return { success: true };
  }
}
