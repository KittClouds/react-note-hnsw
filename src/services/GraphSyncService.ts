
import { Graph, Node, Edge } from './GraphInterface';
import { Note, Nest } from '@/types/note';

export interface SyncValidationResult {
  isValid: boolean;
  mismatches: string[];
  localStorage: {
    noteCount: number;
    nestCount: number;
  };
  graph: {
    noteCount: number;
    nestCount: number;
    nodeCount: number;
    edgeCount: number;
  };
}

export class GraphSyncService {
  private graph: Graph;
  private isEnabled: boolean = true;
  private lastSyncTimestamp: number = 0;
  private syncDebounceTimeout: NodeJS.Timeout | null = null;

  constructor(graph: Graph) {
    this.graph = graph;
    this.setupStorageListener();
    console.log('GraphSyncService initialized');
  }

  /**
   * Enable or disable the sync service
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`GraphSyncService ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Setup localStorage change listener
   */
  private setupStorageListener(): void {
    // Listen for storage events (changes from other tabs)
    window.addEventListener('storage', (e) => {
      if (e.key === 'notes' || e.key === 'nests') {
        this.debouncedSync();
      }
    });

    // Override localStorage.setItem to catch same-tab changes
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = (key: string, value: string) => {
      const result = originalSetItem.call(localStorage, key, value);
      if ((key === 'notes' || key === 'nests') && this.isEnabled) {
        this.debouncedSync();
      }
      return result;
    };
  }

  /**
   * Debounced sync to avoid excessive syncing
   */
  private debouncedSync(): void {
    if (this.syncDebounceTimeout) {
      clearTimeout(this.syncDebounceTimeout);
    }
    
    this.syncDebounceTimeout = setTimeout(() => {
      this.performSync();
    }, 500); // 500ms debounce
  }

  /**
   * Perform the actual sync from localStorage to Graph
   */
  public async performSync(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      console.log('Starting localStorage → Graph sync...');
      const startTime = Date.now();

      // Get data from localStorage
      const notes = this.getNotesFromStorage();
      const nests = this.getNestsFromStorage();

      // Clear existing graph data
      this.clearGraphData();

      // Sync nests first (they might be parents)
      await this.syncNests(nests);

      // Sync notes
      await this.syncNotes(notes);

      // Create hierarchy edges
      this.createHierarchyEdges(notes);

      this.lastSyncTimestamp = Date.now();
      console.log(`Sync completed in ${Date.now() - startTime}ms`);

      // Validate sync
      const validation = this.validateSync();
      if (!validation.isValid) {
        console.warn('Sync validation failed:', validation.mismatches);
      } else {
        console.log('Sync validation passed');
      }

    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  /**
   * Get notes from localStorage
   */
  private getNotesFromStorage(): Note[] {
    try {
      const savedNotes = localStorage.getItem('notes');
      if (!savedNotes) return [];
      
      return JSON.parse(savedNotes).map((note: any) => ({
        ...note,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt)
      }));
    } catch (error) {
      console.error('Error reading notes from localStorage:', error);
      return [];
    }
  }

  /**
   * Get nests from localStorage
   */
  private getNestsFromStorage(): Nest[] {
    try {
      const savedNests = localStorage.getItem('nests');
      if (!savedNests) return [];
      
      return JSON.parse(savedNests).map((nest: any) => ({
        ...nest,
        createdAt: new Date(nest.createdAt),
        updatedAt: new Date(nest.updatedAt)
      }));
    } catch (error) {
      console.error('Error reading nests from localStorage:', error);
      return [];
    }
  }

  /**
   * Clear existing graph data
   */
  private clearGraphData(): void {
    // Get all node IDs and remove them
    const allNodes = this.graph.findNodes({});
    allNodes.forEach(node => {
      try {
        this.graph.destroyNode(node.id, true); // Recursive destroy
      } catch (error) {
        // Node might already be destroyed
      }
    });
  }

