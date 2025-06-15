import { Graph, Node, Edge } from './GraphInterface';
import { Note, Nest } from '@/types/note';
import { parseAllNotes, Entity } from '../utils/parsingUtils';

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

export interface ConflictResolution {
  strategy: 'localStorage' | 'graph' | 'merge' | 'manual';
  autoResolve: boolean;
}

export interface GraphSyncOptions {
  enableBidirectionalSync: boolean;
  conflictResolution: ConflictResolution;
  syncDirection: 'localStorage-to-graph' | 'graph-to-localStorage' | 'bidirectional';
}

export class GraphSyncService {
  private graph: Graph;
  private isEnabled: boolean = true;
  private lastSyncTimestamp: number = 0;
  private syncDebounceTimeout: NodeJS.Timeout | null = null;
  private options: GraphSyncOptions;

  constructor(graph: Graph, options: Partial<GraphSyncOptions> = {}) {
    this.graph = graph;
    this.options = {
      enableBidirectionalSync: false,
      conflictResolution: {
        strategy: 'localStorage',
        autoResolve: true
      },
      syncDirection: 'localStorage-to-graph',
      ...options
    };
    this.setupStorageListener();
    console.log('GraphSyncService initialized with options:', this.options);
  }

  /**
   * Update sync options
   */
  public updateOptions(newOptions: Partial<GraphSyncOptions>): void {
    this.options = { ...this.options, ...newOptions };
    console.log('GraphSyncService options updated:', this.options);
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
   * Perform the actual sync based on sync direction
   */
  public async performSync(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      console.log('Starting sync with direction:', this.options.syncDirection);
      const startTime = Date.now();

      switch (this.options.syncDirection) {
        case 'localStorage-to-graph':
          await this.syncLocalStorageToGraph();
          break;
        case 'graph-to-localStorage':
          await this.syncGraphToLocalStorage();
          break;
        case 'bidirectional':
          if (this.options.enableBidirectionalSync) {
            await this.performBidirectionalSync();
          } else {
            await this.syncLocalStorageToGraph();
          }
          break;
      }

      this.lastSyncTimestamp = Date.now();
      console.log(`Sync completed in ${Date.now() - startTime}ms`);

    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  /**
   * Perform bidirectional sync with conflict resolution
   */
  private async performBidirectionalSync(): Promise<void> {
    const conflicts = await this.detectConflicts();
    
    if (conflicts.length > 0) {
      console.log('Conflicts detected:', conflicts);
      await this.resolveConflicts(conflicts);
    }

    // If no conflicts or conflicts resolved, sync both ways
    await this.syncLocalStorageToGraph();
    
    // Only sync back to localStorage if explicitly enabled
    if (this.options.enableBidirectionalSync) {
      await this.syncGraphToLocalStorage();
    }
  }

  /**
   * Detect conflicts between localStorage and graph
   */
  private async detectConflicts(): Promise<Array<{ type: 'note' | 'nest', id: string, issue: string }>> {
    const conflicts: Array<{ type: 'note' | 'nest', id: string, issue: string }> = [];
    
    const notes = this.getNotesFromStorage();
    const nests = this.getNestsFromStorage();
    const graphNodes = this.graph.findNodes({});

    // Check for timestamp conflicts
    for (const note of notes) {
      const graphNode = graphNodes.find(node => node.id === note.id);
      if (graphNode && graphNode.props?.updatedAt) {
        const graphTime = new Date(graphNode.props.updatedAt).getTime();
        const localTime = note.updatedAt.getTime();
        
        if (Math.abs(graphTime - localTime) > 1000) { // More than 1 second difference
          conflicts.push({
            type: 'note',
            id: note.id,
            issue: `Timestamp mismatch: localStorage=${localTime}, graph=${graphTime}`
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Resolve conflicts based on strategy
   */
  private async resolveConflicts(conflicts: Array<{ type: 'note' | 'nest', id: string, issue: string }>): Promise<void> {
    for (const conflict of conflicts) {
      switch (this.options.conflictResolution.strategy) {
        case 'localStorage':
          console.log(`Resolving conflict ${conflict.id} in favor of localStorage`);
          // Keep localStorage version, update graph
          break;
        case 'graph':
          console.log(`Resolving conflict ${conflict.id} in favor of graph`);
          // Keep graph version, update localStorage
          break;
        case 'merge':
          console.log(`Attempting to merge conflict ${conflict.id}`);
          // Implement merge strategy (for now, default to localStorage)
          break;
        case 'manual':
          console.warn(`Manual resolution required for conflict ${conflict.id}`);
          // Store conflict for manual resolution
          break;
      }
    }
  }

  /**
   * Sync from localStorage to Graph (existing functionality)
   */
  private async syncLocalStorageToGraph(): Promise<void> {
    console.log('Syncing localStorage → Graph...');
    
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

    // Sync entities and relationships from note content
    await this.syncEntitiesAndRelationships(notes);

    // Validate sync
    const validation = this.validateSync();
    if (!validation.isValid) {
      console.warn('Sync validation failed:', validation.mismatches);
    } else {
      console.log('localStorage → Graph sync validation passed');
    }
  }

  /**
   * Sync from Graph to localStorage
   */
  private async syncGraphToLocalStorage(): Promise<void> {
    if (!this.options.enableBidirectionalSync) {
      console.log('Bidirectional sync disabled, skipping Graph → localStorage sync');
      return;
    }

    console.log('Syncing Graph → localStorage...');
    
    const graphNodes = this.graph.findNodes({});
    const graphNoteNodes = graphNodes.filter(node => 
      node.type === 'note' || node.type === 'folder'
    );
    const graphNestNodes = graphNodes.filter(node => node.type === 'nest');

    // Convert graph nodes back to Note/Nest format
    const notes: Note[] = graphNoteNodes.map(node => ({
      id: node.id,
      title: node.props?.title || 'Untitled',
      content: node.props?.content || '',
      type: (node.props?.type === 'folder' ? 'folder' : 'note') as 'note' | 'folder',
      parentId: node.props?.parentId || null,
      nestId: node.props?.nestId || null,
      isExpanded: node.props?.isExpanded || false,
      createdAt: new Date(node.props?.createdAt || Date.now()),
      updatedAt: new Date(node.props?.updatedAt || Date.now())
    }));

    const nests: Nest[] = graphNestNodes.map(node => ({
      id: node.id,
      name: node.props?.name || 'Untitled Nest',
      description: node.props?.description || '',
      createdAt: new Date(node.props?.createdAt || Date.now()),
      updatedAt: new Date(node.props?.updatedAt || Date.now())
    }));

    // Update localStorage
    localStorage.setItem('notes', JSON.stringify(notes));
    localStorage.setItem('nests', JSON.stringify(nests));

    console.log('Graph → localStorage sync completed');
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
   * Sync entities and relationships from note content to the graph
   */
  private async syncEntitiesAndRelationships(notes: Note[]): Promise<void> {
    console.log('Syncing entities and relationships from note content...');
    const { entitiesMap, tagsMap, mentionsMap, linksMap, triplesMap } = parseAllNotes(notes);

    const allEntities = new Map<string, Entity>();
    
    const addEntity = (entity: Entity) => {
        const entityId = `entity-${entity.kind}-${entity.label}`;
        if (!allEntities.has(entityId)) {
            allEntities.set(entityId, entity);
        }
    };

    // Collect all unique entities from explicit definitions, tags, and mentions
    entitiesMap.forEach(noteEntities => noteEntities.forEach(addEntity));
    tagsMap.forEach(noteTags => noteTags.forEach(tag => addEntity({ kind: 'CONCEPT', label: tag })));
    mentionsMap.forEach(noteMentions => noteMentions.forEach(mention => addEntity({ kind: 'MENTION', label: mention })));

    // Add all unique entity nodes to the graph
    for (const [entityId, entity] of allEntities.entries()) {
        try {
            this.graph.addNode('entity', {
                id: entityId,
                ...entity
            }, null, entityId);
        } catch (error) {
            // Ignore if node already exists, which can happen with concurrent adds
            if (!(error instanceof Error && error.message.includes('already exists'))) {
                console.warn(`Could not add entity node ${entityId}:`, error);
            }
        }
    }

    // Create relationship edges
    const noteTitleToIdMap = new Map(notes.map(n => [n.title, n.id]));

    // 1. Note -> Contained Entity
    entitiesMap.forEach((noteEntities, noteId) => {
        noteEntities.forEach(entity => {
            const entityId = `entity-${entity.kind}-${entity.label}`;
            try { this.graph.addEdge('contains', noteId, entityId); } catch (e) { /* ignore */ }
        });
    });
    
    // 2. Note -> Tag Entity
    tagsMap.forEach((noteTags, noteId) => {
        noteTags.forEach(tag => {
            const entityId = `entity-CONCEPT-${tag}`;
            try { this.graph.addEdge('hasTag', noteId, entityId); } catch (e) { /* ignore */ }
        });
    });
    
    // 3. Note -> Mention Entity
    mentionsMap.forEach((noteMentions, noteId) => {
        noteMentions.forEach(mention => {
            const entityId = `entity-MENTION-${mention}`;
            try { this.graph.addEdge('mentions', noteId, entityId); } catch (e) { /* ignore */ }
        });
    });

    // 4. Note -> Linked Note
    linksMap.forEach((linkTitles, sourceNoteId) => {
        linkTitles.forEach(title => {
            const targetNoteId = noteTitleToIdMap.get(title);
            if (targetNoteId && targetNoteId !== sourceNoteId) {
                try { this.graph.addEdge('linksTo', sourceNoteId, targetNoteId); } catch (e) { /* ignore */ }
            }
        });
    });
    
    // 5. Subject Entity -> Object Entity (from Triples)
    triplesMap.forEach((noteTriples, noteId) => {
        noteTriples.forEach(triple => {
            const subjectId = `entity-${triple.subject.kind}-${triple.subject.label}`;
            const objectId = `entity-${triple.object.kind}-${triple.object.label}`;
            try {
                this.graph.addEdge(triple.predicate, subjectId, objectId, { sourceNoteId: noteId });
            } catch (e) { /* ignore */ }
        });
    });

    console.log(`Processed ${allEntities.size} unique entities and their relationships.`);
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
      lastSyncTime: this.lastSyncTimestamp ? new Date(this.lastSyncTimestamp).toISOString() : 'Never',
      options: this.options
    };
  }

  /**
   * Force a sync operation
   */
  public forcSync(): void {
    console.log('Force sync requested');
    this.performSync();
  }

  /**
   * Enable bidirectional sync
   */
  public enableBidirectionalSync(enabled: boolean = true): void {
    this.updateOptions({ enableBidirectionalSync: enabled });
    console.log(`Bidirectional sync ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set sync direction
   */
  public setSyncDirection(direction: 'localStorage-to-graph' | 'graph-to-localStorage' | 'bidirectional'): void {
    this.updateOptions({ syncDirection: direction });
    console.log(`Sync direction set to: ${direction}`);
  }

  /**
   * Set conflict resolution strategy
   */
  public setConflictResolution(strategy: ConflictResolution): void {
    this.updateOptions({ conflictResolution: strategy });
    console.log(`Conflict resolution strategy set to:`, strategy);
  }
}