  /**
   * Sync nests to graph
   */
  private async syncNests(nests: Nest[]): Promise<void> {
    for (const nest of nests) {
      try {
        this.graph.addNode('nest', {
          id: nest.id,
          name: nest.name,
          description: nest.description,
          createdAt: nest.createdAt.toISOString(),
          updatedAt: nest.updatedAt.toISOString()
        }, null, nest.id);
      } catch (error) {
        console.error(`Error syncing nest ${nest.id}:`, error);
      }
    }
  }

  /**
   * Sync notes to graph
   */
  private async syncNotes(notes: Note[]): Promise<void> {
    for (const note of notes) {
      try {
        // Determine parent ID (either parentId or nestId)
        let parentId: string | null = null;
        
        if (note.nestId) {
          // If note belongs to a nest, the nest is the parent
          parentId = note.nestId;
        } else if (note.parentId) {
          // If note has a parent note/folder
          parentId = note.parentId;
        }

        this.graph.addNode(note.type === 'folder' ? 'folder' : 'note', {
          id: note.id,
          title: note.title,
          content: note.content,
          type: note.type,
          parentId: note.parentId,
          nestId: note.nestId,
          isExpanded: note.isExpanded || false,
          createdAt: note.createdAt.toISOString(),
          updatedAt: note.updatedAt.toISOString()
        }, parentId, note.id);
      } catch (error) {
        console.error(`Error syncing note ${note.id}:`, error);
      }
    }
  }

  /**
   * Create hierarchy edges for proper parent-child relationships
   */
  private createHierarchyEdges(notes: Note[]): void {
    for (const note of notes) {
      try {
        if (note.parentId && note.parentId !== note.nestId) {
          // Only create edge if parent is not already handled by nest relationship
          this.graph.addEdge('hierarchy', note.parentId, note.id);
        }
      } catch (error) {
        // Edge might already exist or nodes might not exist
        console.debug(`Could not create hierarchy edge for note ${note.id}:`, error);
      }
    }
  }

  /**
   * Validate that localStorage and graph are in sync
   */
  public validateSync(): SyncValidationResult {
    const notes = this.getNotesFromStorage();
    const nests = this.getNestsFromStorage();
    
    const graphNodes = this.graph.findNodes({});
    const graphNotes = graphNodes.filter(node => node.type === 'note' || node.type === 'folder');
    const graphNests = graphNodes.filter(node => node.type === 'nest');
    
    const mismatches: string[] = [];
    
    // Check counts
    if (notes.length !== graphNotes.length) {
      mismatches.push(`Note count mismatch: localStorage=${notes.length}, graph=${graphNotes.length}`);
    }
    
    if (nests.length !== graphNests.length) {
      mismatches.push(`Nest count mismatch: localStorage=${nests.length}, graph=${graphNests.length}`);
    }
    
    // Check individual notes exist
    for (const note of notes) {
      const graphNode = graphNodes.find(node => node.id === note.id);
      if (!graphNode) {
        mismatches.push(`Note ${note.id} missing from graph`);
      }
    }
    
    // Check individual nests exist
    for (const nest of nests) {
      const graphNode = graphNodes.find(node => node.id === nest.id);
      if (!graphNode) {
        mismatches.push(`Nest ${nest.id} missing from graph`);
      }
    }

    return {
      isValid: mismatches.length === 0,
      mismatches,
      localStorage: {
        noteCount: notes.length,
        nestCount: nests.length
      },
      graph: {
        noteCount: graphNotes.length,
        nestCount: graphNests.length,
        nodeCount: graphNodes.length,
        edgeCount: this.graph.findNodes({}).length // This is a simplified edge count
      }
    };
  }

  /**
   * Get sync status information
   */
  public getSyncStatus() {
    return {
      isEnabled: this.isEnabled,
      lastSyncTimestamp: this.lastSyncTimestamp,
      lastSyncTime: this.lastSyncTimestamp ? new Date(this.lastSyncTimestamp).toISOString() : 'Never'
    };
  }

  /**
   * Force a sync operation
   */
  public forcSync(): void {
    console.log('Force sync requested');
    this.performSync();
  }
}
